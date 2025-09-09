'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Filter, 
  Mail, 
  Clock,
  Tag,
  ArrowUpDown
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Thread {
  id: string
  prospectEmail: string
  subject: string | null
  lastAt: Date | string | null
  label: string | null
  confidence: number | null
  campaignName: string
  messages: Array<{
    id: string
    text: string
    at: Date | string
  }>
}

interface ThreadsPaneProps {
  threads: Thread[]
  clientId: string
  selectedThreadId?: string
}

const LABEL_CONFIG = {
  INTERESSE: { label: 'Intéressé', color: 'bg-green-100 text-green-800' },
  A_RAPPELER: { label: 'À rappeler', color: 'bg-blue-100 text-blue-800' },
  NEUTRE: { label: 'Neutre', color: 'bg-gray-100 text-gray-800' },
  PAS_INTERESSE: { label: 'Pas intéressé', color: 'bg-red-100 text-red-800' },
  INJOIGNABLE: { label: 'Injoignable', color: 'bg-orange-100 text-orange-800' },
  OPT_OUT: { label: 'Opt-out', color: 'bg-purple-100 text-purple-800' }
}

const SORT_OPTIONS = [
  { label: 'Plus récents', value: 'recent' },
  { label: 'Plus anciens', value: 'oldest' },
  { label: 'Email A-Z', value: 'email_asc' },
  { label: 'Email Z-A', value: 'email_desc' }
]

export function ThreadsPane({ threads, clientId, selectedThreadId }: ThreadsPaneProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLabel, setSelectedLabel] = useState<string>('all')
  const [sortBy, setSortBy] = useState('recent')

  const filteredAndSortedThreads = useMemo(() => {
    let filtered = threads

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(thread => 
        thread.prospectEmail.toLowerCase().includes(term) ||
        thread.subject?.toLowerCase().includes(term) ||
        thread.campaignName.toLowerCase().includes(term) ||
        thread.messages.some(msg => msg.text.toLowerCase().includes(term))
      )
    }

    // Filter by label
    if (selectedLabel !== 'all') {
      if (selectedLabel === 'unlabeled') {
        filtered = filtered.filter(thread => !thread.label)
      } else {
        filtered = filtered.filter(thread => thread.label === selectedLabel)
      }
    }

    // Sort - handle both Date objects and ISO strings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent': {
          const aTime = a.lastAt instanceof Date ? a.lastAt.getTime() : (a.lastAt ? new Date(a.lastAt).getTime() : 0)
          const bTime = b.lastAt instanceof Date ? b.lastAt.getTime() : (b.lastAt ? new Date(b.lastAt).getTime() : 0)
          return bTime - aTime
        }
        case 'oldest': {
          const aTime = a.lastAt instanceof Date ? a.lastAt.getTime() : (a.lastAt ? new Date(a.lastAt).getTime() : 0)
          const bTime = b.lastAt instanceof Date ? b.lastAt.getTime() : (b.lastAt ? new Date(b.lastAt).getTime() : 0)
          return aTime - bTime
        }
        case 'email_asc':
          return a.prospectEmail.localeCompare(b.prospectEmail)
        case 'email_desc':
          return b.prospectEmail.localeCompare(a.prospectEmail)
        default:
          return 0
      }
    })

    return filtered
  }, [threads, searchTerm, selectedLabel, sortBy])

  // Get unique labels from threads
  const availableLabels = useMemo(() => {
    const labels = new Set(threads.map(t => t.label).filter(Boolean))
    const hasUnlabeled = threads.some(t => !t.label)
    
    return {
      labeled: Array.from(labels),
      hasUnlabeled
    }
  }, [threads])

  const formatDate = (date: Date | string | null) => {
    if (!date) return ''
    const dateObj = date instanceof Date ? date : new Date(date)
    const now = new Date()
    const diff = now.getTime() - dateObj.getTime()
    const hours = diff / (1000 * 60 * 60)
    
    if (hours < 24) {
      return `${Math.floor(hours)}h`
    } else {
      const days = Math.floor(hours / 24)
      return `${days}j`
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand caps">
            Réponses ({threads.length})
          </h2>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-brand-muted" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <Input
            placeholder="Rechercher par email, sujet ou message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter by label */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedLabel === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLabel('all')}
          >
            Tous
          </Button>
          {availableLabels.labeled.map(label => (
            <Button
              key={label}
              variant={selectedLabel === label ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLabel(label)}
              className="gap-1"
            >
              <Tag className="w-3 h-3" />
              {LABEL_CONFIG[label as keyof typeof LABEL_CONFIG]?.label || label}
            </Button>
          ))}
          {availableLabels.hasUnlabeled && (
            <Button
              variant={selectedLabel === 'unlabeled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLabel('unlabeled')}
            >
              Non classés
            </Button>
          )}
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedThreads.length === 0 ? (
          <div className="p-6 text-center text-brand-muted">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune réponse trouvée</p>
            {searchTerm || selectedLabel !== 'all' ? (
              <p className="text-sm mt-2">
                Essayez de modifier vos filtres ou rechercher autre chose.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredAndSortedThreads.map((thread) => {
              const isSelected = selectedThreadId === thread.id
              const latestMessage = thread.messages[0]
              
              return (
                <Link
                  key={thread.id}
                  href={`/c/${clientId}/reponses?threadId=${thread.id}`}
                  className={`block p-4 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-accent/10 border-accent'
                      : 'bg-brand-card hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-brand truncate">
                        {thread.prospectEmail}
                      </div>
                      <div className="text-sm text-brand-muted truncate">
                        {thread.campaignName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {thread.label && (
                        <Badge className={LABEL_CONFIG[thread.label as keyof typeof LABEL_CONFIG]?.color}>
                          {LABEL_CONFIG[thread.label as keyof typeof LABEL_CONFIG]?.label}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-xs text-brand-muted">
                        <Clock className="w-3 h-3" />
                        {formatDate(thread.lastAt)}
                      </div>
                    </div>
                  </div>
                  
                  {thread.subject && (
                    <div className="text-sm font-medium text-brand mb-1 truncate">
                      {thread.subject}
                    </div>
                  )}
                  
                  {latestMessage && (
                    <div className="text-sm text-brand-muted line-clamp-2">
                      {latestMessage.text.substring(0, 120)}...
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}