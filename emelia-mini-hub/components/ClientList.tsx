'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { WebhooksManager } from './WebhooksManager'

interface Client {
  id: string
  name: string
  code3: string
  createdAt: Date
  lastSyncAt: Date | null
}

interface ClientListProps {
  clients: Client[]
}

export function ClientList({ clients }: ClientListProps) {
  const [selectedClientForWebhooks, setSelectedClientForWebhooks] = useState<Client | null>(null)

  const createShareLink = async (clientId: string) => {
    const response = await fetch(`/api/client/${clientId}/share-link`, {
      method: 'POST'
    })
    const result = await response.json()
    await navigator.clipboard.writeText(result.shareLink)
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Aucun client ajouté pour le moment
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clients ({clients.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clients.map((client) => (
            <div key={client.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-black">{client.name}</h3>
                  <p className="text-sm text-gray-600">
                    Code: <span className="font-mono font-medium">{client.code3}</span>
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {client.lastSyncAt ? (
                    <>
                      Dernière sync:<br />
                      {formatDistanceToNow(new Date(client.lastSyncAt), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </>
                  ) : (
                    'Pas encore synchronisé'
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Link href={`/c/${client.id}`}>
                  <Button size="sm" variant="default">
                    Ouvrir dashboard
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createShareLink(client.id)}
                >
                  Copier lien partagé
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedClientForWebhooks(client)}
                >
                  Gérer webhooks
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Modal de gestion des webhooks */}
      {selectedClientForWebhooks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Gestion des webhooks</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClientForWebhooks(null)}
              >
                ✕
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <WebhooksManager 
                clientId={selectedClientForWebhooks.id}
                clientName={selectedClientForWebhooks.name}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}