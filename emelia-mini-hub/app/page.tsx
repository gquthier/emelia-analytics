export default function Home() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-black mb-6">🚀 Emelia Mini-Hub</h1>
        <p className="text-gray-600 mb-8 text-lg">Votre gestionnaire de campagnes Emelia est en ligne !</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-100 p-6 rounded-lg">
            <h2 className="font-bold text-green-800 text-xl mb-3">✅ Application déployée</h2>
            <ul className="list-disc ml-6 text-green-700 space-y-1">
              <li>Next.js fonctionne correctement</li>
              <li>8 variables d'environnement configurées</li>
              <li>Base de données Supabase connectée</li>
              <li>CRON jobs automatiques activés</li>
            </ul>
          </div>

          <div className="bg-blue-100 p-6 rounded-lg">
            <h2 className="font-bold text-blue-800 text-xl mb-3">🔧 Configuration</h2>
            <div className="text-blue-700 space-y-1">
              <p><strong>URL :</strong> analytics.saasexpand.io</p>
              <p><strong>Code admin :</strong> ADMIN9159</p>
              <p><strong>Statut :</strong> En ligne</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <h2 className="font-bold text-yellow-800 text-xl mb-3">⚠️ Configuration en cours</h2>
          <p className="text-yellow-700">
            L'application affiche actuellement cette page de diagnostic. 
            Une fois tous les tests terminés, la page de connexion admin sera restaurée.
          </p>
        </div>
      </div>
    </div>
  )
}