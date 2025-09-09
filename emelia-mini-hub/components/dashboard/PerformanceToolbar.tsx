'use client'

import { useState } from 'react'
import { 
  Download, 
  Eye, 
  MousePointer, 
  Reply, 
  Settings,
  Calendar,
  TrendingUp,
  Mail,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PerformanceToolbarProps {
  selectedMetrics: string[]
  onMetricsChange: (metrics: string[]) => void
  groupBy: 'day' | 'week' | 'month'
  onGroupByChange: (groupBy: 'day' | 'week' | 'month') => void
  onExport: () => void
  showSmoothing: boolean
  onSmoothingChange: (enabled: boolean) => void
}

const AVAILABLE_METRICS = [
  { id: 'sent', label: 'Envoyés', icon: Mail, color: 'rgb(var(--gray-400))' },
  { id: 'delivered', label: 'Délivrés', icon: CheckCircle, color: 'rgb(var(--info))' },
  { id: 'opens', label: 'Ouvertures', icon: Eye, color: 'rgb(var(--accent))' },
  { id: 'clicks', label: 'Clics', icon: MousePointer, color: 'rgb(var(--warning))' },
  { id: 'replies', label: 'Réponses', icon: Reply, color: 'rgb(var(--success))' },
]

const GROUP_BY_OPTIONS = [
  { value: 'day', label: 'Par jour' },
  { value: 'week', label: 'Par semaine' },
  { value: 'month', label: 'Par mois' },
]

export function PerformanceToolbar({
  selectedMetrics,
  onMetricsChange,
  groupBy,
  onGroupByChange,
  onExport,
  showSmoothing,
  onSmoothingChange
}: PerformanceToolbarProps) {
  const handleMetricToggle = (metricId: string, checked: boolean) => {
    if (checked) {
      onMetricsChange([...selectedMetrics, metricId])
    } else {
      onMetricsChange(selectedMetrics.filter(id => id !== metricId))
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-brand-card border border-brand-border rounded-lg">
      <div className="flex items-center gap-4">
        {/* Metrics Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Métriques ({selectedMetrics.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Sélectionner les métriques</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {AVAILABLE_METRICS.map((metric) => {
              const Icon = metric.icon
              return (
                <DropdownMenuCheckboxItem
                  key={metric.id}
                  checked={selectedMetrics.includes(metric.id)}
                  onCheckedChange={(checked) => handleMetricToggle(metric.id, checked)}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: metric.color }}
                    />
                    <Icon className="w-4 h-4" />
                    <span>{metric.label}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Group By */}
        <Select value={groupBy} onValueChange={onGroupByChange}>
          <SelectTrigger className="w-36">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_BY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        {/* Chart Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Options d'affichage</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={showSmoothing}
              onCheckedChange={onSmoothingChange}
            >
              Lissage des courbes
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onExport}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>
    </div>
  )
}