import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptApiKey } from '@/lib/crypto'
import { EmeliaAPIClient } from '@/lib/emelia'
import { backfillClient } from '@/lib/sync'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params

    // Get client
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json('Client non trouvé', { status: 404 })
    }

    // Decrypt API key
    const apiKey = decryptApiKey(client.apiKeyEnc)

    // Start backfill
    await backfillClient(client.id, apiKey, client.code3)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json('Erreur de synchronisation', { status: 500 })
  }
}