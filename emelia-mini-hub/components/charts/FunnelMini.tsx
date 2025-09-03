'use client'

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  CheckCircle, 
  Eye, 
  MousePointer, 
  Reply, 
  Heart,
  ArrowRight,
  TrendingDown
} from 'lucide-react'

interface FunnelData {
  delivered: number
  opens: number
  clicks: number
  replies: number
  interested: number
}

interface FunnelMiniProps {
  data: FunnelData
  loading?: boolean
}

interface FunnelStepProps {
  label: string
  value: number
  total: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  isLast?: boolean
}

function FunnelStep({ label, value, total, icon: Icon, color, isLast }: FunnelStepProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0
  const width = Math.max(percentage, 5) // Minimum 5% width for visibility

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4`} style={{ color }} />
            <span className="text-sm font-medium text-brand">{label}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-brand">{value.toLocaleString('fr-FR')}</span>
            <span className="text-brand-muted">({percentage.toFixed(1)}%)</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div 
            className="h-3 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${width}%`, 
              backgroundColor: color,
              opacity: 0.8
            }}
          />
        </div>
      </div>
      
      {!isLast && (
        <ArrowRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
      )}
    </div>
  )
}

function FunnelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function FunnelMini({ data, loading }: FunnelMiniProps) {
  const funnelSteps = useMemo(() => [
    {
      key: 'delivered',
      label: 'Délivrés',
      value: data.delivered,
      icon: CheckCircle,
      color: 'rgb(59, 130, 246)' // blue-500
    },
    {
      key: 'opens',
      label: 'Ouvertures',
      value: data.opens,
      icon: Eye,
      color: 'rgb(37, 99, 235)' // accent
    },
    {
      key: 'clicks', 
      label: 'Clics',
      value: data.clicks,
      icon: MousePointer,
      color: 'rgb(245, 158, 11)' // amber-500
    },
    {
      key: 'replies',
      label: 'Réponses',
      value: data.replies,
      icon: Reply,
      color: 'rgb(34, 197, 94)' // green-500
    },
    {
      key: 'interested',
      label: 'Intéressés',
      value: data.interested,
      icon: Heart,
      color: 'rgb(239, 68, 68)' // red-500 (as it represents the final conversion)
    }
  ], [data])

  const conversionRate = useMemo(() => {
    if (data.delivered === 0) return 0
    return (data.interested / data.delivered) * 100
  }, [data])

  const dropOffPoint = useMemo(() => {
    const steps = [data.delivered, data.opens, data.clicks, data.replies, data.interested]
    let maxDrop = 0
    let dropStage = ''
    
    for (let i = 1; i < steps.length; i++) {
      const current = steps[i]
      const previous = steps[i - 1]
      if (previous > 0) {
        const dropRate = ((previous - current) / previous) * 100
        if (dropRate > maxDrop) {
          maxDrop = dropRate
          dropStage = funnelSteps[i].label
        }
      }
    }
    
    return { rate: maxDrop, stage: dropStage }
  }, [data, funnelSteps])

  if (loading) {
    return <FunnelSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="caps flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Pipeline de Conversion
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-brand-muted typography-editorial">
            Du premier contact à la conversion
          </p>
          <div className="text-right">
            <div className="text-lg font-bold text-brand">
              {conversionRate.toFixed(2)}%
            </div>
            <div className="text-xs text-brand-muted">Taux global</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {funnelSteps.map((step, index) => (
            <FunnelStep
              key={step.key}
              label={step.label}
              value={step.value}
              total={data.delivered}
              icon={step.icon}
              color={step.color}
              isLast={index === funnelSteps.length - 1}
            />
          ))}
        </div>

        {/* Insights */}
        {dropOffPoint.rate > 50 && (
          <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingDown className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-brand caps text-sm">
                  Point de friction détecté
                </h4>
                <p className="text-sm text-brand-muted mt-1">
                  {dropOffPoint.rate.toFixed(1)}% de perte au niveau "{dropOffPoint.stage}". 
                  Considérez optimiser cette étape.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}