import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params

    // Get client with comprehensive data for AI analysis
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        kpis: true,
        campaigns: {
          include: {
            threads: {
              include: {
                messages: {
                  where: {
                    direction: 'INBOUND'
                  },
                  orderBy: { at: 'desc' },
                  take: 100 // Analyze recent responses
                },
                _count: {
                  select: { messages: true }
                }
              }
            }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Collect all threads and messages for analysis
    const allThreads = client.campaigns.flatMap(campaign => campaign.threads)
    const allResponses = allThreads.flatMap(thread => thread.messages)
    
    // Response sentiment analysis
    const sentimentDistribution = allThreads.reduce((acc, thread) => {
      if (thread.label) {
        acc[thread.label] = (acc[thread.label] || 0) + 1
      } else {
        acc['UNLABELED'] = (acc['UNLABELED'] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Response time analysis
    const responseTimeAnalysis = allThreads.map(thread => {
      const outboundMessages = thread.messages.filter(m => m.direction === 'OUTBOUND')
      const inboundMessages = thread.messages.filter(m => m.direction === 'INBOUND')
      
      if (outboundMessages.length === 0 || inboundMessages.length === 0) return null
      
      // Calculate time to first response
      const firstOutbound = outboundMessages.sort((a, b) => a.at.getTime() - b.at.getTime())[0]
      const firstInbound = inboundMessages.sort((a, b) => a.at.getTime() - b.at.getTime())[0]
      
      if (firstInbound.at > firstOutbound.at) {
        return (firstInbound.at.getTime() - firstOutbound.at.getTime()) / (1000 * 60 * 60) // in hours
      }
      
      return null
    }).filter(Boolean) as number[]

    const avgResponseTime = responseTimeAnalysis.length > 0 
      ? responseTimeAnalysis.reduce((sum, time) => sum + time, 0) / responseTimeAnalysis.length 
      : 0

    // Campaign performance analysis
    const campaignPerformance = client.campaigns.map(campaign => {
      const threads = campaign.threads
      const totalThreads = threads.length
      const respondedThreads = threads.filter(t => t._count.messages > 0).length
      const interestedThreads = threads.filter(t => t.label === 'INTERESSE').length
      
      return {
        name: campaign.name,
        totalThreads,
        responseRate: totalThreads > 0 ? (respondedThreads / totalThreads) * 100 : 0,
        conversionRate: totalThreads > 0 ? (interestedThreads / totalThreads) * 100 : 0
      }
    })

    // Generate AI insights based on data analysis
    const generateInsights = () => {
      const insights = []

      // Performance insights
      if (client.kpis) {
        const conversionRate = client.kpis.delivered > 0 ? (client.kpis.interested / client.kpis.delivered) * 100 : 0
        const openRate = client.kpis.delivered > 0 ? (client.kpis.opens / client.kpis.delivered) * 100 : 0
        const replyRate = client.kpis.delivered > 0 ? (client.kpis.replies / client.kpis.delivered) * 100 : 0
        const bounceRate = client.kpis.sent > 0 ? (client.kpis.bounces / client.kpis.sent) * 100 : 0

        if (conversionRate >= 2) {
          insights.push({
            type: 'success',
            category: 'performance',
            title: 'Excellent taux de conversion',
            description: `Avec ${conversionRate.toFixed(1)}% de conversion, vos campagnes performent très bien. Continuez sur cette lancée !`,
            priority: 'high',
            actionable: true,
            suggestion: 'Augmentez le volume de prospection en gardant la même approche qualitative.'
          })
        } else if (conversionRate < 0.5) {
          insights.push({
            type: 'warning',
            category: 'performance',
            title: 'Taux de conversion à améliorer',
            description: `${conversionRate.toFixed(1)}% de conversion est en dessous des standards. Il y a des optimisations à faire.`,
            priority: 'high',
            actionable: true,
            suggestion: 'Revoyez votre ciblage et personnalisez davantage vos messages.'
          })
        }

        if (bounceRate > 10) {
          insights.push({
            type: 'error',
            category: 'deliverability',
            title: 'Problème de délivrabilité détecté',
            description: `${bounceRate.toFixed(1)}% de bounce rate est trop élevé et impacte votre réputation.`,
            priority: 'critical',
            actionable: true,
            suggestion: 'Nettoyez vos listes d\'emails et utilisez un service de validation.'
          })
        }

        if (openRate < 15 && replyRate >= 1) {
          insights.push({
            type: 'info',
            category: 'messaging',
            title: 'Optimisez vos objets d\'emails',
            description: 'Bon taux de réponse mais faible ouverture. Vos objets peuvent être améliorés.',
            priority: 'medium',
            actionable: true,
            suggestion: 'Testez des objets plus courts, personnalisés et créant de la curiosité.'
          })
        }
      }

      // Response pattern insights
      const interestedCount = sentimentDistribution['INTERESSE'] || 0
      const notInterestedCount = sentimentDistribution['PAS_INTERESSE'] || 0
      const totalLabeledResponses = Object.values(sentimentDistribution).reduce((sum, count) => sum + count, 0)

      if (interestedCount > 0 && totalLabeledResponses > 10) {
        const interestRatio = interestedCount / totalLabeledResponses
        if (interestRatio > 0.3) {
          insights.push({
            type: 'success',
            category: 'engagement',
            title: 'Excellent engagement des prospects',
            description: `${Math.round(interestRatio * 100)}% de vos réponses sont positives. Votre message résonne bien !`,
            priority: 'medium',
            actionable: false,
            suggestion: 'Documentez cette approche gagnante pour la répliquer sur d\'autres segments.'
          })
        }
      }

      // Response time insights
      if (avgResponseTime > 0) {
        if (avgResponseTime < 24) {
          insights.push({
            type: 'success',
            category: 'timing',
            title: 'Réactivité excellente des prospects',
            description: `Temps de réponse moyen de ${avgResponseTime.toFixed(1)}h. Vos prospects sont très réactifs.`,
            priority: 'low',
            actionable: false,
            suggestion: 'Maintenez votre stratégie de prospection, elle fonctionne bien.'
          })
        } else if (avgResponseTime > 72) {
          insights.push({
            type: 'info',
            category: 'timing',
            title: 'Délai de réponse élevé',
            description: 'Vos prospects prennent du temps à répondre. Considérez un suivi plus rapproché.',
            priority: 'medium',
            actionable: true,
            suggestion: 'Programmez des relances automatiques à 3 et 7 jours.'
          })
        }
      }

      // Campaign comparison insights
      if (campaignPerformance.length > 1) {
        const bestCampaign = campaignPerformance.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        )
        const worstCampaign = campaignPerformance.reduce((worst, current) => 
          current.conversionRate < worst.conversionRate ? current : worst
        )

        if (bestCampaign.conversionRate > worstCampaign.conversionRate * 2) {
          insights.push({
            type: 'info',
            category: 'optimization',
            title: 'Performance inégale entre campagnes',
            description: `"${bestCampaign.name}" performe ${Math.round(bestCampaign.conversionRate / worstCampaign.conversionRate)}x mieux que "${worstCampaign.name}".`,
            priority: 'medium',
            actionable: true,
            suggestion: 'Analysez les différences d\'approche et appliquez les bonnes pratiques partout.'
          })
        }
      }

      return insights.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
    }

    const insights = generateInsights()

    // Response patterns for advanced analytics
    const responsePatterns = {
      byHour: {}, // Could be implemented with more time data
      byDayOfWeek: {}, // Could be implemented with more time data
      averageLength: allResponses.length > 0 
        ? allResponses.reduce((sum, r) => sum + r.text.length, 0) / allResponses.length 
        : 0,
      commonKeywords: [] // Could be implemented with text analysis
    }

    return NextResponse.json({
      insights,
      analytics: {
        totalThreads: allThreads.length,
        totalResponses: allResponses.length,
        responseRate: allThreads.length > 0 ? (allResponses.length / allThreads.length) * 100 : 0,
        averageResponseTime: avgResponseTime,
        sentimentDistribution,
        campaignPerformance,
        responsePatterns
      },
      recommendations: insights.filter(i => i.actionable).slice(0, 3), // Top 3 actionable
      lastAnalysis: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Insights API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération des insights IA' },
      { status: 500 }
    )
  }
}