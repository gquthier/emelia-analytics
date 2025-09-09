'use client'

import { 
  Mail, 
  CheckCircle, 
  Eye, 
  MousePointer, 
  Reply, 
  Heart, 
  AlertTriangle, 
  UserX,
  BarChart3
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface KPIData {
  sent: number
  delivered: number
  opens: number
  clicks: number
  replies: number
  bounces: number
  unsubs: number
  interested: number
  computedAt?: Date
}

interface KPICardsProps {
  kpis: KPIData | null
  loading?: boolean
  period?: string
}

interface KPICardProps {
  title: string
  value: number | string
  change?: number
  icon: React.ComponentType<{ className?: string }>
  format: 'number' | 'percentage'
  trend?: 'up' | 'down' | 'stable'
  description?: string
  highlight?: boolean
}

function KPICard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  format, 
  trend, 
  description,
  highlight = false 
}: KPICardProps) {
  const formatValue = (val: number | string) => {
    if (format === 'percentage') {
      return typeof val === 'number' ? `${val.toFixed(1)}%` : val
    }
    return typeof val === 'number' ? val.toLocaleString('fr-FR') : val
  }

  const getTrendColor = () => {
    if (!trend || !change) return 'text-brand-muted'
    if (trend === 'up') return 'text-success'
    if (trend === 'down') return 'text-danger'
    return 'text-brand-muted'
  }

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
      highlight ? 'ring-2 ring-accent ring-offset-2' : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-brand-muted" />
              <h3 className="text-sm font-medium text-brand-muted caps">
                {title}
              </h3>
            </div>
            
            <div className="space-y-1">
              <div className="text-2xl font-bold text-brand">
                {formatValue(value)}
              </div>
              
              {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                  <span className="editorial-prefix">{change > 0 ? '+' : ''}{change}%</span>
                  <span className="text-brand-muted">vs période précédente</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {description && (
          <div className="mt-3 text-xs text-brand-muted typography-editorial">
            {description}
          </div>
        )}

        {/* Subtle background decoration */}
        <div className="absolute -bottom-2 -right-2 opacity-5">
          <Icon className="w-16 h-16" />
        </div>
      </CardContent>
    </Card>
  )
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-brand-muted/10 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-brand-muted" />
        </div>
        <h3 className="text-lg font-semibold text-brand mb-2">
          Aucune donnée disponible
        </h3>
        <p className="text-brand-muted text-center max-w-md typography-editorial">
          Connectez votre compte Emelia et lancez votre première synchronisation 
          pour voir vos métriques apparaître ici.
        </p>
      </CardContent>
    </Card>
  )
}

export function KPICards({ kpis, loading = false, period = '30d' }: KPICardsProps) {
  if (loading) {
    return <KPISkeleton />
  }

  if (!kpis || kpis.delivered === 0) {
    return <EmptyState />
  }

  // Calculate rates safely
  const openRate = kpis.delivered > 0 ? (kpis.opens / kpis.delivered) * 100 : 0
  const clickRate = kpis.delivered > 0 ? (kpis.clicks / kpis.delivered) * 100 : 0
  const replyRate = kpis.delivered > 0 ? (kpis.replies / kpis.delivered) * 100 : 0
  const bounceRate = kpis.sent > 0 ? (kpis.bounces / kpis.sent) * 100 : 0
  const unsubRate = kpis.sent > 0 ? (kpis.unsubs / kpis.sent) * 100 : 0

  const kpiData = [
    {
      title: 'Emails Envoyés',
      value: kpis.sent,
      icon: Mail,
      format: 'number' as const,
      description: 'Total des emails envoyés dans la période',
    },
    {
      title: 'Emails Délivrés',
      value: kpis.delivered,
      icon: CheckCircle,
      format: 'number' as const,
      description: `${kpis.sent > 0 ? ((kpis.delivered / kpis.sent) * 100).toFixed(1) : 0}% de délivrabilité`,
    },
    {
      title: 'Taux d\'Ouverture',
      value: openRate,
      icon: Eye,
      format: 'percentage' as const,
      description: `${kpis.opens.toLocaleString('fr-FR')} ouvertures uniques`,
      highlight: openRate > 25, // Highlight if above industry average
    },
    {
      title: 'Taux de Clic',
      value: clickRate,
      icon: MousePointer,
      format: 'percentage' as const,
      description: `${kpis.clicks.toLocaleString('fr-FR')} clics enregistrés`,
      highlight: clickRate > 3,
    },
    {
      title: 'Taux de Réponse',
      value: replyRate,
      icon: Reply,
      format: 'percentage' as const,
      description: `${kpis.replies.toLocaleString('fr-FR')} réponses reçues`,
      highlight: replyRate > 2,
    },
    {
      title: 'Prospects Intéressés',
      value: kpis.interested,
      icon: Heart,
      format: 'number' as const,
      description: 'Marqués comme intéressés par l\'IA',
      highlight: kpis.interested > 0,
    },
    {
      title: 'Taux de Bounce',
      value: bounceRate,
      icon: AlertTriangle,
      format: 'percentage' as const,
      description: `${kpis.bounces.toLocaleString('fr-FR')} emails rejetés`,
    },
    {
      title: 'Désabonnements',
      value: unsubRate,
      icon: UserX,
      format: 'percentage' as const,
      description: `${kpis.unsubs.toLocaleString('fr-FR')} désabonnements`,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold caps">Performance Overview</h2>
          <p className="text-brand-muted typography-editorial">
            Métriques clés pour la période sélectionnée
          </p>
        </div>
        {kpis.computedAt && (
          <div className="text-sm text-brand-muted editorial-prefix">
            Mise à jour: {new Date(kpis.computedAt).toLocaleDateString('fr-FR')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>
    </div>
  )
}