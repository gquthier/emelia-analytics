import { prisma } from '@/lib/db'
import { CRMPipeline } from '@/components/CRMPipeline'
import { notFound } from 'next/navigation'

export default async function CRMPage({ 
  params 
}: { 
  params: { clientId: string } 
}) {
  const clientId = params.clientId

  // Récupérer les informations du client
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      code3: true
    }
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