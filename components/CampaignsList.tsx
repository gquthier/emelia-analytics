'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'

interface Campaign {
  id: string
  emeliaId: string
  name: string
  createdAt: Date | string
  lastEventAt?: Date | string
  _count?: {
    threads: number
  }
  stats?: {
    totalThreads: number
    totalMessages: number
    inboundMessages: number
    outboundMessages: number
    latestActivity?: string
    emelia?: {
      sent: number
      delivered: number
      opens: number
      clicks: number
      replies: number
      bounces: number
      unsubscribes: number
    } | null
  }
}

interface CampaignWithStats extends Campaign {
  stats: {
    totalThreads: number
    totalMessages: number
    inboundMessages: number
    outboundMessages: number
    latestActivity?: string
    emelia?: {
      sent: number
      delivered: number
      opens: number
      clicks: number
      replies: number
      bounces: number
      unsubscribes: number
    } | null
  }
}

interface CampaignsListProps {
  campaigns: Campaign[]
  clientId: string
}

export function CampaignsList({ campaigns: initialCampaigns, clientId }: CampaignsListProps) {
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCampaignsWithStats()
  }, [clientId])

  const fetchCampaignsWithStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/client/${clientId}/campaigns`)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des campagnes')
      }
      
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      // Fallback to initial campaigns if API fails
      setCampaigns(initialCampaigns.map(c => ({
        ...c,
        stats: {
          totalThreads: c._count?.threads || 0,
          totalMessages: 0,
          inboundMessages: 0,
          outboundMessages: 0
        }
      })))
    } finally {
      setLoading(false)
    }
  }
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Chargement des campagnes...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Récupération des statistiques...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Campagnes
            <button
              onClick={fetchCampaignsWithStats}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Aucune campagne trouvée</p>
            <p className="text-sm mt-2">Les campagnes contenant votre code apparaîtront ici après synchronisation</p>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Campagnes ({campaigns.length})
          <button
            onClick={fetchCampaignsWithStats}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{campaign.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">
                    ID: {campaign.emeliaId}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {campaign.stats.totalThreads} conversations
                  </Badge>
                  {campaign.stats.latestActivity && (
                    <span className="text-xs text-green-600">
                      Dernière activité: {new Date(campaign.stats.latestActivity).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  {campaign.lastEventAt && !campaign.stats.latestActivity && (
                    <span className="text-xs text-blue-600">
                      Dernière sync: {new Date(campaign.lastEventAt).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Emelia Statistics Section */}
              {campaign.stats.emelia && (
                <>
                  <div className="mt-4 mb-3 border-b pb-2">
                    <h4 className="text-sm font-semibold text-gray-700">📊 Statistiques Emelia</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <div className="text-lg font-bold text-emerald-600">
                        {campaign.stats.emelia.sent.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Envoyés</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {campaign.stats.emelia.opens.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Ouvertures</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {campaign.stats.emelia.clicks.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Clics</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {campaign.stats.emelia.replies.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Réponses</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-lg font-bold text-red-600">
                        {campaign.stats.emelia.bounces.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Bounces</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-600">
                        {campaign.stats.emelia.unsubscribes.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Désabonnements</div>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-lg">
                      <div className="text-lg font-bold text-teal-600">
                        {campaign.stats.emelia.sent > 0 ? ((campaign.stats.emelia.opens / campaign.stats.emelia.sent) * 100).toFixed(1) : '0'}%
                      </div>
                      <div className="text-xs text-gray-600">Taux d'ouverture</div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <div className="text-lg font-bold text-indigo-600">
                        {campaign.stats.emelia.sent > 0 ? ((campaign.stats.emelia.replies / campaign.stats.emelia.sent) * 100).toFixed(1) : '0'}%
                      </div>
                      <div className="text-xs text-gray-600">Taux de réponse</div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Local Database Statistics */}
              <div className="mt-4 mb-3 border-b pb-2">
                <h4 className="text-sm font-semibold text-gray-700">💬 Statistiques Locales</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {campaign.stats.totalThreads}
                  </div>
                  <div className="text-xs text-gray-600">Conversations</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {campaign.stats.totalMessages}
                  </div>
                  <div className="text-xs text-gray-600">Messages</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {campaign.stats.inboundMessages}
                  </div>
                  <div className="text-xs text-gray-600">Réponses reçues</div>
                </div>
                <div className="text-center p-3 bg-cyan-50 rounded-lg">
                  <div className="text-lg font-bold text-cyan-600">
                    {campaign.stats.outboundMessages}
                  </div>
                  <div className="text-xs text-gray-600">Emails envoyés</div>
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                Créée le: {new Date(campaign.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}