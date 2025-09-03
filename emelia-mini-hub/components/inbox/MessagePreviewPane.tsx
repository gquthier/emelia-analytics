'use client'

import { useState, useMemo } from 'react'
import { 
  Reply,
  Tag,
  Clock,
  Mail,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Message {
  id: string
  text: string
  at: Date
  direction: string
  fromAddr?: string | null
  toAddr?: string | null
}

interface Thread {
  id: string
  prospectEmail: string
  subject: string | null
  label: string | null
  confidence: number | null
  campaignName: string
  messages: Message[]
}

interface MessagePreviewPaneProps {
  thread: Thread | null
  clientId: string
}

const LABEL_CONFIG = {
  INTERESSE: { label: 'Intéressé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  A_RAPPELER: { label: 'À rappeler', color: 'bg-blue-100 text-blue-800', icon: Clock },
  NEUTRE: { label: 'Neutre', color: 'bg-gray-100 text-gray-800', icon: MessageSquare },
  PAS_INTERESSE: { label: 'Pas intéressé', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  INJOIGNABLE: { label: 'Injoignable', color: 'bg-orange-100 text-orange-800', icon: Mail },
  OPT_OUT: { label: 'Opt-out', color: 'bg-purple-100 text-purple-800', icon: ExternalLink }
}

export function MessagePreviewPane({ thread, clientId }: MessagePreviewPaneProps) {
  const [isUpdatingLabel, setIsUpdatingLabel] = useState(false)

  const handleLabelUpdate = async (newLabel: string) => {
    if (!thread) return
    
    // Convert "NONE" back to null for the API
    const labelToSend = newLabel === 'NONE' ? null : newLabel
    
    setIsUpdatingLabel(true)
    try {
      const response = await fetch(`/api/thread/${thread.id}/label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ label: labelToSend })
      })
      
      if (response.ok) {
        // Refresh the page to show updated label
        window.location.reload()
      } else {
        throw new Error('Erreur lors de la mise à jour du label')
      }
    } catch (error) {
      console.error('Label update error:', error)
      alert('Erreur lors de la mise à jour du label')
    } finally {
      setIsUpdatingLabel(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const sortedMessages = useMemo(() => {
    if (!thread) return []
    return [...thread.messages].sort((a, b) => a.at.getTime() - b.at.getTime())
  }, [thread])

  if (!thread) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-brand mb-2">
            Sélectionnez une conversation
          </h3>
          <p className="text-brand-muted max-w-sm">
            Choisissez une conversation dans la liste pour voir les messages et gérer les labels.
          </p>
        </div>
      </div>
    )
  }

  const currentLabelConfig = thread.label 
    ? LABEL_CONFIG[thread.label as keyof typeof LABEL_CONFIG]
    : null

  return (
    <div className="h-full flex flex-col bg-brand-bg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-brand-card">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-brand mb-1">
              {thread.prospectEmail}
            </h2>
            <div className="flex items-center gap-4 text-sm text-brand-muted">
              <span>Campagne: {thread.campaignName}</span>
              {thread.subject && (
                <span>Sujet: {thread.subject}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            {/* Current label */}
            {currentLabelConfig && (
              <div className="flex items-center gap-2">
                <currentLabelConfig.icon className="w-4 h-4" />
                <Badge className={currentLabelConfig.color}>
                  {currentLabelConfig.label}
                </Badge>
                {thread.confidence && (
                  <span className="text-xs text-brand-muted">
                    ({Math.round(thread.confidence * 100)}%)
                  </span>
                )}
              </div>
            )}
            
            {/* Label selector */}
            <Select 
              value={thread.label || 'NONE'} 
              onValueChange={handleLabelUpdate}
              disabled={isUpdatingLabel}
            >
              <SelectTrigger className="w-40">
                <Tag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Classer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Sans label</SelectItem>
                {Object.entries(LABEL_CONFIG).map(([key, config]) => {
                  const IconComponent = config.icon
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6 max-w-4xl">
          {sortedMessages.map((message, index) => {
            const isInbound = message.direction === 'INBOUND'
            const isFirst = index === 0
            const prevMessage = index > 0 ? sortedMessages[index - 1] : null
            const showDateSeparator = prevMessage && 
              new Date(message.at).toDateString() !== new Date(prevMessage.at).toDateString()

            return (
              <div key={message.id}>
                {(isFirst || showDateSeparator) && (
                  <div className="flex items-center justify-center py-4">
                    <div className="px-4 py-2 bg-gray-100 rounded-full text-sm text-brand-muted">
                      {new Date(message.at).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                
                <Card className={`${isInbound ? 'ml-0 mr-12' : 'ml-12 mr-0'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isInbound 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {isInbound ? (
                            <Reply className="w-4 h-4" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-brand">
                            {isInbound ? message.fromAddr || thread.prospectEmail : 'Vous'}
                          </div>
                          <div className="text-sm text-brand-muted">
                            {formatDate(message.at)}
                          </div>
                        </div>
                      </div>
                      
                      <Badge variant={isInbound ? 'default' : 'secondary'}>
                        {isInbound ? 'Reçu' : 'Envoyé'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-brand leading-relaxed">
                        {message.text}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 border-t border-gray-200 bg-brand-card">
        <div className="text-sm text-brand-muted text-center">
          {sortedMessages.length} message{sortedMessages.length > 1 ? 's' : ''} 
          • Dernière activité: {formatDate(thread.messages[0]?.at)}
        </div>
      </div>
    </div>
  )
}