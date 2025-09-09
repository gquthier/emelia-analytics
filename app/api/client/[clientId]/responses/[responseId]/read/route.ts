import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ 
    clientId: string
    responseId: string 
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { clientId, responseId } = await context.params

    // Verify the message belongs to this client
    const message = await prisma.message.findFirst({
      where: {
        id: responseId,
        thread: {
          clientId: clientId
        }
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 })
    }

    // For now, we'll just return success since we don't have a read status field
    // TODO: Add read status field to message schema and update it here
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Mark as read error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du marquage comme lu' },
      { status: 500 }
    )
  }
}