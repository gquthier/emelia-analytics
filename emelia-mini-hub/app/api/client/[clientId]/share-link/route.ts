import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createShareLink } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json('Client non trouvé', { status: 404 })
    }

    // Create share link
    const shareLink = createShareLink(clientId)
    const token = shareLink.split('token=')[1]

    // Store in database
    await prisma.shareLink.create({
      data: {
        clientId,
        token,
      }
    })

    return NextResponse.json({ shareLink })
  } catch (error) {
    console.error('Share link creation error:', error)
    return NextResponse.json('Erreur serveur', { status: 500 })
  }
}