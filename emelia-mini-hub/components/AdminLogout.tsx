'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Shield } from 'lucide-react'

export function AdminLogout() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/admin-logout', {
        method: 'POST'
      })

      if (response.ok) {
        // Redirection et rafraîchissement pour afficher la page de login
        router.push('/')
        router.refresh()
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Shield className="w-4 h-4" />
        <span>Admin connecté</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        {isLoading ? 'Déconnexion...' : 'Se déconnecter'}
      </Button>
    </div>
  )
}