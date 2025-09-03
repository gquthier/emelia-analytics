'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  Users, 
  Calendar, 
  Phone, 
  CheckCircle, 
  Star, 
  Clock,
  AlertCircle,
  MessageSquare,
  Building,
  Mail,
  ChevronRight,
  Plus,
  Search
} from 'lucide-react'

interface CRMContact {
  id: string
  threadId: string
  status: string
  priority: string
  score?: number
  notes?: string
  nextAction?: string
  nextActionAt?: Date
  createdAt: Date
  updatedAt: Date
  thread: {
    prospectEmail: string
    subject?: string
    lastAt?: Date
    campaign: {
      name: string
    }
    messages: Array<{
      direction: string
      text: string
      at: Date
    }>
  }
}

interface CRMPipelineProps {
  clientId: string
  clientName: string
}

const CRM_STATUSES = {
  INTERESSE: { 
    label: 'Intéressé', 
    color: 'bg-green-100 border-green-200 text-green-800',
    icon: Star
  },
  APPEL_RESERVE: { 
    label: 'Appel réservé', 
    color: 'bg-blue-100 border-blue-200 text-blue-800',
    icon: Phone
  },
  RDV_FIXE: { 
    label: 'RDV fixé', 
    color: 'bg-purple-100 border-purple-200 text-purple-800',
    icon: Calendar
  },
  QUALIFIE: { 
    label: 'Qualifié', 
    color: 'bg-orange-100 border-orange-200 text-orange-800',
    icon: CheckCircle
  },
  PERDU: { 
    label: 'Perdu', 
    color: 'bg-gray-100 border-gray-200 text-gray-600',
    icon: AlertCircle
  }
}

const PRIORITIES = {
  HAUTE: { label: 'Haute', color: 'text-red-600', icon: '🔥' },
  NORMALE: { label: 'Normale', color: 'text-blue-600', icon: '📋' },
  BASSE: { label: 'Basse', color: 'text-gray-600', icon: '📝' }
}

