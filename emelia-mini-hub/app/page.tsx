import { ClientForm } from '@/components/ClientForm'
import { ClientList } from '@/components/ClientList'
import { GlobalSyncButton } from '@/components/GlobalSyncButton'
import { AdminLogin } from '@/components/AdminLogin'
// import { AdminLogout } from '@/components/AdminLogout'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default async function Home() {
  // Vérifier l'authentification admin
  const adminSession = await getAdminSession()

  if (!adminSession) {
    // Si pas connecté, afficher la page de connexion
    return <AdminLogin />
  }

  // Si connecté, afficher le dashboard admin
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">Emelia Mini-Hub</h1>
              <p className="text-gray-600">Gérez vos clients et leurs campagnes Emelia</p>
            </div>
            <div className="flex items-center gap-4">
              <GlobalSyncButton />
              <Link 
                href="/settings"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-600"
              >
                <Settings className="w-4 h-4" />
                Paramètres
              </Link>
              <div className="text-sm text-gray-600">
                Admin connecté
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <ClientForm />
          </div>
          <div>
            <ClientList clients={clients} />
          </div>
        </div>
      </div>
    </div>
  )
}
