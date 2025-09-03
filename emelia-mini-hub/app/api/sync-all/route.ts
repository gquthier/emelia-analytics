import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptApiKey } from '@/lib/crypto'
import { backfillClient } from '@/lib/sync'

export async function POST(request: NextRequest) {
  try {
    // Get all clients
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        code3: true,
        apiKeyEnc: true,
        lastSyncAt: true
      }
    })

    if (clients.length === 0) {
      return NextResponse.json({ message: 'Aucun client trouvé', syncedClients: [] })
    }

    const results = []
    
    // Process each client
    for (const client of clients) {
      try {
        console.log(`Starting sync for client ${client.name} (${client.code3})`)
        
        // Decrypt API key
        const apiKey = decryptApiKey(client.apiKeyEnc)
        
        // Start backfill
        await backfillClient(client.id, apiKey, client.code3)
        
        results.push({
          clientId: client.id,
          name: client.name,
          code3: client.code3,
          status: 'success',
          syncedAt: new Date().toISOString()
        })
        
        console.log(`✅ Sync completed for client ${client.name}`)
      } catch (error) {
        console.error(`❌ Sync failed for client ${client.name}:`, error)
        
        results.push({
          clientId: client.id,
          name: client.name,
          code3: client.code3,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      message: `Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs`,
      totalClients: clients.length,
      successCount,
      errorCount,
      results
    })
    
  } catch (error) {
    console.error('Global sync error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation globale' }, 
      { status: 500 }
    )
  }
}