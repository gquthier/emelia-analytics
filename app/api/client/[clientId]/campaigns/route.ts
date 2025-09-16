import { NextRequest, NextResponse } from 'next/server'
import { supabaseClients, supabaseCampaigns } from '@/lib/supabase-adapter'
import { EmeliaAPIClient } from '@/lib/emelia'
import { decryptApiKey } from '@/lib/crypto'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params

    // Get client to verify it exists
    const client = await supabaseClients.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Initialize Emelia client for real stats
    const apiKey = decryptApiKey(client.apiKeyEnc)
    const emeliClient = new EmeliaAPIClient(apiKey)

    // Get campaigns for this client
    const campaigns = await supabaseCampaigns.findMany({
      where: { clientId }
    })

    // Calculate stats for each campaign (simplified for Supabase)
    const campaignsWithStats = await Promise.all(campaigns.map(async (campaign: any) => {
      // Get real Emelia stats
      let emeliStats = null
      try {
        if (campaign.emeliaId) {
          const realStats = await emeliClient.getCampaignStats(campaign.emeliaId)
          emeliStats = {
            sent: realStats.sent,
            delivered: realStats.delivered,
            opens: realStats.opens,
            clicks: realStats.clicks,
            replies: realStats.replies,
            bounces: realStats.bounces,
            unsubscribes: realStats.unsubscribes
          }
        }
      } catch (error) {
        console.error(`Failed to get Emelia stats for campaign ${campaign.name}:`, error)
      }

      return {
        id: campaign.id,
        emeliaId: campaign.emeliaId,
        name: campaign.name,
        createdAt: campaign.createdAt,
        lastEventAt: campaign.lastEventAt,
        stats: {
          // Add real Emelia stats
          emelia: emeliStats
        }
      }
    }))

    return NextResponse.json({ 
      campaigns: campaignsWithStats,
      total: campaigns.length 
    })

  } catch (error) {
    console.error('Campaigns API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des campagnes' },
      { status: 500 }
    )
  }
}