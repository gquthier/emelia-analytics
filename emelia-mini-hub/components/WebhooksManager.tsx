'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Webhook {
  id: string
  emeliaId?: string
  url: string
  campaignType: string
  events: string[]
  isActive: boolean
  secret: string
  createdAt: string
  updatedAt: string
  lastTriggered?: string
  totalDeliveries: number
  lastDeliveries: WebhookDelivery[]
}

interface WebhookDelivery {
  id: string
  event: string
  processed: boolean
  error?: string
  receivedAt: string
  processedAt?: string
  payload: any
}

interface WebhooksManagerProps {
  clientId: string
  clientName: string
}

const CAMPAIGN_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'linkedin', label: 'LinkedIn' }
]

const EVENTS = [
  { value: 'REPLIED', label: 'Réponses' },
  { value: 'SENT', label: 'Envois' },
  { value: 'OPENED', label: 'Ouvertures' },
  { value: 'CLICKED', label: 'Clics' },
  { value: 'BOUNCED', label: 'Bounces' },
  { value: 'UNSUBSCRIBED', label: 'Désabonnements' }
]

export function WebhooksManager({ clientId, clientName }: WebhooksManagerProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedCampaignType, setSelectedCampaignType] = useState<string>('email')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['REPLIED'])
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)

  useEffect(() => {
    fetchWebhooks()
  }, [clientId])

  const fetchWebhooks = async () => {
    try {
      const response = await fetch(`/api/client/${clientId}/webhooks`)
      const data = await response.json()
      setWebhooks(data.webhooks || [])
    } catch (error) {
      console.error('Erreur lors du chargement des webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const createWebhook = async () => {
    if (selectedEvents.length === 0) {
      alert('Sélectionnez au moins un événement')
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`/api/client/${clientId}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignType: selectedCampaignType,
          events: selectedEvents
        })
      })

      if (response.ok) {
        await fetchWebhooks()
        setSelectedEvents(['REPLIED'])
        setSelectedCampaignType('email')
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Erreur lors de la création du webhook:', error)
      alert('Erreur lors de la création du webhook')
    } finally {
      setCreating(false)
    }
  }

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/client/${clientId}/webhooks/${webhookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        await fetchWebhooks()
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du webhook:', error)
    }
  }

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce webhook ?')) {
      return
    }

    try {
      const response = await fetch(`/api/client/${clientId}/webhooks/${webhookId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchWebhooks()
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du webhook:', error)
    }
  }

  const toggleEventSelection = (event: string) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter(e => e !== event))
    } else {
      setSelectedEvents([...selectedEvents, event])
    }
  }

  if (loading) {
    return <div className="p-4">Chargement des webhooks...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Webhooks - {clientName}</h2>
      </div>

      {/* Formulaire de création */}
      <Card>
        <CardHeader>
          <CardTitle>Créer un nouveau webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Type de campagne</label>
            <div className="flex gap-2">
              {CAMPAIGN_TYPES.map(type => (
                <Button
                  key={type.value}
                  size="sm"
                  variant={selectedCampaignType === type.value ? "default" : "outline"}
                  onClick={() => setSelectedCampaignType(type.value)}
                  disabled={creating || webhooks.some(w => w.campaignType === type.value)}
                >
                  {type.label}
                  {webhooks.some(w => w.campaignType === type.value) && ' ✓'}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Événements à écouter</label>
            <div className="flex flex-wrap gap-2">
              {EVENTS.map(event => (
                <Button
                  key={event.value}
                  size="sm"
                  variant={selectedEvents.includes(event.value) ? "default" : "outline"}
                  onClick={() => toggleEventSelection(event.value)}
                  disabled={creating}
                >
                  {event.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Recommandé: Sélectionner uniquement "Réponses" pour des performances optimales
            </p>
          </div>

          <Button 
            onClick={createWebhook} 
            disabled={creating || selectedEvents.length === 0}
            className="w-full"
          >
            {creating ? 'Création...' : 'Créer le webhook'}
          </Button>
        </CardContent>
      </Card>

      {/* Liste des webhooks */}
      {webhooks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Webhooks configurés</h3>
          {webhooks.map(webhook => (
            <Card key={webhook.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold capitalize">{webhook.campaignType}</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        webhook.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {webhook.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Événements: {webhook.events.join(', ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      URL: {webhook.url}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleWebhook(webhook.id, webhook.isActive)}
                    >
                      {webhook.isActive ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedWebhook(webhook)}
                    >
                      Détails
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Créé:</span>
                    <br />
                    {formatDistanceToNow(new Date(webhook.createdAt), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </div>
                  <div>
                    <span className="font-medium">Dernière activité:</span>
                    <br />
                    {webhook.lastTriggered 
                      ? formatDistanceToNow(new Date(webhook.lastTriggered), { 
                          addSuffix: true, 
                          locale: fr 
                        })
                      : 'Jamais'
                    }
                  </div>
                  <div>
                    <span className="font-medium">Livraisons:</span>
                    <br />
                    {webhook.totalDeliveries} total
                  </div>
                </div>

                {webhook.emeliaId && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <span className="font-medium">ID Emelia:</span> {webhook.emeliaId}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal des détails */}
      {selectedWebhook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Détails du webhook - {selectedWebhook.campaignType}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedWebhook(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Informations générales</h4>
                <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                  <div><strong>ID:</strong> {selectedWebhook.id}</div>
                  <div><strong>URL:</strong> {selectedWebhook.url}</div>
                  <div><strong>Événements:</strong> {selectedWebhook.events.join(', ')}</div>
                  <div><strong>Statut:</strong> {selectedWebhook.isActive ? 'Actif' : 'Inactif'}</div>
                  {selectedWebhook.emeliaId && (
                    <div><strong>ID Emelia:</strong> {selectedWebhook.emeliaId}</div>
                  )}
                </div>
              </div>

              {selectedWebhook.lastDeliveries.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Dernières livraisons</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedWebhook.lastDeliveries.map(delivery => (
                      <div key={delivery.id} className="bg-gray-50 p-3 rounded text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{delivery.event}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              delivery.processed 
                                ? 'bg-green-100 text-green-800' 
                                : delivery.error
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {delivery.processed ? 'Traité' : delivery.error ? 'Erreur' : 'En attente'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(delivery.receivedAt), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </span>
                          </div>
                        </div>
                        {delivery.error && (
                          <div className="text-red-600 text-xs">
                            Erreur: {delivery.error}
                          </div>
                        )}
                        {delivery.payload?.contact?.email && (
                          <div className="text-xs text-gray-600">
                            Contact: {delivery.payload.contact.email}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}