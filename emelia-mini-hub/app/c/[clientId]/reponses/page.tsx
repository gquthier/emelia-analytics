import { Suspense } from 'react'
import { ThreadsPane } from '@/components/inbox/ThreadsPane'
import { MessagePreviewPane } from '@/components/inbox/MessagePreviewPane'
// Utilisation temporaire de l'adaptateur Supabase au lieu de Prisma direct
import { getClientWithThreadsAndMessages } from '@/lib/supabase-adapter'
import { notFound } from 'next/navigation'

interface ResponsesPageProps {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ threadId?: string }>
}

export default async function ResponsesPage({ params, searchParams }: ResponsesPageProps) {
  const { clientId } = await params
  const resolvedSearchParams = await searchParams
  const { threadId } = resolvedSearchParams || {}

  // Get client with threads and messages
  const client = await getClientWithThreadsAndMessages(clientId)

  if (!client) {
    notFound()
  }

  // Flatten threads from all campaigns
  const allThreads = client.campaigns.flatMap(campaign => 
    campaign.threads.map(thread => ({
      ...thread,
      campaignName: campaign.name
    }))
  )

  // Filter threads that have responses
  const threadsWithResponses = allThreads.filter(thread => 
    thread.messages.length > 0
  )

  const selectedThreadId = threadId
  const selectedThread = selectedThreadId 
    ? threadsWithResponses.find(t => t.id === selectedThreadId)
    : null

  return (
    <div className="h-full flex">
      {/* Left Column - Threads List (1/3) */}
      <div className="w-1/3 border-r border-gray-200 bg-brand-bg">
        <Suspense fallback={
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        }>
          <ThreadsPane 
            threads={threadsWithResponses}
            clientId={clientId}
            selectedThreadId={selectedThreadId}
          />
        </Suspense>
      </div>

      {/* Right Column - Message Preview (2/3) */}
      <div className="flex-1">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-4 w-32 mx-auto bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        }>
          <MessagePreviewPane 
            thread={selectedThread}
            clientId={clientId}
          />
        </Suspense>
      </div>
    </div>
  )
}