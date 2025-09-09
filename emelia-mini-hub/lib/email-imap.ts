import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from './db';
import { classifyResponse } from './ai-classifier';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailReply {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  date: Date;
  inReplyTo?: string;
  references?: string[];
}

export class EmailIMAPMonitor {
  private config: EmailConfig;
  private client?: ImapFlow;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      this.client = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
        logger: false
      });

      await this.client.connect();
      console.log('✅ IMAP connection established');
      return true;
    } catch (error) {
      console.error('❌ IMAP connection failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.logout();
      this.client = undefined;
    }
  }

  async scanForReplies(clientId: string, sinceDate?: Date): Promise<EmailReply[]> {
    if (!this.client) {
      throw new Error('IMAP client not connected');
    }

    const replies: EmailReply[] = [];
    
    try {
      // Open INBOX
      await this.client.mailboxOpen('INBOX');
      
      // Search for emails since a specific date (default: last 24 hours)
      const searchDate = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const searchCriteria = {
        since: searchDate,
        header: {
          'in-reply-to': '*' // Only get replies (emails that have In-Reply-To header)
        }
      };

      console.log(`🔍 Searching for email replies since ${searchDate.toISOString()}`);
      
      const messages = this.client.search(searchCriteria, { uid: true });
      
      for await (const message of messages) {
        try {
          // Fetch the full message
          const fullMessage = await this.client.fetchOne(message.uid, {
            source: true,
            uid: true
          }, { uid: true });

          if (fullMessage.source) {
            // Parse the email
            const parsed = await simpleParser(fullMessage.source);
            
            // Check if it's actually a reply
            if (parsed.inReplyTo || (parsed.references && parsed.references.length > 0)) {
              const reply: EmailReply = {
                messageId: parsed.messageId || `imap-${message.uid}`,
                from: parsed.from?.text || 'unknown',
                to: parsed.to?.text || 'unknown',
                subject: parsed.subject || 'No subject',
                text: parsed.text || parsed.html || '',
                html: parsed.html,
                date: parsed.date || new Date(),
                inReplyTo: parsed.inReplyTo,
                references: parsed.references
              };

              // Only process if it contains meaningful content
              if (reply.text.trim().length > 10) {
                replies.push(reply);
                console.log(`📧 Found reply from ${reply.from}: "${reply.text.substring(0, 50)}..."`);
              }
            }
          }
        } catch (messageError) {
          console.error(`❌ Error processing message ${message.uid}:`, messageError);
        }
      }

      console.log(`✅ Found ${replies.length} email replies`);
      return replies;

    } catch (error) {
      console.error('❌ Error scanning for replies:', error);
      throw error;
    }
  }

  async processReply(clientId: string, reply: EmailReply): Promise<void> {
    try {
      // Extract email address from the 'from' field
      const fromEmailMatch = reply.from.match(/<([^>]+)>/) || reply.from.match(/([^\s<>]+@[^\s<>]+)/);
      const fromEmail = fromEmailMatch ? fromEmailMatch[1] : reply.from;

      // Try to find existing thread by prospect email
      let thread = await prisma.thread.findFirst({
        where: {
          clientId,
          prospectEmail: fromEmail
        },
        include: {
          campaign: true
        }
      });

      if (!thread) {
        // If no thread found, try to match by subject or create a generic one
        const defaultCampaign = await prisma.campaign.findFirst({
          where: { clientId },
          orderBy: { lastEventAt: 'desc' }
        });

        if (!defaultCampaign) {
          console.log(`❌ No campaign found for client ${clientId}, skipping reply`);
          return;
        }

        thread = await prisma.thread.create({
          data: {
            clientId,
            campaignId: defaultCampaign.id,
            prospectEmail: fromEmail,
            subject: reply.subject,
            firstAt: reply.date,
            lastAt: reply.date,
          },
          include: {
            campaign: true
          }
        });
      } else {
        // Update thread lastAt
        await prisma.thread.update({
          where: { id: thread.id },
          data: { lastAt: reply.date }
        });
      }

      // Check if message already exists
      const existingMessage = await prisma.message.findFirst({
        where: {
          threadId: thread.id,
          messageId: reply.messageId,
          direction: 'INBOUND'
        }
      });

      if (existingMessage) {
        console.log(`⚠️ Message already exists: ${reply.messageId}`);
        return;
      }

      // Create rich message content with EMAIL source
      const messageContent = `📧 Réponse par email de ${fromEmail}
Sujet: ${reply.subject}
Date: ${reply.date.toLocaleDateString('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

💬 Contenu de la réponse:
"${reply.text}"

📈 Informations techniques:
• Source: EMAIL_IMAP 📧
• Message ID: ${reply.messageId}
• In-Reply-To: ${reply.inReplyTo || 'N/A'}
• Campagne: ${thread.campaign.name}`;

      // Create message
      await prisma.message.create({
        data: {
          threadId: thread.id,
          direction: 'INBOUND',
          at: reply.date,
          fromAddr: fromEmail,
          toAddr: reply.to,
          text: messageContent,
          messageId: reply.messageId,
          raw: {
            source: 'EMAIL_IMAP',
            subject: reply.subject,
            inReplyTo: reply.inReplyTo,
            references: reply.references,
            html: reply.html
          },
        }
      });

      // AI Classification
      let label = 'NEUTRE';
      let confidence = 0.5;

      try {
        const classification = await classifyResponse(reply.text, reply.subject);
        label = classification.label;
        confidence = classification.confidence;
      } catch (error) {
        console.error('Classification error:', error);
      }

      // Update thread label if not already set
      if (!thread.label) {
        await prisma.thread.update({
          where: { id: thread.id },
          data: {
            label,
            confidence,
          }
        });
      }

      console.log(`✅ EMAIL REPLY PROCESSED: ${fromEmail} - ${label} (${Math.round(confidence * 100)}%)`);

    } catch (error) {
      console.error('❌ Error processing email reply:', error);
      throw error;
    }
  }

  async monitorReplies(clientId: string): Promise<void> {
    console.log(`🔄 Starting email monitoring for client ${clientId}`);
    
    const interval = setInterval(async () => {
      try {
        const replies = await this.scanForReplies(clientId);
        
        for (const reply of replies) {
          await this.processReply(clientId, reply);
        }
      } catch (error) {
        console.error('❌ Error in email monitoring cycle:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Store interval reference for cleanup
    return interval as any;
  }
}

// Example usage and setup functions
export async function setupEmailMonitoring(
  clientId: string,
  emailConfig: EmailConfig
): Promise<EmailIMAPMonitor> {
  const monitor = new EmailIMAPMonitor(emailConfig);
  
  const connected = await monitor.connect();
  if (!connected) {
    throw new Error('Failed to connect to email server');
  }
  
  // Test by scanning last 24 hours
  const testReplies = await monitor.scanForReplies(clientId);
  console.log(`✅ Email monitoring setup complete. Found ${testReplies.length} existing replies.`);
  
  return monitor;
}

// Gmail configuration example
export const GMAIL_CONFIG: EmailConfig = {
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: '', // Will be set by user
    pass: '', // Will be App Password for Gmail
  }
};

// Outlook/Hotmail configuration example  
export const OUTLOOK_CONFIG: EmailConfig = {
  host: 'outlook.office365.com',
  port: 993,
  secure: true,
  auth: {
    user: '', // Will be set by user
    pass: '', // Will be set by user
  }
};