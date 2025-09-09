'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export function ClientForm() {
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    code3: '',
    createWebhooks: true,
    selectedCampaignTypes: ['email'] as Array<'email' | 'advanced' | 'linkedin'>,
    // Nouveaux champs
    valueProposition: '',
    slackId: '',
    actionLinks: [
      { name: '', url: '', description: '' }
    ],
    responseStyle: '',
    makeWebhookUrl: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [shareLink, setShareLink] = useState('')
  
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!/^[A-Za-z0-9]{3}$/.test(formData.code3)) {
      setError('L&apos;identifiant doit contenir exactement 3 caractères alphanumériques')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      const result = await response.json()
      setShareLink(result.shareLink)
      setFormData({ 
        name: '', 
        apiKey: '', 
        code3: '',
        createWebhooks: true,
        selectedCampaignTypes: ['email'],
        valueProposition: '',
        slackId: '',
        actionLinks: [{ name: '', url: '', description: '' }],
        responseStyle: '',
        makeWebhookUrl: ''
      })
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareLink)
  }

  const addActionLink = () => {
    setFormData(prev => ({
      ...prev,
      actionLinks: [...prev.actionLinks, { name: '', url: '', description: '' }]
    }))
  }

  const removeActionLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actionLinks: prev.actionLinks.filter((_, i) => i !== index)
    }))
  }

  const updateActionLink = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      actionLinks: prev.actionLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un client</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom d&apos;entreprise
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              aria-label="Nom d'entreprise"
            />
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Clé API Emelia
            </label>
            <Input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
              required
              aria-label="Clé API Emelia"
            />
          </div>

          <div>
            <label htmlFor="code3" className="block text-sm font-medium text-gray-700 mb-1">
              Identifiant 3 lettres (ex: QF1)
            </label>
            <Input
              id="code3"
              value={formData.code3}
              onChange={(e) => setFormData(prev => ({ ...prev, code3: e.target.value.toUpperCase() }))}
              maxLength={3}
              pattern="[A-Za-z0-9]{3}"
              required
              aria-label="Identifiant 3 lettres"
            />
            <p className="text-xs text-gray-500 mt-1">
              Utilisé pour filtrer les campagnes Emelia (doit être présent dans le nom de la campagne)
            </p>
          </div>

          {/* Nouveaux champs pour Make */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Make</h3>
            
            <div>
              <label htmlFor="valueProposition" className="block text-sm font-medium text-gray-700 mb-1">
                1. Proposition de valeur et cible
              </label>
              <textarea
                id="valueProposition"
                value={formData.valueProposition}
                onChange={(e) => setFormData(prev => ({ ...prev, valueProposition: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600"
                rows={3}
                placeholder="Décrivez votre proposition de valeur et votre cible..."
              />
            </div>

            <div>
              <label htmlFor="slackId" className="block text-sm font-medium text-gray-700 mb-1">
                2. Slack ID
              </label>
              <Input
                id="slackId"
                value={formData.slackId}
                onChange={(e) => setFormData(prev => ({ ...prev, slackId: e.target.value }))}
                placeholder="U1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3. Liens d&apos;action
              </label>
              {formData.actionLinks.map((link, index) => (
                <div key={index} className="border rounded-lg p-3 mb-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nom du lien (ex: Réservation)"
                      value={link.name}
                      onChange={(e) => updateActionLink(index, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="URL (ex: https://calendly.com/...)"
                      value={link.url}
                      onChange={(e) => updateActionLink(index, 'url', e.target.value)}
                    />
                    {formData.actionLinks.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeActionLink(index)}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Description du lien"
                    value={link.description}
                    onChange={(e) => updateActionLink(index, 'description', e.target.value)}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addActionLink}
                className="w-full"
              >
                + Ajouter un lien
              </Button>
            </div>

            <div>
              <label htmlFor="responseStyle" className="block text-sm font-medium text-gray-700 mb-1">
                4. Style de réponse
              </label>
              <textarea
                id="responseStyle"
                value={formData.responseStyle}
                onChange={(e) => setFormData(prev => ({ ...prev, responseStyle: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600"
                rows={3}
                placeholder="Décrivez le style de réponse souhaité..."
              />
            </div>

            <div>
              <label htmlFor="makeWebhookUrl" className="block text-sm font-medium text-gray-700 mb-1">
                5. URL Webhook Make
              </label>
              <Input
                id="makeWebhookUrl"
                value={formData.makeWebhookUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, makeWebhookUrl: e.target.value }))}
                placeholder="https://hook.eu2.make.com/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                URL du webhook Make pour déclencher les réponses automatiques
              </p>
            </div>
          </div>

          {/* Options de webhooks */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.createWebhooks}
                onChange={(e) => setFormData(prev => ({ ...prev, createWebhooks: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Créer automatiquement des webhooks
              </span>
            </label>

            {formData.createWebhooks && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Types de campagnes à surveiller
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'email', label: 'Email' },
                    { value: 'advanced', label: 'Advanced' },
                    { value: 'linkedin', label: 'LinkedIn' }
                  ].map(type => (
                    <label key={type.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.selectedCampaignTypes.includes(type.value as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              selectedCampaignTypes: [...prev.selectedCampaignTypes, type.value as any]
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              selectedCampaignTypes: prev.selectedCampaignTypes.filter(t => t !== type.value)
                            }))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">{type.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recommandé: Email uniquement pour des performances optimales
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded" role="alert">
              {error}
            </div>
          )}

          {shareLink && (
            <div className="bg-green-50 p-4 rounded space-y-2">
              <p className="text-sm font-medium text-green-800">Client créé avec succès !</p>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="flex-1 text-xs"
                  aria-label="Lien de partage"
                />
                <Button type="button" onClick={copyShareLink} size="sm" variant="outline">
                  Copier
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Création en cours...' : 'Ajouter le client'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}