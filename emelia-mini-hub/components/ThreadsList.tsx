'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThreadDrawer } from '@/components/ThreadDrawer'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Thread {
  id: string
  prospectEmail: string
  subject: string | null
  lastAt: Date | null
  label: string | null
  confidence: number | null
  campaign: {
    name: string
  }
  messages: Array<{
    id: string
    direction: string
    at: Date
    fromAddr: string | null
    toAddr: string | null
    text: string
  }>
}

interface ThreadsListProps {
  threads: Thread[]
}

const LABELS = {
  INTERESSE: { label: 'Intéressé', color: 'bg-green-100 text-green-800' },
  A_RAPPELER: { label: 'À rappeler', color: 'bg-blue-100 text-blue-800' },
  NEUTRE: { label: 'Neutre', color: 'bg-gray-100 text-gray-800' },
  PAS_INTERESSE: { label: 'Pas intéressé', color: 'bg-red-100 text-red-800' },
  INJOIGNABLE: { label: 'Injoignable', color: 'bg-orange-100 text-orange-800' },
  OPT_OUT: { label: 'Opt-out', color: 'bg-purple-100 text-purple-800' },
}

export function ThreadsList({ threads }: ThreadsListProps) {
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLabel, setSelectedLabel] = useState<string>('')

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = !searchQuery || 
      thread.prospectEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesLabel = !selectedLabel || thread.label === selectedLabel
    
    return matchesSearch && matchesLabel
  })

  const getMessagePreview = (thread: Thread) => {
    const lastMessage = thread.messages[thread.messages.length - 1]
    if (!lastMessage) return 'Aucun message'
    
    const preview = lastMessage.text.substring(0, 100)
    return preview.length < lastMessage.text.length ? preview + '...' : preview
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Réponses ({filteredThreads.length})</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
              <select
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Tous les labels</option>
                {Object.entries(LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredThreads.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {threads.length === 0 ? 'Aucune réponse trouvée' : 'Aucune réponse ne correspond à vos critères'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedThread(thread)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-black">
                          {thread.prospectEmail}
                        </span>
                        {thread.label && (
                          <span className={`px-2 py-1 rounded text-xs ${LABELS[thread.label as keyof typeof LABELS]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {LABELS[thread.label as keyof typeof LABELS]?.label || thread.label}
                            {thread.confidence && ` (${Math.round(thread.confidence * 100)}%)`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {thread.subject || 'Sans objet'}
                      </p>
                      <p className="text-sm text-gray-500 mb-1">
                        Campagne: {thread.campaign.name}
                      </p>
                      <p className="text-sm text-gray-700">
                        {getMessagePreview(thread)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {thread.lastAt && (
                        <>
                          Dernière activité:<br />
                          {formatDistanceToNow(new Date(thread.lastAt), {
                            addSuffix: true,
                            locale: fr
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ThreadDrawer
        thread={selectedThread}
        isOpen={!!selectedThread}
        onClose={() => setSelectedThread(null)}
      />
    </>
  )
}