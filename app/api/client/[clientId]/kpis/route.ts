import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params

    // Get client to verify it exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        kpis: true
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // If no computed KPIs, return empty state
    if (!client.kpis) {
      return NextResponse.json({
        kpis: null,
        isEmpty: true,
        message: 'Aucune donnée KPI disponible. Synchronisez votre client pour calculer les métriques.'
      })
    }

    // Calculate additional insights
    const deliveryRate = client.kpis.sent > 0 ? (client.kpis.delivered / client.kpis.sent) * 100 : 0
    const openRate = client.kpis.delivered > 0 ? (client.kpis.opens / client.kpis.delivered) * 100 : 0
    const clickRate = client.kpis.delivered > 0 ? (client.kpis.clicks / client.kpis.delivered) * 100 : 0
    const replyRate = client.kpis.delivered > 0 ? (client.kpis.replies / client.kpis.delivered) * 100 : 0
    const conversionRate = client.kpis.delivered > 0 ? (client.kpis.interested / client.kpis.delivered) * 100 : 0
    const bounceRate = client.kpis.sent > 0 ? (client.kpis.bounces / client.kpis.sent) * 100 : 0
    const unsubscribeRate = client.kpis.delivered > 0 ? (client.kpis.unsubs / client.kpis.delivered) * 100 : 0

    // Performance benchmarks (industry standards)
    const benchmarks = {
      deliveryRate: 95,
      openRate: 25,
      clickRate: 3,
      replyRate: 2,
      conversionRate: 1,
      bounceRate: 5,
      unsubscribeRate: 0.5
    }

    // Performance scoring
    const getPerformanceScore = (value: number, benchmark: number, isLowerBetter = false) => {
      if (isLowerBetter) {
        if (value <= benchmark) return 'excellent'
        if (value <= benchmark * 1.5) return 'good'
        if (value <= benchmark * 2) return 'average'
        return 'poor'
      } else {
        if (value >= benchmark) return 'excellent'
        if (value >= benchmark * 0.8) return 'good'
        if (value >= benchmark * 0.6) return 'average'
        return 'poor'
      }
    }

    const performanceScores = {
      delivery: getPerformanceScore(deliveryRate, benchmarks.deliveryRate),
      open: getPerformanceScore(openRate, benchmarks.openRate),
      click: getPerformanceScore(clickRate, benchmarks.clickRate),
      reply: getPerformanceScore(replyRate, benchmarks.replyRate),
      conversion: getPerformanceScore(conversionRate, benchmarks.conversionRate),
      bounce: getPerformanceScore(bounceRate, benchmarks.bounceRate, true),
      unsubscribe: getPerformanceScore(unsubscribeRate, benchmarks.unsubscribeRate, true)
    }

    // Overall performance grade
    const scoreValues = { excellent: 4, good: 3, average: 2, poor: 1 }
    const avgScore = Object.values(performanceScores).reduce((sum, score) => 
      sum + scoreValues[score as keyof typeof scoreValues], 0) / Object.keys(performanceScores).length

    let overallGrade: 'A' | 'B' | 'C' | 'D'
    if (avgScore >= 3.5) overallGrade = 'A'
    else if (avgScore >= 2.5) overallGrade = 'B'
    else if (avgScore >= 1.5) overallGrade = 'C'
    else overallGrade = 'D'

    return NextResponse.json({
      kpis: {
        // Raw numbers
        sent: client.kpis.sent,
        delivered: client.kpis.delivered,
        opens: client.kpis.opens,
        clicks: client.kpis.clicks,
        replies: client.kpis.replies,
        interested: client.kpis.interested,
        bounces: client.kpis.bounces,
        unsubscribes: client.kpis.unsubs,
        computedAt: client.kpis.computedAt,
        
        // Calculated rates
        rates: {
          delivery: deliveryRate,
          open: openRate,
          click: clickRate,
          reply: replyRate,
          conversion: conversionRate,
          bounce: bounceRate,
          unsubscribe: unsubscribeRate
        },
        
        // Performance analysis
        performance: {
          scores: performanceScores,
          overall: overallGrade,
          benchmarks
        }
      },
      isEmpty: false
    })

  } catch (error) {
    console.error('KPIs API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des KPIs' },
      { status: 500 }
    )
  }
}