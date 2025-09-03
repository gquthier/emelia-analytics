'use client'

import { useState } from 'react'
import { KPICards } from './KPICards'
import { TimeSeriesChart } from './TimeSeriesChart'
import { ThreadsList } from './ThreadsList'
import { CampaignsList } from './CampaignsList'
import { ResponsesInbox } from './ResponsesInbox'
import { CRMPipeline } from './CRMPipeline'
import { 
  BarChart3, 
  MessageSquare, 
  Mail, 
  TrendingUp, 
  Inbox,
  Users
} from 'lucide-react'

interface ClientDashboardTabsProps {
  clientId: string
  clientName: string
  kpis: any
  campaigns: any[]
  threads: any[]
}

const tabs = [
  {
    id: 'overview',
    label: 'Vue d\'ensemble',
    icon: BarChart3
  },
  {
    id: 'campaigns',
    label: 'Campagnes',
    icon: Mail
  },
  {
    id: 'responses',
    label: 'Réponses',
    icon: Inbox
  },
  {
    id: 'analytics',
    label: 'Analyse',
    icon: TrendingUp
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users
  },
  {
    id: 'conversations',
    label: 'Conversations',
    icon: MessageSquare
  }
]

export function ClientDashboardTabs({ clientId, clientName, kpis, campaigns, threads }: ClientDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <KPICards kpis={kpis} />
            <TimeSeriesChart clientId={clientId} />
          </div>
        )
      
      case 'campaigns':
        return <CampaignsList campaigns={campaigns} clientId={clientId} />
      
      case 'responses':
        return <ResponsesInbox clientId={clientId} />
      
      case 'analytics':
        return (
          <div className="space-y-8">
            <KPICards kpis={kpis} />
            <TimeSeriesChart clientId={clientId} />
          </div>
        )
      
      case 'crm':
        return <CRMPipeline clientId={clientId} clientName={clientName} />
      
      case 'conversations':
        return <ThreadsList threads={threads} />
      
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation des onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'responses' && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    N
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>
    </div>
  )
}