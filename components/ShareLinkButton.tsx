'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share } from 'lucide-react'

interface ShareLinkButtonProps {
  clientId: string
}

export function ShareLinkButton({ clientId }: ShareLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const createAndCopyShareLink = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/client/${clientId}/share-link`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        await navigator.clipboard.writeText(result.shareLink)
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('Failed to create share link:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={createAndCopyShareLink}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      <Share className="h-4 w-4" />
      {isLoading ? 'Génération...' : 'Copier lien partagé'}
    </Button>
  )
}