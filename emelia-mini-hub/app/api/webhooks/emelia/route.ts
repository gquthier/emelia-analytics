import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { classifyResponse } from '@/lib/ai-classifier'

interface EmeliaWebhookPayload {
  event: string
  campaign_id: string
  contact: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    custom?: {
      organizationname?: string
      title?: string
    }
  }
  message?: {
    id: string
    subject?: string
    content?: string
    text?: string
    html?: string
    date: string
    from: string
    to: string
  }
  reply?: {
    id: string
    content: string
    text: string
    subject: string
    date: string
    from: string
    to: string
  }
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: EmeliaWebhookPayload = await request.json()
    
    console.log('🎯 EMELIA WEBHOOK RECEIVED:', JSON.stringify(payload, null, 2))
    
    // Only process reply events
    if (payload.event !== 'reply' && payload.event !== 'replied') {
      return NextResponse.json({ status: 'ignored', reason: 'not_a_reply' })
    }

    const { campaign_id, contact, reply, message, timestamp } = payload
    
    // Find the client by campaign
    const storedCampaign = await prisma.campaign.findFirst({
      where: { emeliaId: campaign_id },
      include: { client: true }
    })
    
    if (!storedCampaign) {
      console.log(`❌ Campaign ${campaign_id} not found`)
      return NextResponse.json({ status: 'error', reason: 'campaign_not_found' })
    }

    const clientId = storedCampaign.clientId
    
    // Get reply content from webhook (richer than API)
    const replyContent = reply?.content || reply?.text || message?.content || message?.text || ''
    const replySubject = reply?.subject || message?.subject || 'Réponse à la campagne'
    const replyDate = new Date(reply?.date || message?.date || timestamp)
    const fromEmail = reply?.from || message?.from || contact.email
    
    if (!replyContent) {
      console.log(`❌ No reply content in webhook for ${contact.email}`)
      return NextResponse.json({ status: 'error', reason: 'no_content' })
    }

    console.log(`🎉 WEBHOOK REPLY WITH CONTENT: "${replyContent.substring(0, 100)}..."`)

    // Find or create thread
    let thread = await prisma.thread.findFirst({
      where: {
        clientId,
        campaignId: storedCampaign.id,
        prospectEmail: contact.email
      }
    })

    const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email
    const companyInfo = contact.custom?.organizationname ? ` de ${contact.custom.organizationname}` : ''
    const titleInfo = contact.custom?.title ? ` (${contact.custom.title})` : ''

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          clientId,
          campaignId: storedCampaign.id,
          prospectEmail: contact.email,
          subject: replySubject,
          firstAt: replyDate,
          lastAt: replyDate,
        }
      })
    } else {
      await prisma.thread.update({
        where: { id: thread.id },
        data: { lastAt: replyDate }
      })
    }

    // Check if message already exists
    const existingMessage = await prisma.message.findFirst({
      where: {
        threadId: thread.id,
        messageId: reply?.id || message?.id || `webhook-${timestamp}`,
        direction: 'INBOUND'
      }
    })

    if (existingMessage) {
      console.log(`⚠️ Message already exists for ${contact.email}`)
      return NextResponse.json({ status: 'duplicate' })
    }

    // Create rich message content with WEBHOOK source
    const messageContent = `📩 Réponse de ${contactName}${companyInfo}${titleInfo}
Email: ${contact.email}
Date: ${replyDate.toLocaleDateString('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

💬 Contenu de la réponse:
"${replyContent}"

📈 Informations du contact:
• Source: EMELIA_WEBHOOK ✨
• Statut: REPLIED${companyInfo ? '\n• Entreprise: ' + contact.custom.organizationname : ''}${titleInfo ? '\n• Fonction: ' + contact.custom.title : ''}`

    // Create message
    await prisma.message.create({
      data: {
        threadId: thread.id,
        direction: 'INBOUND',
        at: replyDate,
        fromAddr: fromEmail,
        text: messageContent,
        messageId: reply?.id || message?.id || `webhook-${timestamp}`,
        raw: payload,
      }
    })

    // AI Classification of the reply content
    let label = 'NEUTRE'
    let confidence = 0.5

    try {
      const classification = await classifyResponse(replyContent, replySubject)
      label = classification.label
      confidence = classification.confidence
    } catch (error) {
      console.error('Classification error:', error)
    }

    // Update thread label
    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        label,
        confidence,
      }
    })

    console.log(`✅ WEBHOOK REPLY PROCESSED: ${contactName} (${contact.email}) - ${label} (${Math.round(confidence * 100)}%)`)
    
    return NextResponse.json({ 
      status: 'success',
      processed: {
        contact: contact.email,
        campaign: storedCampaign.name,
        label,
        confidence: Math.round(confidence * 100),
        content_length: replyContent.length
      }
    })
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'healthy',
    endpoint: 'emelia-webhook',
    timestamp: new Date().toISOString(),
    message: 'Ready to receive Emelia reply webhooks'
  })
}