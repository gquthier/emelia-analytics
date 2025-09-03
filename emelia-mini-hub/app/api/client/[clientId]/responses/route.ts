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

      return {
        id: message.id,
        threadId: message.thread.id,
        messageId: message.messageId,
        prospectEmail: message.thread.prospectEmail,
        prospectName,
        prospectCompany,
        subject: message.thread.subject,
        content: message.text,
        receivedAt: message.at,
        campaignName: message.thread.campaign.name,
        label: message.thread.label,
        confidence: message.thread.confidence,
        isRead: false // TODO: Add read status to database schema
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