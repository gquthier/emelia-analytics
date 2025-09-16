import { NextRequest, NextResponse } from 'next/server'
import { supabaseClients } from '@/lib/supabase-adapter'
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

    const allClients = await supabaseClients.findMany()
    const clients = allClients.filter(client => {
      if (!client.lastSyncAt) return true
      const lastSync = new Date(client.lastSyncAt)
      return lastSync < fortyEightHoursAgo
    }).map(client => ({
      id: client.id,
      name: client.name,
      code3: client.code3,
      apiKeyEnc: client.apiKeyEnc,
      lastSyncAt: client.lastSyncAt
    }))

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

    const allClients = await supabaseClients.findMany()
    const clientsNeedingSync = allClients.filter(client => {
      if (!client.lastSyncAt) return true
      const lastSync = new Date(client.lastSyncAt)
      return lastSync < fortyEightHoursAgo
    }).length

    const totalClients = allClients.length
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