export function CRMPipeline({ clientId, clientName }: CRMPipelineProps) {
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const [draggedContact, setDraggedContact] = useState<CRMContact | null>(null)

  useEffect(() => {
    fetchCRMContacts()
  }, [clientId])

  const fetchCRMContacts = async () => {
    try {
      const response = await fetch(`/api/client/${clientId}/crm/contacts`)
      const data = await response.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Erreur lors du chargement des contacts CRM:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateContactStatus = async (contactId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/client/${clientId}/crm/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        await fetchCRMContacts()
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error)
    }
  }

  const addNote = async (contactId: string, note: string) => {
    try {
      const response = await fetch(`/api/client/${clientId}/crm/contacts/${contactId}/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note })
      })

      if (response.ok) {
        await fetchCRMContacts()
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la note:', error)
    }
  }

  const handleDragStart = (contact: CRMContact) => {
    setDraggedContact(contact)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    if (draggedContact && draggedContact.status !== newStatus) {
      updateContactStatus(draggedContact.id, newStatus)
    }
    setDraggedContact(null)
  }

  const filteredContacts = contacts.filter(contact =>
    !searchQuery || 
    contact.thread.prospectEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.thread.campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const contactsByStatus = Object.keys(CRM_STATUSES).reduce((acc, status) => {
    acc[status] = filteredContacts.filter(contact => contact.status === status)
    return acc
  }, {} as Record<string, CRMContact[]>)

  if (loading) {
    return <div className="p-4">Chargement du pipeline CRM...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Pipeline CRM - {clientName}</h2>
          <p className="text-gray-600 text-sm">
            {contacts.length} contact{contacts.length > 1 ? 's' : ''} dans le pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-5 gap-4 min-h-[600px]">
        {Object.entries(CRM_STATUSES).map(([status, config]) => {
          const StatusIcon = config.icon
          const statusContacts = contactsByStatus[status] || []
          
          return (
            <div
              key={status}
              className="flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <Card className={`mb-4 ${config.color} border-2`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4" />
                      <span className="font-medium text-sm">{config.label}</span>
                    </div>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                      {statusContacts.length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Cards */}
              <div className="flex-1 space-y-2">
                {statusContacts.map((contact) => (
                  <Card
                    key={contact.id}
                    draggable
                    onDragStart={() => handleDragStart(contact)}
                    onClick={() => setSelectedContact(contact)}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      draggedContact?.id === contact.id ? 'opacity-50' : ''
                    } ${
                      contact.priority === 'HAUTE' ? 'border-red-200 bg-red-50' : ''
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        {/* Contact Info */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {contact.thread.prospectEmail}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {contact.thread.campaign.name}
                            </p>
                          </div>
                          <div className="ml-2">
                            <span className="text-xs">
                              {PRIORITIES[contact.priority as keyof typeof PRIORITIES]?.icon}
                            </span>
                          </div>
                        </div>

                        {/* Score & Last Activity */}
                        {contact.score && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-gray-600">
                              {Math.round(contact.score * 100)}%
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {contact.thread.lastAt 
                            ? formatDistanceToNow(new Date(contact.thread.lastAt), { 
                                addSuffix: true, 
                                locale: fr 
                              })
                            : 'Pas d\'activité'
                          }
                        </div>

                        {/* Next Action */}
                        {contact.nextAction && (
                          <div className="text-xs bg-blue-50 text-blue-700 p-1 rounded">
                            📋 {contact.nextAction}
                          </div>
                        )}

                        {/* Notes Preview */}
                        {contact.notes && (
                          <div className="text-xs text-gray-600 truncate">
                            💭 {contact.notes}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{selectedContact.thread.prospectEmail}</CardTitle>
                  <p className="text-sm text-gray-600">{selectedContact.thread.campaign.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContact(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Status & Priority */}
                <div className="flex gap-4">
                  <div>
                    <label className="text-sm font-medium">Statut:</label>
                    <select 
                      className="ml-2 p-1 border rounded text-sm"
                      value={selectedContact.status}
                      onChange={(e) => updateContactStatus(selectedContact.id, e.target.value)}
                    >
                      {Object.entries(CRM_STATUSES).map(([status, config]) => (
                        <option key={status} value={status}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Score:</label>
                    <span className="ml-2 text-sm">
                      {selectedContact.score ? `${Math.round(selectedContact.score * 100)}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Latest Messages */}
                <div>
                  <h4 className="font-medium mb-2">Derniers messages:</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedContact.thread.messages.slice(0, 3).map((message, index) => (
                      <div 
                        key={index}
                        className={`p-2 rounded text-sm ${
                          message.direction === 'INBOUND' 
                            ? 'bg-blue-50 border-l-2 border-blue-200' 
                            : 'bg-gray-50 border-l-2 border-gray-200'
                        }`}
                      >
                        <div className="text-xs text-gray-600 mb-1">
                          {message.direction === 'INBOUND' ? '← Prospect' : '→ Vous'} • 
                          {formatDistanceToNow(new Date(message.at), { addSuffix: true, locale: fr })}
                        </div>
                        <div className="line-clamp-3">{message.text}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="font-medium mb-2">Notes:</h4>
                  <div className="space-y-2">
                    {selectedContact.notes && (
                      <div className="p-2 bg-yellow-50 border rounded text-sm">
                        {selectedContact.notes}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Ajouter une note..."
                        className="flex-1 text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement
                            addNote(selectedContact.id, input.value)
                            input.value = ''
                          }
                        }}
                      />
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {contacts.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Aucun contact dans le pipeline
          </h3>
          <p className="text-gray-600">
            Les contacts intéressés apparaîtront automatiquement ici quand ils répondront à vos campagnes.
          </p>
        </Card>
      )}
    </div>
  )
}