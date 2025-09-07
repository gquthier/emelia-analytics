import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface ClientKpis {
  sent: number
  delivered: number
  opens: number
  clicks: number
  replies: number
  bounces: number
  unsubs: number
  interested: number
}

interface KPICardsProps {
  kpis: ClientKpis | null
}

export function KPICards({ kpis }: KPICardsProps) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">--</div>
                <div className="text-sm text-gray-500">En cours de synchronisation...</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Delivered emails are now already correctly calculated (excluding bounces) in the sync process
  const openRate = kpis.delivered > 0 ? (kpis.opens / kpis.delivered * 100) : 0
  const clickRate = kpis.delivered > 0 ? (kpis.clicks / kpis.delivered * 100) : 0
  const replyRate = kpis.delivered > 0 ? (kpis.replies / kpis.delivered * 100) : 0
  const interestedRate = kpis.delivered > 0 ? (kpis.interested / kpis.delivered * 100) : 0

  const kpiItems = [
    { label: 'Envoyés', value: kpis.sent, color: 'text-blue-600' },
    { label: 'Délivrés', value: kpis.delivered, color: 'text-green-600' },
    { label: 'Taux d\'ouverture', value: `${openRate.toFixed(1)}%`, color: 'text-purple-600' },
    { label: 'Taux de clic', value: `${clickRate.toFixed(1)}%`, color: 'text-indigo-600' },
    { label: 'Taux de réponse', value: `${replyRate.toFixed(1)}%`, color: 'text-cyan-600' },
    { label: 'Intéressés', value: `${interestedRate.toFixed(1)}%`, color: 'text-violet-600' },
    { label: 'Bounces', value: kpis.bounces, color: 'text-red-600' },
    { label: 'Désabonnements', value: kpis.unsubs, color: 'text-orange-600' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpiItems.map((kpi, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${kpi.color}`}>
                {kpi.value}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {kpi.label}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}