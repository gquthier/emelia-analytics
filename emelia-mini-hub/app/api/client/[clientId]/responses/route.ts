import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params

    // Get client to verify it exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Get all inbound messages (responses) for this client
    const responses = await prisma.message.findMany({
      where: {
        direction: 'INBOUND',
        thread: {
          clientId: clientId
        }
      },
      include: {
        thread: {
          include: {
            campaign: true
          }
        }
      },
      orderBy: {
        at: 'desc'
      }
    })

    // Transform responses for the frontend
    const transformedResponses = responses.map(message => {
      // Extract prospect info from raw data if available
      const rawData = message.raw as any
      const contact = rawData?.contact || {}
      
      const prospectName = contact.firstName && contact.lastName 
        ? `${contact.firstName} ${contact.lastName}`
        : contact.firstName || contact.lastName || null

      const prospectCompany = contact.custom?.organizationname || null

      // Parse structured content if available
      let parsedContent = message.text
      let emeliaSender = null
      let emeliaMsgId = null
      let emeliaMsgDate = null
      
      // Check if message has structured format from Emelia webhook
      if (message.text.includes('📩 Réponse de')) {
        const lines = message.text.split('\n')
        
        // Extract clean content (remove Emelia formatting)
        const contentStart = lines.findIndex(line => line.includes('💬 Contenu de la réponse:'))
        if (contentStart !== -1) {
          const contentEnd = lines.findIndex((line, index) => 
            index > contentStart && line.includes('📧 Expéditeur:')
          )
          
          if (contentEnd !== -1) {
            // Extract the actual message content between quotes
            const contentLines = lines.slice(contentStart + 1, contentEnd)
            parsedContent = contentLines.join('\n').replace(/^"(.*)"$/, '$1').trim()
          }
        }
        
        // Extract Emelia metadata
        const senderLine = lines.find(line => line.includes('📧 Expéditeur:'))
        if (senderLine) {
          emeliaSender = senderLine.replace('📧 Expéditeur: ', '').trim()
        }
        
        const msgIdLine = lines.find(line => line.includes('🔗 Message ID:'))
        if (msgIdLine) {
          emeliaMsgId = msgIdLine.replace('🔗 Message ID: ', '').trim()
        }
        
        const dateLine = lines.find(line => line.includes('Date:'))
        if (dateLine) {
          emeliaMsgDate = dateLine.replace('Date: ', '').trim()
        }
      }

      return {
        id: message.id,
        threadId: message.thread.id,
        messageId: message.messageId,
        prospectEmail: message.thread.prospectEmail,
        prospectName,
        prospectCompany,
        subject: message.thread.subject,
        content: parsedContent,
        rawContent: message.text, // Keep original for debugging
        receivedAt: message.at,
        campaignName: message.thread.campaign.name,
        label: message.thread.label,
        confidence: message.thread.confidence,
        isRead: false, // TODO: Add read status to database schema
        // Emelia metadata
        emelia: {
          sender: emeliaSender,
          messageId: emeliaMsgId,
          originalDate: emeliaMsgDate,
          status: 'REPLIED', // Default status from Emelia
          source: 'EMELIA_WEBHOOK'
        }
      }
    })

    return NextResponse.json({ 
      responses: transformedResponses,
      total: transformedResponses.length 
    })

  } catch (error) {
    console.error('Responses API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réponses' },
      { status: 500 }
    )
  }
}