'use client'

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  BarChart3, 
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Calendar
} from 'lucide-react'

interface ClientKpis {
  sent: number
  delivered: number
  opens: number
  clicks: number
  replies: number
  interested: number
  bounces: number
  unsubscribes: number
}

interface Campaign {
  id: string
  name: string
  createdAt: Date
  threads: Array<{
    id: string
    label: string | null
    lastAt: Date | null
  }>
}

interface PerformanceInsightsProps {
  kpis: ClientKpis | null
  campaigns: Campaign[]
}

interface PerformanceMetric {
  name: string
  value: number
  benchmark: number
  status: 'excellent' | 'good' | 'average' | 'poor'
  insight: string
}

function PerformanceInsights({ kpis, campaigns }: PerformanceInsightsProps) {
  const metrics = useMemo(() => {
    if (!kpis || kpis.delivered === 0) {
      return []
    }

    const deliveryRate = (kpis.delivered / kpis.sent) * 100
    const openRate = (kpis.opens / kpis.delivered) * 100
    const clickRate = (kpis.clicks / kpis.delivered) * 100
    const replyRate = (kpis.replies / kpis.delivered) * 100
    const conversionRate = (kpis.interested / kpis.delivered) * 100
    const bounceRate = (kpis.bounces / kpis.sent) * 100
    const unsubscribeRate = (kpis.unsubscribes / kpis.delivered) * 100

    const getStatus = (value: number, benchmarks: [number, number, number]): PerformanceMetric['status'] => {
      if (value >= benchmarks[0]) return 'excellent'
      if (value >= benchmarks[1]) return 'good'
      if (value >= benchmarks[2]) return 'average'
      return 'poor'
    }

    const performanceMetrics: PerformanceMetric[] = [
      {
        name: 'Délivrabilité',
        value: deliveryRate,
        benchmark: 95,
        status: getStatus(deliveryRate, [95, 90, 85]),
        insight: deliveryRate >= 95 
          ? 'Excellente délivrabilité' 
          : deliveryRate >= 90 
          ? 'Bonne délivrabilité'
          : 'À améliorer - vérifiez la qualité de vos listes'
      },
      {
        name: 'Taux d\'ouverture',
        value: openRate,
        benchmark: 25,
        status: getStatus(openRate, [25, 20, 15]),
        insight: openRate >= 25 
          ? 'Objets très accrocheurs' 
          : openRate >= 20
          ? 'Performance standard'
          : 'Optimisez vos lignes d\'objet'
      },
      {
        name: 'Taux de clic',
        value: clickRate,
        benchmark: 3,
        status: getStatus(clickRate, [3, 2, 1]),
        insight: clickRate >= 3 
          ? 'Contenu très engageant' 
          : clickRate >= 2
          ? 'Bon engagement'
          : 'Améliorez vos call-to-actions'
      },
      {
        name: 'Taux de réponse',
        value: replyRate,
        benchmark: 2,
        status: getStatus(replyRate, [2, 1.5, 1]),
        insight: replyRate >= 2 
          ? 'Excellente approche personnalisée' 
          : replyRate >= 1.5
          ? 'Bonne réactivité'
          : 'Personnalisez davantage vos messages'
      },
      {
        name: 'Taux de conversion',
        value: conversionRate,
        benchmark: 1,
        status: getStatus(conversionRate, [1, 0.5, 0.2]),
        insight: conversionRate >= 1 
          ? 'ROI excellent' 
          : conversionRate >= 0.5
          ? 'Performance satisfaisante'
          : 'Qualifiez mieux vos prospects'
      },
      {
        name: 'Taux de bounce',
        value: bounceRate,
        benchmark: 5,
        status: bounceRate <= 5 ? 'excellent' : bounceRate <= 10 ? 'good' : bounceRate <= 15 ? 'average' : 'poor',
        insight: bounceRate <= 5 
          ? 'Liste de qualité' 
          : bounceRate <= 10
          ? 'Qualité acceptable'
          : 'Nettoyez vos listes d\'emails'
      }
    ]

    return performanceMetrics
  }, [kpis])

  const campaignInsights = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const recentCampaigns = campaigns.filter(campaign => campaign.createdAt > thirtyDaysAgo)
    const totalThreads = campaigns.reduce((acc, campaign) => acc + campaign.threads.length, 0)
    const activeThreads = campaigns.reduce((acc, campaign) => 
      acc + campaign.threads.filter(thread => 
        thread.lastAt && thread.lastAt > thirtyDaysAgo
      ).length, 0)

    const avgThreadsPerCampaign = campaigns.length > 0 ? totalThreads / campaigns.length : 0

    return {
      totalCampaigns: campaigns.length,
      recentCampaigns: recentCampaigns.length,
      totalThreads,
      activeThreads,
      avgThreadsPerCampaign
    }
  }, [campaigns])

  const getStatusIcon = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'good': return <Target className="w-4 h-4 text-blue-600" />
      case 'average': return <AlertTriangle className="w-4 h-4 text-amber-600" />
      case 'poor': return <TrendingDown className="w-4 h-4 text-red-600" />
    }
  }

  const getStatusColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-700 bg-green-50 border-green-200'
      case 'good': return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'average': return 'text-amber-700 bg-amber-50 border-amber-200'
      case 'poor': return 'text-red-700 bg-red-50 border-red-200'
    }
  }

  if (!kpis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="caps flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-brand-muted">Pas assez de données pour générer des insights de performance</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="caps flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Performance Insights
        </CardTitle>
        <p className="text-brand-muted typography-editorial">
          Analyse détaillée de vos métriques vs benchmarks industrie
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Performance Metrics */}
        <div>
          <h4 className="font-medium text-brand caps text-sm mb-3">
            Métriques de Performance
          </h4>
          <div className="space-y-3">
            {metrics.map((metric, index) => (
              <div key={index} className={`p-3 rounded-lg border ${getStatusColor(metric.status)}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(metric.status)}
                    <span className="font-medium text-sm">{metric.name}</span>
                  </div>
                  <span className="font-bold">
                    {metric.value.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs opacity-75">
                  {metric.insight} • Benchmark: {metric.benchmark}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Overview */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-medium text-brand caps text-sm mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Aperçu Campagnes
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-brand">{campaignInsights.totalCampaigns}</div>
              <div className="text-xs text-brand-muted caps">Total campagnes</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-accent">{campaignInsights.recentCampaigns}</div>
              <div className="text-xs text-brand-muted caps">Récentes (30j)</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-brand">{campaignInsights.totalThreads}</div>
              <div className="text-xs text-brand-muted caps">Total prospects</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{campaignInsights.activeThreads}</div>
              <div className="text-xs text-brand-muted caps">Actifs (30j)</div>
            </div>
          </div>
        </div>

        {/* Strategic Recommendation */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 caps text-sm">
                Recommandation Stratégique
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                {metrics.length > 0 && metrics.filter(m => m.status === 'excellent' || m.status === 'good').length >= 3
                  ? "Performance solide sur la plupart des métriques. Concentrez-vous sur le scaling et l'optimisation des segments moins performants."
                  : metrics.length > 0 && metrics.filter(m => m.status === 'poor').length >= 2
                  ? "Plusieurs métriques nécessitent une attention. Priorisez la délivrabilité et la qualité des listes avant d'augmenter le volume."
                  : "Performance équilibrée. Testez de nouveaux angles d'approche et personnalisations pour améliorer l'engagement."
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { PerformanceInsights }