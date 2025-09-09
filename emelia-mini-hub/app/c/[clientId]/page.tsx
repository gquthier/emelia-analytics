import { Suspense } from 'react'
import { KPICards } from '@/components/dashboard/KPICards'
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart'
import { FunnelMini } from '@/components/charts/FunnelMini'
// Utilisation temporaire de l'adaptateur Supabase au lieu de Prisma direct
import { supabaseClients } from '@/lib/supabase-adapter'
import { notFound } from 'next/navigation'

interface DashboardPageProps {
  params: Promise<{ clientId: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { clientId } = await params

  // Get client with KPIs
  const client = await supabaseClients.findUnique({
    where: { id: clientId },
    include: {
      kpis: true
    }
  })

  if (!client) {
    notFound()
  }

  return (
    <div className="space-y-8">
      {/* KPIs Section */}
      <Suspense fallback={<KPICards kpis={null} loading />}>
        <KPICards kpis={client.kpis} />
      </Suspense>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Series Chart - Takes 2/3 of the width */}
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="animate-pulse bg-gray-100 h-96 rounded-lg" />}>
            <TimeSeriesChart clientId={clientId} />
          </Suspense>
        </div>

        {/* Funnel Chart - Takes 1/3 of the width */}
        <div className="lg:col-span-1">
          <Suspense fallback={<div className="animate-pulse bg-gray-100 h-96 rounded-lg" />}>
            <FunnelMini 
              data={{
                delivered: client.kpis?.delivered || 0,
                opens: client.kpis?.opens || 0,
                clicks: client.kpis?.clicks || 0,
                replies: client.kpis?.replies || 0,
                interested: client.kpis?.interested || 0
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}