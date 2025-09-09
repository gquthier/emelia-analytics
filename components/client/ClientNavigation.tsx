'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  Inbox, 
  Brain, 
  MessageSquare,
  TrendingUp,
  Zap,
  Users
} from 'lucide-react'

interface ClientNavigationProps {
  clientId: string
  activeTab: string
  isViewerMode: boolean
}

const TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    href: '',
    description: 'Vue d\'ensemble des performances'
  },
  {
    id: 'reponses',
    label: 'Réponses',
    icon: Inbox,
    href: '/reponses',
    description: 'Inbox unifiée des conversations'
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    href: '/crm',
    description: 'Pipeline commercial et gestion des prospects'
  },
  {
    id: 'analytics',
    label: 'IA & Analytics',
    icon: Brain,
    href: '/analytics',
    description: 'Insights et analyses automatisées',
    badge: 'Beta'
  }
]

export function ClientNavigation({ clientId, activeTab, isViewerMode }: ClientNavigationProps) {
  const pathname = usePathname()

  // Check if AI is enabled
  const isAIEnabled = process.env.NEXT_PUBLIC_AI_ENABLED === 'true'

  const filteredTabs = TABS.filter(tab => {
    if (tab.id === 'analytics' && !isAIEnabled) return false
    return true
  })

  return (
    <nav className="flex items-center">
      {filteredTabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        const href = `/c/${clientId}${tab.href}`

        return (
          <Link
            key={tab.id}
            href={href}
            className={`group relative flex items-center gap-3 px-6 py-4 text-sm font-medium transition-colors ${
              isActive
                ? 'text-accent border-b-2 border-accent bg-accent-muted/10'
                : 'text-brand-muted hover:text-brand border-b-2 border-transparent hover:border-brand-border'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-brand-muted group-hover:text-brand'}`} />
            
            <div className="flex items-center gap-2">
              <span className={isActive ? 'caps' : ''}>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-accent text-white rounded caps">
                  {tab.badge}
                </span>
              )}
            </div>

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
              <div className="bg-brand text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                {tab.description}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-brand"></div>
              </div>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}