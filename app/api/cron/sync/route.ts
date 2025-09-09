import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptApiKey } from '@/lib/crypto'
import { resyncClient } from '@/lib/sync'

export async function POST(request: NextRequest) {
  try {
    // Verify CRON secret
    const cronSecret = request.headers.get('X-Cron-Secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json('Unauthorized', { status: 401 })
    }

    console.log('🕐 Starting scheduled sync for all clients...')

    // Get clients that haven't been synced in the last 48 hours
    const fortyEightHoursAgo = new Date()
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48)

    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: fortyEightHoursAgo } }
        ]
      },
      select: {
        id: true,
        name: true,
        code3: true,
        apiKeyEnc: true,
        lastSyncAt: true
      }
    })

    if (clients.length === 0) {
      console.log('✅ No clients need syncing')
      return NextResponse.json({ 
        message: 'Aucun client à synchroniser',
        clientsProcessed: 0,
        scheduledAt: new Date().toISOString()
      })
    }

    console.log(`📋 Found ${clients.length} clients to sync`)

    const results = []
    for (const client of clients) {
      try {
        console.log(`🔄 Syncing client ${client.name} (${client.code3})`)
        
        const apiKey = decryptApiKey(client.apiKeyEnc)
        await resyncClient(client.id, apiKey, client.code3)
        
        results.push({ 
          clientId: client.id, 
          name: client.name,
          code3: client.code3,
          status: 'success',
          syncedAt: new Date().toISOString()
        })
        
        console.log(`✅ Sync completed for client ${client.name}`)
        
        // Small delay between clients to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`❌ Sync failed for client ${client.name}:`, error)
        results.push({ 
          clientId: client.id, 
          name: client.name,
          code3: client.code3,
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    console.log(`🎉 Scheduled sync completed: ${successCount} succès, ${errorCount} erreurs`)

    return NextResponse.json({
      message: `Synchronisation automatique terminée: ${successCount} succès, ${errorCount} erreurs`,
      totalClients: clients.length,
      successCount,
      errorCount,
      results,
      scheduledAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json('Erreur serveur', { status: 500 })
  }
}

// GET method pour vérifier le statut
export async function GET() {
  try {
    const fortyEightHoursAgo = new Date()
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48)

    const clientsNeedingSync = await prisma.client.count({
      where: {
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: fortyEightHoursAgo } }
        ]
      }
    })

    const totalClients = await prisma.client.count()
    const recentlySynced = totalClients - clientsNeedingSync

    return NextResponse.json({
      totalClients,
      clientsNeedingSync,
      recentlySynced,
      nextSyncThreshold: fortyEightHoursAgo.toISOString(),
      message: `${clientsNeedingSync} clients ont besoin d'être synchronisés`
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut' },
      { status: 500 }
    )
  }
}