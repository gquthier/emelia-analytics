'use client'

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  MessageSquareText, 
  PieChart,
  TrendingUp,
  Clock,
  Users
} from 'lucide-react'

interface Thread {
  id: string
  label: string | null
  lastAt: Date | null
  messages: Array<{
    id: string
    direction: string
    at: Date
    text: string
  }>
}

interface Campaign {
  id: string
  name: string
  threads: Thread[]
}

interface ResponsesAnalysisProps {
  campaigns: Campaign[]
  clientId: string
}

const LABEL_CONFIG = {
  INTERESSE: { label: 'Intéressé', color: 'rgb(34, 197, 94)', bgColor: 'rgb(240, 253, 244)' },
  A_RAPPELER: { label: 'À rappeler', color: 'rgb(59, 130, 246)', bgColor: 'rgb(239, 246, 255)' },
  NEUTRE: { label: 'Neutre', color: 'rgb(107, 114, 128)', bgColor: 'rgb(249, 250, 251)' },
  PAS_INTERESSE: { label: 'Pas intéressé', color: 'rgb(239, 68, 68)', bgColor: 'rgb(254, 242, 242)' },
  INJOIGNABLE: { label: 'Injoignable', color: 'rgb(245, 158, 11)', bgColor: 'rgb(255, 251, 235)' },
  OPT_OUT: { label: 'Opt-out', color: 'rgb(147, 51, 234)', bgColor: 'rgb(250, 245, 255)' }
}

function ResponsesAnalysis({ campaigns, clientId }: ResponsesAnalysisProps) {
  const analysisData = useMemo(() => {
    const allThreads = campaigns.flatMap(campaign => campaign.threads)
    
    // Label distribution
    const labelDistribution = Object.keys(LABEL_CONFIG).reduce((acc, label) => {
      acc[label] = allThreads.filter(thread => thread.label === label).length
      return acc
    }, {} as Record<string, number>)

    // Add unlabeled threads
    const unlabeledCount = allThreads.filter(thread => !thread.label).length
    if (unlabeledCount > 0) {
      labelDistribution['UNLABELED'] = unlabeledCount
    }

    const totalLabeled = Object.values(labelDistribution).reduce((sum, count) => sum + count, 0)

    // Response time analysis
    const responseThreads = allThreads.filter(thread => 
      thread.messages.some(msg => msg.direction === 'INBOUND')
    )

    const avgResponseTime = responseThreads.length > 0 
      ? responseThreads.reduce((acc, thread) => {
          const firstOutbound = thread.messages.find(msg => msg.direction === 'OUTBOUND')
          const firstInbound = thread.messages.find(msg => msg.direction === 'INBOUND')
          
          if (firstOutbound && firstInbound && firstInbound.at > firstOutbound.at) {
            const diffHours = (firstInbound.at.getTime() - firstOutbound.at.getTime()) / (1000 * 60 * 60)
            return acc + diffHours
          }
          return acc
        }, 0) / responseThreads.length
      : 0

    // Engagement metrics
    const interestedCount = labelDistribution['INTERESSE'] || 0
    const callbackCount = labelDistribution['A_RAPPELER'] || 0
    const positiveEngagement = interestedCount + callbackCount
    const engagementRate = totalLabeled > 0 ? (positiveEngagement / totalLabeled) * 100 : 0

    // Active campaigns (with recent activity)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const activeCampaigns = campaigns.filter(campaign => 
      campaign.threads.some(thread => 
        thread.lastAt && thread.lastAt > sevenDaysAgo
      )
    ).length

    return {
      labelDistribution,
      totalThreads: allThreads.length,
      totalLabeled,
      responseThreads: responseThreads.length,
      avgResponseTime,
      engagementRate,
      activeCampaigns,
      totalCampaigns: campaigns.length
    }
  }, [campaigns])

  const chartData = useMemo(() => {
    return Object.entries(analysisData.labelDistribution)
      .filter(([_, count]) => count > 0)
      .map(([label, count]) => ({
        label: label === 'UNLABELED' ? 'Non classé' : LABEL_CONFIG[label as keyof typeof LABEL_CONFIG]?.label || label,
        count,
        percentage: analysisData.totalThreads > 0 ? (count / analysisData.totalThreads) * 100 : 0,
        color: label === 'UNLABELED' ? 'rgb(156, 163, 175)' : LABEL_CONFIG[label as keyof typeof LABEL_CONFIG]?.color || 'rgb(107, 114, 128)'
      }))
      .sort((a, b) => b.count - a.count)
  }, [analysisData])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="caps flex items-center gap-2">
          <MessageSquareText className="w-5 h-5" />
          Analyse des Réponses
        </CardTitle>
        <p className="text-brand-muted typography-editorial">
          Classification et insights sur l'engagement des prospects
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-brand">{analysisData.responseThreads}</div>
            <div className="text-sm text-brand-muted caps">Conversations actives</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-accent">
              {analysisData.engagementRate.toFixed(1)}%
            </div>
            <div className="text-sm text-brand-muted caps">Engagement positif</div>
          </div>
        </div>

        {/* Label Distribution */}
        <div>
          <h4 className="font-medium text-brand caps text-sm mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Répartition par Classification
          </h4>
          <div className="space-y-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-brand">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-brand">{item.count}</span>
                  <span className="text-xs text-brand-muted">({item.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-muted" />
              <span className="text-sm text-brand">Temps de réponse moyen</span>
            </div>
            <span className="text-sm font-medium text-brand">
              {analysisData.avgResponseTime > 0 
                ? `${analysisData.avgResponseTime.toFixed(1)}h`
                : 'N/A'
              }
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-muted" />
              <span className="text-sm text-brand">Campagnes actives (7j)</span>
            </div>
            <span className="text-sm font-medium text-brand">
              {analysisData.activeCampaigns}/{analysisData.totalCampaigns}
            </span>
          </div>
        </div>

        {/* Recommendation */}
        {analysisData.engagementRate > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 caps text-sm">
                  Recommandation
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  {analysisData.engagementRate >= 30 
                    ? "Excellent taux d'engagement ! Continuez sur cette lancée et augmentez le volume."
                    : analysisData.engagementRate >= 15
                    ? "Bon taux d'engagement. Analysez les patterns des réponses intéressées pour optimiser."
                    : "Taux d'engagement à améliorer. Testez de nouveaux angles d'approche et personnalisez davantage."
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { ResponsesAnalysis }