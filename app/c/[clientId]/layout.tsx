import { notFound } from 'next/navigation'
import { Suspense } from 'react'
// Utilisation temporaire de l'adaptateur Supabase au lieu de Prisma direct
import { supabaseClients } from '@/lib/supabase-adapter'
import { verifyShareToken } from '@/lib/auth'
import { ClientNavigation } from '@/components/client/ClientNavigation'
import { ClientHeader } from '@/components/client/ClientHeader'

interface ClientLayoutProps {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ token?: string; tab?: string }>
}

export default async function ClientLayout({ 
  children, 
  params, 
  searchParams 
}: ClientLayoutProps) {
  const { clientId } = await params
  const resolvedSearchParams = await searchParams
  const { token, tab } = resolvedSearchParams || {}

  // Verify token if provided (for shared links)
  if (token && !verifyShareToken(token, clientId)) {
    notFound()
  }

  const client = await supabaseClients.findUnique({
    where: { id: clientId },
    include: {
      kpis: true,
    }
  })

  if (!client) {
    notFound()
  }

  const isViewerMode = !!token

  return (
    <div className="saas-expand-app">
      <ClientHeader 
        client={client}
        isViewerMode={isViewerMode}
      />
      
      <div className="border-b border-brand-border">
        <div className="max-w-7xl mx-auto">
          <ClientNavigation 
            clientId={clientId}
            activeTab={tab || 'dashboard'}
            isViewerMode={isViewerMode}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Suspense fallback={<div className="animate-pulse">Chargement...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}