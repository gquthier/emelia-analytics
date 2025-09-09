import { supabaseClients } from '@/lib/supabase-adapter'
import { CRMPipeline } from '@/components/CRMPipeline'
import { notFound } from 'next/navigation'

export default async function CRMPage({ 
  params 
}: { 
  params: Promise<{ clientId: string }> 
}) {
  const { clientId } = await params

  // Récupérer les informations du client
  const client = await supabaseClients.findUnique({
    where: { id: clientId }
  })

  if (!client) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <CRMPipeline clientId={clientId} clientName={client.name} />
      </div>
    </div>
  )
}