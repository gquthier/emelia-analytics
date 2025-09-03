'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp } from 'lucide-react'
import { PerformanceToolbar } from '@/components/dashboard/PerformanceToolbar'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface TimeSeriesDataPoint {
  date: string
  sent: number
  delivered: number
  opens: number
  clicks: number
  replies: number
  bounces: number
}

interface TimeSeriesChartProps {
  clientId: string
  height?: number
}

// Colors matching our design tokens
const METRIC_COLORS = {
  sent: 'rgb(107, 114, 128)', // gray-500
  delivered: 'rgb(59, 130, 246)', // blue-500  
  opens: 'rgb(37, 99, 235)', // accent
  clicks: 'rgb(245, 158, 11)', // amber-500
  replies: 'rgb(34, 197, 94)', // green-500
  bounces: 'rgb(239, 68, 68)', // red-500
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-80 w-full" />
      </CardContent>
    </Card>
  )
}

function EmptyChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="caps">Évolution Temporelle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-brand-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-brand-muted" />
            </div>
            <h3 className="font-semibold text-brand mb-2">Pas de données temporelles</h3>
            <p className="text-brand-muted text-sm">
              Les données apparaîtront après la première synchronisation
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-brand-card border border-brand-border p-3 rounded-lg shadow-lg">
        <p className="font-medium text-brand mb-2">
          {format(parseISO(label), 'dd MMMM yyyy', { locale: fr })}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-brand-muted">{entry.name}:</span>
            <span className="font-medium text-brand">
              {entry.value.toLocaleString('fr-FR')}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function TimeSeriesChart({ clientId, height = 400 }: TimeSeriesChartProps) {
  const [data, setData] = useState<TimeSeriesDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetrics, setSelectedMetrics] = useState(['opens', 'clicks', 'replies'])
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [showSmoothing, setShowSmoothing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [clientId, groupBy])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/${clientId}/timeline?groupBy=${groupBy}`)
      if (!response.ok) throw new Error('Failed to fetch timeline data')
      
      const result = await response.json()
      setData(result.timeline || [])
    } catch (error) {
      console.error('Error fetching timeline:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const csvContent = [
      ['Date', ...selectedMetrics.map(m => m.charAt(0).toUpperCase() + m.slice(1))],
      ...data.map(row => [
        format(parseISO(row.date), 'yyyy-MM-dd'),
        ...selectedMetrics.map(metric => row[metric as keyof TimeSeriesDataPoint])
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timeline-${clientId}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <ChartSkeleton />
  }

  if (!data.length) {
    return <EmptyChart />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="caps">Évolution Temporelle</CardTitle>
              <p className="text-brand-muted typography-editorial mt-1">
                Performance sur les {data.length} derniers points
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <PerformanceToolbar
              selectedMetrics={selectedMetrics}
              onMetricsChange={setSelectedMetrics}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              onExport={handleExport}
              showSmoothing={showSmoothing}
              onSmoothingChange={setShowSmoothing}
            />

            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="rgb(var(--brand-border))"
                    opacity={0.3}
                  />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(value) => format(parseISO(value), 'dd/MM', { locale: fr })}
                    stroke="rgb(var(--brand-muted))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgb(var(--brand-muted))"
                    fontSize={12}
                    tickFormatter={(value) => value.toLocaleString('fr-FR')}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ 
                      paddingTop: '20px', 
                      fontSize: '14px',
                      color: 'rgb(var(--brand-muted))'
                    }}
                  />
                  
                  {selectedMetrics.map((metric) => (
                    <Line
                      key={metric}
                      type={showSmoothing ? "monotone" : "linear"}
                      dataKey={metric}
                      stroke={METRIC_COLORS[metric as keyof typeof METRIC_COLORS]}
                      strokeWidth={2}
                      dot={{ fill: METRIC_COLORS[metric as keyof typeof METRIC_COLORS], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: METRIC_COLORS[metric as keyof typeof METRIC_COLORS], strokeWidth: 2 }}
                      name={metric.charAt(0).toUpperCase() + metric.slice(1)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}