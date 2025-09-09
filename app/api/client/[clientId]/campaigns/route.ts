import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EmeliaAPIClient } from '@/lib/emelia'
import { decryptApiKey } from '@/lib/crypto'

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

    // Initialize Emelia client for real stats
    const apiKey = decryptApiKey(client.apiKeyEnc)
    const emeliClient = new EmeliaAPIClient(apiKey)

    // Get campaigns with detailed stats
    const campaigns = await prisma.campaign.findMany({
      where: { clientId },
      include: {
        _count: {
          select: { 
            threads: true 
          }
        },
        threads: {
          include: {
            _count: {
              select: { messages: true }
            },
            messages: {
              select: {
                direction: true,
                at: true
              }
            }
          },
          take: 5 // Limit for performance, get more detailed stats later if needed
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate stats for each campaign (including real Emelia stats)
    const campaignsWithStats = await Promise.all(campaigns.map(async (campaign) => {
      const threads = campaign.threads
      const totalMessages = threads.reduce((sum, thread) => sum + thread._count.messages, 0)
      const inboundMessages = threads.reduce((sum, thread) => 
        sum + thread.messages.filter(msg => msg.direction === 'INBOUND').length, 0)
      const outboundMessages = threads.reduce((sum, thread) => 
        sum + thread.messages.filter(msg => msg.direction === 'OUTBOUND').length, 0)

      // Get latest activity
      const latestActivity = threads.reduce((latest: Date | null, thread) => {
        const threadLatest = thread.messages.reduce((threadLatest: Date | null, msg) => {
          const msgDate = new Date(msg.at)
          return !threadLatest || msgDate > threadLatest ? msgDate : threadLatest
        }, null)
        return !latest || (threadLatest && threadLatest > latest) ? threadLatest : latest
      }, null)

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
          totalThreads: campaign._count.threads,
          totalMessages,
          inboundMessages,
          outboundMessages,
          latestActivity,
          // Add real Emelia stats
          emelia: emeliStats
        },
        // Remove the full threads data for cleaner response
        threads: undefined
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