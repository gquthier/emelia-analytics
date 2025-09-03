'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Mail, MailOpen, Clock, User, Building, Tag, Filter, Inbox } from 'lucide-react'

interface Response {
  id: string
  threadId: string
  prospectEmail: string
  prospectName?: string
  prospectCompany?: string
  subject?: string
  content: string
  receivedAt: Date
  campaignName: string
  label?: string
  confidence?: number
  isRead?: boolean
}

interface ResponsesInboxProps {
  clientId: string
}

const LABEL_CONFIG = {
  INTERESSE: { label: 'Intéressé', color: 'bg-green-100 text-green-800', icon: '💚' },
  A_RAPPELER: { label: 'À rappeler', color: 'bg-blue-100 text-blue-800', icon: '📞' },
  NEUTRE: { label: 'Neutre', color: 'bg-gray-100 text-gray-800', icon: '⚪' },
  PAS_INTERESSE: { label: 'Pas intéressé', color: 'bg-red-100 text-red-800', icon: '❌' },
  INJOIGNABLE: { label: 'Injoignable', color: 'bg-orange-100 text-orange-800', icon: '🚫' },
  OPT_OUT: { label: 'Opt-out', color: 'bg-purple-100 text-purple-800', icon: '🛑' }
} as const

export function ResponsesInbox({ clientId }: ResponsesInboxProps) {
  const [responses, setResponses] = useState<Response[]>([])
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [labelFilter, setLabelFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'campaign' | 'label'>('date')

  useEffect(() => {
    fetchResponses()
  }, [clientId])

  const fetchResponses = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/${clientId}/responses`)
      if (!response.ok) throw new Error('Failed to fetch responses')
      
      const data = await response.json()
      setResponses(data.responses || [])
    } catch (error) {
      console.error('Error fetching responses:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (responseId: string) => {
    try {
      await fetch(`/api/client/${clientId}/responses/${responseId}/read`, {
        method: 'POST'
      })
      setResponses(prev => 
        prev.map(r => r.id === responseId ? { ...r, isRead: true } : r)
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const updateLabel = async (threadId: string, label: string) => {
    try {
      await fetch(`/api/thread/${threadId}/label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      })
      
      // Update local state
      setResponses(prev => 
        prev.map(r => r.threadId === threadId ? { ...r, label } : r)
      )
      if (selectedResponse?.threadId === threadId) {
        setSelectedResponse({ ...selectedResponse, label })
      }
    } catch (error) {
      console.error('Error updating label:', error)
    }
  }

  // Filter and sort responses
  const filteredAndSortedResponses = responses
    .filter(response => {
      const matchesSearch = !searchTerm || 
        response.prospectEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.content.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesLabel = labelFilter === 'all' || 
        (labelFilter === 'unread' && !response.isRead) ||
        response.label === labelFilter
      
      return matchesSearch && matchesLabel
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      } else if (sortBy === 'campaign') {
        return a.campaignName.localeCompare(b.campaignName)
      } else if (sortBy === 'label') {
        return (a.label || '').localeCompare(b.label || '')
      }
      return 0
    })

  const unreadCount = responses.filter(r => !r.isRead).length
  const labelCounts = responses.reduce((acc, r) => {
    if (r.label) {
      acc[r.label] = (acc[r.label] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Chargement des réponses...</span>
      </div>
    )
  }

  return (
    <div className="flex h-[800px] bg-white rounded-lg overflow-hidden border">
      {/* Sidebar - Liste des réponses style Gmail */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header fixe */}
        <div className="p-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Boîte de réception
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </h2>
            <Button
              onClick={fetchResponses}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
          
          {/* Barre de recherche Gmail-like */}
          <div className="relative">
            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Rechercher dans les emails"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 h-8 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          {/* Filtres compacts */}
          <div className="flex gap-1 mt-2">
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white flex-1"
            >
              <option value="all">Tous ({responses.length})</option>
              <option value="unread">Non lus ({unreadCount})</option>
              {Object.entries(LABEL_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label} ({labelCounts[key] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Liste des emails */}
        <div className="flex-1 overflow-y-auto">
          {filteredAndSortedResponses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Aucun email trouvé</p>
            </div>
          ) : (
            filteredAndSortedResponses.map((response) => (
              <div
                key={response.id}
                onClick={() => {
                  setSelectedResponse(response)
                  if (!response.isRead) {
                    markAsRead(response.id)
                  }
                }}
                className={`group px-4 py-3 border-b border-gray-100 cursor-pointer hover:shadow-sm transition-all relative ${
                  selectedResponse?.id === response.id ? 'bg-blue-50 border-blue-200' : ''
                } ${!response.isRead ? 'bg-white shadow-sm' : 'bg-gray-50'}`}
              >
                {/* Indicateur non lu */}
                {!response.isRead && (
                  <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
                
                {/* Header de l'email */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      !response.isRead 
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {(response.prospectName || response.prospectEmail).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm truncate ${!response.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {response.prospectName || response.prospectEmail.split('@')[0]}
                      </div>
                      {response.prospectCompany && (
                        <div className="text-xs text-gray-500 truncate">
                          {response.prospectCompany}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    {response.label && (
                      <div className={`w-2 h-2 rounded-full ${LABEL_CONFIG[response.label as keyof typeof LABEL_CONFIG]?.color.includes('green') ? 'bg-green-500' : 
                        LABEL_CONFIG[response.label as keyof typeof LABEL_CONFIG]?.color.includes('blue') ? 'bg-blue-500' :
                        LABEL_CONFIG[response.label as keyof typeof LABEL_CONFIG]?.color.includes('red') ? 'bg-red-500' :
                        LABEL_CONFIG[response.label as keyof typeof LABEL_CONFIG]?.color.includes('orange') ? 'bg-orange-500' :
                        LABEL_CONFIG[response.label as keyof typeof LABEL_CONFIG]?.color.includes('purple') ? 'bg-purple-500' : 'bg-gray-500'}`}>
                      </div>
                    )}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(response.receivedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                
                {/* Sujet */}
                {response.subject && (
                  <div className={`text-sm mb-1 truncate ${!response.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {response.subject}
                  </div>
                )}
                
                {/* Aperçu du contenu */}
                <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {response.content.substring(0, 150)}...
                </div>
                
                {/* Campagne */}
                <div className="text-xs text-gray-400 mt-1 truncate">
                  📧 {response.campaignName}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Panneau principal - Détail de l'email */}
      <div className="flex-1 bg-white flex flex-col">
        {selectedResponse ? (
          <>
            {/* Header de l'email */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-xl font-medium text-gray-900 mb-2">
                    {selectedResponse.subject || '(aucun objet)'}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                        {(selectedResponse.prospectName || selectedResponse.prospectEmail).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {selectedResponse.prospectName || selectedResponse.prospectEmail.split('@')[0]}
                        </div>
                        <div className="text-xs text-gray-500">
                          &lt;{selectedResponse.prospectEmail}&gt;
                        </div>
                      </div>
                    </div>
                    {selectedResponse.prospectCompany && (
                      <div className="text-sm text-gray-600">
                        {selectedResponse.prospectCompany}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(selectedResponse.receivedAt).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              
              {/* Barre d'actions de classification */}
              <div className="flex items-center gap-2 pb-2">
                <span className="text-sm text-gray-600 font-medium">Classification:</span>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(LABEL_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => updateLabel(selectedResponse.threadId, key)}
                      className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-all ${
                        selectedResponse.label === key
                          ? config.color + ' shadow-sm'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <span className="mr-1">{config.icon}</span>
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Contenu de l'email */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl">
                <div className="prose prose-sm max-w-none">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {selectedResponse.content}
                  </div>
                </div>
                
                {/* Métadonnées */}
                <div className="mt-6 space-y-3">
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <div className="font-medium mb-1">Informations sur la campagne</div>
                    <div>📧 {selectedResponse.campaignName}</div>
                  </div>
                  
                  {selectedResponse.confidence && (
                    <div className="text-sm text-blue-800 bg-blue-50 p-3 rounded-lg">
                      <div className="font-medium mb-1">Classification automatique</div>
                      <div>🤖 Confiance: {(selectedResponse.confidence * 100).toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sélectionnez un email
              </h3>
              <p className="text-gray-600 max-w-sm">
                Cliquez sur un email dans la liste pour l'afficher et le classer
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}