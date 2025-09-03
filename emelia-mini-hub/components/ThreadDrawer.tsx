'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { X } from 'lucide-react'

interface Message {
  id: string
  direction: string
  at: Date
  fromAddr: string | null
  toAddr: string | null
  text: string
}

interface Thread {
  id: string
  prospectEmail: string
  subject: string | null
  label: string | null
  confidence: number | null
  campaign: {
    name: string
  }
  messages: Message[]
}

interface ThreadDrawerProps {
  thread: Thread | null
  isOpen: boolean
  onClose: () => void
}

const LABELS = {
  INTERESSE: 'Intéressé',
  A_RAPPELER: 'À rappeler',
  NEUTRE: 'Neutre',
  PAS_INTERESSE: 'Pas intéressé',
  INJOIGNABLE: 'Injoignable',
  OPT_OUT: 'Opt-out',
}

export function ThreadDrawer({ thread, isOpen, onClose }: ThreadDrawerProps) {
  const [isUpdatingLabel, setIsUpdatingLabel] = useState(false)

  const updateLabel = async (newLabel: string) => {
    if (!thread) return
    
    setIsUpdatingLabel(true)
    try {
      await fetch(`/api/thread/${thread.id}/label`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel })
      })
      
      // Refresh the page to update the data
      window.location.reload()
    } catch (error) {
      console.error('Failed to update label:', error)
    } finally {
      setIsUpdatingLabel(false)
    }
  }

  if (!isOpen || !thread) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="ml-auto w-full max-w-2xl bg-white shadow-xl">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-black">
                {thread.prospectEmail}
              </h2>
              <p className="text-sm text-gray-600">
                {thread.subject || 'Sans objet'}
              </p>
              <p className="text-xs text-gray-500">
                Campagne: {thread.campaign.name}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Label Selection */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Label IA:</span>
              {thread.label && (
                <span className="text-sm text-gray-600">
                  {LABELS[thread.label as keyof typeof LABELS] || thread.label}
                  {thread.confidence && ` (${Math.round(thread.confidence * 100)}%)`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(LABELS).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={thread.label === key ? "default" : "outline"}
                  disabled={isUpdatingLabel}
                  onClick={() => updateLabel(key)}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {thread.messages.map((message) => (
                <Card key={message.id} className={`${
                  message.direction === 'INBOUND' 
                    ? 'ml-4 bg-blue-50 border-blue-200' 
                    : 'mr-4 bg-gray-50 border-gray-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-gray-600">
                        {message.direction === 'INBOUND' ? (
                          <span className="font-medium text-blue-600">
                            {message.text.includes('💬 Contenu de la réponse:') ? '💬 RÉPONSE DIRECTE' : '← RÉPONSE'}
                          </span>
                        ) : (
                          <span className="font-medium text-gray-600">→ ENVOI</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(message.at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </div>
                    </div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {message.text}
                    </div>
                    {(message.fromAddr || message.toAddr || (message as any).messageId) && (
                      <div className="text-xs text-gray-500 mt-2 border-t pt-2">
                        {message.fromAddr && <div>De: {message.fromAddr}</div>}
                        {message.toAddr && <div>À: {message.toAddr}</div>}
                        {(message as any).messageId && (
                          <div className="font-mono bg-gray-100 p-1 rounded mt-1">
                            <span className="font-semibold">Message ID:</span> {(message as any).messageId}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}