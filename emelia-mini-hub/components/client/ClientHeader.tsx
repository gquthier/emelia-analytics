'use client'

import { useState } from 'react'
import { Calendar, ChevronDown, Share2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareLinkButton } from '@/components/ShareLinkButton'
import { HistoricalSyncButton } from '@/components/HistoricalSyncButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ClientHeaderProps {
  client: {
    id: string
    name: string
    code3: string
    kpis?: any
  }
  isViewerMode: boolean
}

const PERIOD_OPTIONS = [
  { label: 'Aujourd\'hui', value: '1d' },
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
  { label: '90 derniers jours', value: '90d' },
  { label: 'Personnalisé', value: 'custom' },
]

export function ClientHeader({ client, isViewerMode }: ClientHeaderProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  return (
    <header className="bg-brand-card border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Client Info */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold caps tracking-wide">
                SaaS Expand
              </div>
              <div className="w-px h-6 bg-brand-border"></div>
              <div>
                <h1 className="text-xl font-semibold text-brand">
                  {client.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40 bg-brand-bg border-brand-border">
                <Calendar className="w-4 h-4 mr-2 text-brand-muted" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Campaign Filter */}
            <Select defaultValue="all">
              <SelectTrigger className="w-48 bg-brand-bg border-brand-border">
                <Filter className="w-4 h-4 mr-2 text-brand-muted" />
                <SelectValue placeholder="Toutes campagnes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes campagnes</SelectItem>
                {/* TODO: Load campaigns dynamically */}
              </SelectContent>
            </Select>

            {/* Historical Sync Button */}
            {!isViewerMode && (
              <HistoricalSyncButton 
                clientId={client.id} 
                clientName={client.name}
              />
            )}

            {/* Share Button */}
            {!isViewerMode && <ShareLinkButton clientId={client.id} />}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 flex items-center gap-4 text-sm text-brand-muted">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span>Synchronisation active</span>
          </div>
          {client.kpis?.computedAt && (
            <div className="editorial-prefix">
              Dernière mise à jour: {new Date(client.kpis.computedAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}