'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  Target,
  Lightbulb,
  BarChart3,
  MessageSquareText
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

interface InsightsCardsProps {
  kpis: ClientKpis | null
  totalThreads: number
  totalMessages: number
  loading?: boolean
}

interface InsightCard {
  title: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  type: 'success' | 'warning' | 'info'
}

function getPerformanceInsight(kpis: ClientKpis | null): InsightCard {
  if (!kpis || kpis.delivered === 0) {
    return {
      title: "Performance Globale",
      value: "En attente",
      description: "Pas assez de données pour analyser la performance",
      icon: BarChart3,
      type: 'info'
    }
  }

  const conversionRate = (kpis.interested / kpis.delivered) * 100
  
  if (conversionRate >= 5) {
    return {
      title: "Performance Globale",
      value: "Excellente",
      description: `Taux de conversion de ${conversionRate.toFixed(1)}% - Campagnes très efficaces`,
      icon: TrendingUp,
      type: 'success'
    }
  } else if (conversionRate >= 2) {
    return {
      title: "Performance Globale", 
      value: "Bonne",
      description: `Taux de conversion de ${conversionRate.toFixed(1)}% - Performance au-dessus de la moyenne`,
      icon: Target,
      type: 'success'
    }
  } else {
    return {
      title: "Performance Globale",
      value: "À améliorer",
      description: `Taux de conversion de ${conversionRate.toFixed(1)}% - Optimisations recommandées`,
      icon: AlertCircle,
      type: 'warning'
    }
  }
}

function getEngagementInsight(kpis: ClientKpis | null): InsightCard {
  if (!kpis || kpis.delivered === 0) {
    return {
      title: "Engagement",
      value: "En attente", 
      description: "Pas assez de données pour analyser l'engagement",
      icon: MessageSquareText,
      type: 'info'
    }
  }

  const openRate = (kpis.opens / kpis.delivered) * 100
  const clickRate = (kpis.clicks / kpis.delivered) * 100
  
  if (openRate >= 25 && clickRate >= 3) {
    return {
      title: "Engagement",
      value: "Très élevé",
      description: `${openRate.toFixed(1)}% d'ouvertures, ${clickRate.toFixed(1)}% de clics - Excellente audience`,
      icon: TrendingUp,
      type: 'success'
    }
  } else if (openRate >= 15 && clickRate >= 1.5) {
    return {
      title: "Engagement",
      value: "Modéré",
      description: `${openRate.toFixed(1)}% d'ouvertures, ${clickRate.toFixed(1)}% de clics - Performance standard`,
      icon: Target,
      type: 'info'
    }
  } else {
    return {
      title: "Engagement",
      value: "Faible",
      description: `${openRate.toFixed(1)}% d'ouvertures, ${clickRate.toFixed(1)}% de clics - Révision des contenus nécessaire`,
      icon: AlertCircle,
      type: 'warning'
    }
  }
}

function getRecommendationInsight(kpis: ClientKpis | null, totalThreads: number): InsightCard {
  if (!kpis || kpis.delivered === 0) {
    return {
      title: "Recommandation IA",
      value: "Collecter plus de données",
      description: "Lancez plus de campagnes pour obtenir des recommandations personnalisées",
      icon: Brain,
      type: 'info'
    }
  }

  const openRate = (kpis.opens / kpis.delivered) * 100
  const replyRate = (kpis.replies / kpis.delivered) * 100
  const bounceRate = (kpis.bounces / kpis.delivered) * 100

  // High bounce rate - deliverability issue
  if (bounceRate > 10) {
    return {
      title: "Recommandation IA",
      value: "Améliorer la délivrabilité",
      description: `${bounceRate.toFixed(1)}% de bounces - Nettoyez vos listes et validez les emails`,
      icon: AlertCircle,
      type: 'warning'
    }
  }

  // Low open rate - subject line issue
  if (openRate < 15) {
    return {
      title: "Recommandation IA",
      value: "Optimiser les objets",
      description: `${openRate.toFixed(1)}% d'ouvertures - Testez des objets plus accrocheurs et personnalisés`,
      icon: Lightbulb,
      type: 'warning'
    }
  }

  // Low reply rate but good open rate - content issue
  if (replyRate < 2 && openRate > 20) {
    return {
      title: "Recommandation IA",
      value: "Améliorer le contenu",
      description: `Bonnes ouvertures mais peu de réponses - Travaillez vos call-to-actions`,
      icon: MessageSquareText,
      type: 'warning'
    }
  }

  // Good performance overall
  return {
    title: "Recommandation IA",
    value: "Scaling recommandé",
    description: `Performance solide - Augmentez le volume et testez de nouveaux segments`,
    icon: TrendingUp,
    type: 'success'
  }
}

function InsightCard({ insight }: { insight: InsightCard }) {
  const { title, value, description, icon: Icon, type } = insight

  const colorClasses = {
    success: 'border-green-200 bg-green-50',
    warning: 'border-amber-200 bg-amber-50', 
    info: 'border-blue-200 bg-blue-50'
  }

  const iconClasses = {
    success: 'text-green-600',
    warning: 'text-amber-600',
    info: 'text-blue-600'
  }

  const valueClasses = {
    success: 'text-green-800',
    warning: 'text-amber-800',
    info: 'text-blue-800'
  }

  return (
    <Card className={`${colorClasses[type]} border-2`}>
      <CardHeader className="pb-2">
        <CardTitle className="caps flex items-center gap-2 text-sm">
          <Icon className={`w-4 h-4 ${iconClasses[type]}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-lg font-bold mb-1 ${valueClasses[type]}`}>
          {value}
        </div>
        <p className="text-sm text-brand-muted typography-editorial leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function InsightsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="space-y-1">
              <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function InsightsCards({ kpis, totalThreads, totalMessages, loading }: InsightsCardsProps) {
  if (loading) {
    return <InsightsSkeleton />
  }

  const insights = [
    getPerformanceInsight(kpis),
    getEngagementInsight(kpis),
    getRecommendationInsight(kpis, totalThreads)
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-brand caps mb-2">
          Insights IA & Analytics
        </h2>
        <p className="text-brand-muted typography-editorial">
          Analyses automatiques et recommandations personnalisées pour optimiser vos campagnes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((insight, index) => (
          <InsightCard key={index} insight={insight} />
        ))}
      </div>
    </div>
  )
}