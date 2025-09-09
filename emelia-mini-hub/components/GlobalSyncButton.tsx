'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'

interface SyncResult {
  clientId: string
  name: string
  code3: string
  status: 'success' | 'error'
  error?: string
  syncedAt?: string
}

interface SyncResponse {
  message: string
  totalClients: number
  successCount: number
  errorCount: number
  results: SyncResult[]
}

export function GlobalSyncButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<SyncResponse | null>(null)
  const [showResults, setShowResults] = useState(false)

  const handleSync = async () => {
    setIsLoading(true)
    setShowResults(false)
    
    try {
      const response = await fetch('/api/sync-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setLastSync(data)
      setShowResults(true)
      
      // Auto-hide results after 10 seconds
      setTimeout(() => setShowResults(false), 10000)
    } catch (error) {
      console.error('Sync error:', error)
      setLastSync({
        message: 'Erreur lors de la synchronisation',
        totalClients: 0,
        successCount: 0,
        errorCount: 1,
        results: []
      })
      setShowResults(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSync}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Synchronisation en cours...' : 'Synchroniser tous les clients'}
        </Button>
        
        {lastSync && !showResults && (
          <button
            onClick={() => setShowResults(true)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Voir les derniers résultats
          </button>
        )}
      </div>

      {showResults && lastSync && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Résultats de la synchronisation
            </h3>
            <button
              onClick={() => setShowResults(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {lastSync.message}
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">{lastSync.totalClients}</div>
              <div className="text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{lastSync.successCount}</div>
              <div className="text-gray-500">Succès</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{lastSync.errorCount}</div>
              <div className="text-gray-500">Erreurs</div>
            </div>
          </div>

          {lastSync.results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-sm">Détails par client:</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {lastSync.results.map((result) => (
                  <div key={result.clientId} className="flex items-center gap-2 text-sm">
                    {result.status === 'success' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-medium">{result.name}</span>
                    <span className="text-gray-500">({result.code3})</span>
                    {result.error && (
                      <span className="text-red-600 text-xs">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}