'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Database
} from 'lucide-react'

interface HistoricalSyncButtonProps {
  clientId: string
  clientName?: string
}

export function HistoricalSyncButton({ clientId, clientName }: HistoricalSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleHistoricalSync = async () => {
    if (isLoading) return
    
    // Confirm action since this is a heavy operation
    const confirmed = confirm(
      `⚠️ SYNCHRONISATION HISTORIQUE COMPLÈTE\n\n` +
      `Cette opération va récupérer TOUTES les réponses historiques depuis l'API Emelia.\n` +
      `Cela peut prendre plusieurs minutes selon le volume de données.\n\n` +
      `Voulez-vous continuer ?`
    )
    
    if (!confirmed) return

    setIsLoading(true)
    setResult(null)
    setError(null)
    
    try {
      console.log(`🚀 Starting historical sync for client ${clientId}`)
      
      const response = await fetch(`/api/client/${clientId}/historical-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setResult(data.results)
        console.log('✅ Historical sync completed:', data.results)
        
        // Show success notification
        alert(
          `🎉 SYNCHRONISATION HISTORIQUE TERMINÉE !\n\n` +
          `📊 ${data.results.totalRepliesProcessed} réponses traitées\n` +
          `➕ ${data.results.newRepliesAdded} nouvelles réponses ajoutées\n` +
          `📈 ${data.results.campaignsSynced} campagnes synchronisées\n\n` +
          `Les données sont maintenant disponibles dans l'onglet Réponses.`
        )
        
        // Refresh the page to show new data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
        
      } else {
        throw new Error(data.error || 'Erreur lors de la synchronisation')
      }
      
    } catch (error) {
      console.error('❌ Historical sync failed:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
      
      alert(
        `❌ ERREUR DE SYNCHRONISATION\n\n` +
        `${error instanceof Error ? error.message : 'Erreur inconnue'}\n\n` +
        `Veuillez vérifier la console pour plus de détails.`
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleHistoricalSync}
        disabled={isLoading}
        variant={result ? "outline" : "default"}
        size="sm"
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Synchronisation...
          </>
        ) : result ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-600" />
            Synchronisé
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Sync Historique
          </>
        )}
      </Button>
      
      {/* Status indicator */}
      {result && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">
          <Database className="w-3 h-3" />
          <span>+{result.newRepliesAdded} réponses</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-1 rounded-full">
          <AlertCircle className="w-3 h-3" />
          <span>Erreur</span>
        </div>
      )}
      
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          <span>En cours...</span>
        </div>
      )}
    </div>
  )
}