import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptApiKey } from '@/lib/crypto'
import { fullHistoricalSync } from '@/lib/sync'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params

    // Get client to verify it exists and get encrypted API key
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Decrypt API key
    const apiKey = decryptApiKey(client.apiKeyEnc)

    console.log(`🚀 Starting FULL HISTORICAL SYNC for client: ${client.name} (${client.code3})`)
    
    // Start the comprehensive historical sync
    const syncResult = await fullHistoricalSync(clientId, apiKey, client.code3)

    return NextResponse.json({
      success: true,
      client: {
        id: clientId,
        name: client.name,
        code3: client.code3
      },
      results: syncResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Historical sync API error:', error)
    
    // Return detailed error information
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la synchronisation historique',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}