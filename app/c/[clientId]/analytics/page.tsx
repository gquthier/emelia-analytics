import { Suspense } from 'react'
import { InsightsCards } from '@/components/analytics/InsightsCards'
import { ResponsesAnalysis } from '@/components/analytics/ResponsesAnalysis'
import { PerformanceInsights } from '@/components/analytics/PerformanceInsights'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

interface AnalyticsPageProps {
  params: Promise<{ clientId: string }>
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { clientId } = await params

  // Get client with comprehensive data for AI insights
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      kpis: true,
      campaigns: {
        include: {
          threads: {
            include: {
              messages: true
            }
          }
        }
      }
    }
  })

  if (!client) {
    notFound()
  }

  // Calculate total threads and messages for insights
  const totalThreads = client.campaigns.reduce((acc, campaign) => acc + campaign.threads.length, 0)
  const totalMessages = client.campaigns.reduce((acc, campaign) => 
    acc + campaign.threads.reduce((threadAcc, thread) => threadAcc + thread.messages.length, 0), 0)

  return (
    <div className="space-y-8">
      {/* AI Insights Cards */}
      <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>}>
        <InsightsCards 
          kpis={client.kpis} 
          totalThreads={totalThreads}
          totalMessages={totalMessages}
        />
      </Suspense>

      {/* Two-column layout for detailed insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Responses Analysis */}
        <div>
          <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse" />}>
            <ResponsesAnalysis 
              campaigns={client.campaigns}
              clientId={clientId}
            />
          </Suspense>
        </div>

        {/* Performance Insights */}
        <div>
          <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse" />}>
            <PerformanceInsights 
              kpis={client.kpis}
              campaigns={client.campaigns}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}