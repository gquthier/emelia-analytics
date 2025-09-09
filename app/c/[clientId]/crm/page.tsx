import { supabaseClients } from '@/lib/supabase-adapter'
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
      <div className="max-w-7xl mx-auto px-4 py-8 relative">
        {/* Overlay avec flou */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Coming Soon</h2>
            <p className="text-lg text-gray-600">La fonctionnalité CRM sera bientôt disponible</p>
          </div>
        </div>
        
        {/* Contenu flouté en arrière-plan */}
        <div className="filter blur-sm">
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">Pipeline CRM</h1>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                Nouveau prospect
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Prospects</h3>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded shadow">
                    <div className="font-medium">Contact exemple 1</div>
                    <div className="text-sm text-gray-600">company@example.com</div>
                  </div>
                  <div className="bg-white p-3 rounded shadow">
                    <div className="font-medium">Contact exemple 2</div>
                    <div className="text-sm text-gray-600">contact@sample.com</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Qualifiés</h3>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded shadow">
                    <div className="font-medium">Lead qualifié</div>
                    <div className="text-sm text-gray-600">lead@example.com</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Négociation</h3>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded shadow">
                    <div className="font-medium">Deal en cours</div>
                    <div className="text-sm text-gray-600">deal@company.com</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Conclus</h3>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded shadow">
                    <div className="font-medium">Client final</div>
                    <div className="text-sm text-gray-600">client@success.com</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}