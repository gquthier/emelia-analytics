'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings, Edit, Trash2, Save, X, TestTube } from 'lucide-react'

interface Client {
  id: string
  name: string
  code3: string
  apiKey: string
  valueProposition?: string
  slackId?: string
  actionLinks?: Array<{ name: string; url: string; description: string }>
  responseStyle?: string
  makeWebhookUrl?: string
  createdAt: string
  lastSyncAt?: string
}

export default function SettingsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingWebhook, setIsTestingWebhook] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [testResult, setTestResult] = useState<{clientId: string, result: any} | null>(null)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/client')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient({ ...client })
    setError('')
  }

  const handleCancel = () => {
    setEditingClient(null)
    setError('')
  }

  const handleSave = async () => {
    if (!editingClient) return

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/client/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingClient)
      })

      if (response.ok) {
        await fetchClients()
        setEditingClient(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      setError('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.')) {
      return
    }

    try {
      const response = await fetch(`/api/client/${clientId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchClients()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      setError('Erreur lors de la suppression')
    }
  }

  const handleTestWebhook = async (clientId: string) => {
    setIsTestingWebhook(clientId)
    setError('')
    setTestResult(null)

    try {
      const response = await fetch(`/api/client/${clientId}/test-webhook`, {
        method: 'POST'
      })

      const result = await response.json()
      setTestResult({ clientId, result })

      if (!response.ok) {
        setError(result.error || 'Erreur lors du test du webhook')
      }
    } catch (error) {
      setError('Erreur lors du test du webhook')
      setTestResult({ 
        clientId, 
        result: { success: false, error: 'Erreur de connexion' } 
      })
    } finally {
      setIsTestingWebhook(null)
    }
  }

  const updateEditingClient = (field: string, value: any) => {
    if (!editingClient) return
    setEditingClient({ ...editingClient, [field]: value })
  }

  const updateActionLink = (index: number, field: string, value: string) => {
    if (!editingClient?.actionLinks) return
    
    const newActionLinks = [...editingClient.actionLinks]
    newActionLinks[index] = { ...newActionLinks[index], [field]: value }
    updateEditingClient('actionLinks', newActionLinks)
  }

  const addActionLink = () => {
    if (!editingClient) return
    const newActionLinks = [...(editingClient.actionLinks || []), { name: '', url: '', description: '' }]
    updateEditingClient('actionLinks', newActionLinks)
  }

  const removeActionLink = (index: number) => {
    if (!editingClient?.actionLinks) return
    const newActionLinks = editingClient.actionLinks.filter((_, i) => i !== index)
    updateEditingClient('actionLinks', newActionLinks)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Paramètres
          </h1>
          <p className="text-gray-600">
            Gérez vos clients et leurs configurations Make
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{client.name}</CardTitle>
                    <p className="text-sm text-gray-600">Code: {client.code3}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {client.makeWebhookUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestWebhook(client.id)}
                        disabled={isTestingWebhook === client.id}
                        className="text-blue-600 hover:text-blue-700"
                        title="Tester le webhook Make"
                      >
                        <TestTube className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(client.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingClient?.id === client.id ? (
                  <div className="space-y-4">
                    {/* Formulaire d'édition */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom d'entreprise
                      </label>
                      <Input
                        value={editingClient.name}
                        onChange={(e) => updateEditingClient('name', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code 3 lettres
                      </label>
                      <Input
                        value={editingClient.code3}
                        onChange={(e) => updateEditingClient('code3', e.target.value.toUpperCase())}
                        maxLength={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clé API Emelia
                      </label>
                      <Input
                        type="password"
                        value={editingClient.apiKey}
                        onChange={(e) => updateEditingClient('apiKey', e.target.value)}
                        placeholder="Laisser vide pour ne pas modifier"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proposition de valeur
                      </label>
                      <textarea
                        value={editingClient.valueProposition || ''}
                        onChange={(e) => updateEditingClient('valueProposition', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slack ID
                      </label>
                      <Input
                        value={editingClient.slackId || ''}
                        onChange={(e) => updateEditingClient('slackId', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Liens d'action
                      </label>
                      {(editingClient.actionLinks || []).map((link, index) => (
                        <div key={index} className="border rounded-lg p-3 mb-2 space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nom du lien"
                              value={link.name}
                              onChange={(e) => updateActionLink(index, 'name', e.target.value)}
                            />
                            <Input
                              placeholder="URL"
                              value={link.url}
                              onChange={(e) => updateActionLink(index, 'url', e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeActionLink(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Description"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Style de réponse
                      </label>
                      <textarea
                        value={editingClient.responseStyle || ''}
                        onChange={(e) => updateEditingClient('responseStyle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL Webhook Make
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={editingClient.makeWebhookUrl || ''}
                          onChange={(e) => updateEditingClient('makeWebhookUrl', e.target.value)}
                          placeholder="https://hook.eu2.make.com/..."
                          className="flex-1"
                        />
                        {editingClient.makeWebhookUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestWebhook(editingClient.id)}
                            disabled={isTestingWebhook === editingClient.id}
                            className="text-blue-600 hover:text-blue-700"
                            title="Tester le webhook"
                          >
                            <TestTube className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <strong>Proposition de valeur:</strong>
                      <p className="text-sm text-gray-600 mt-1">
                        {client.valueProposition || 'Non définie'}
                      </p>
                    </div>
                    
                    <div>
                      <strong>Slack ID:</strong>
                      <p className="text-sm text-gray-600 mt-1">
                        {client.slackId || 'Non défini'}
                      </p>
                    </div>
                    
                    <div>
                      <strong>Liens d'action:</strong>
                      <div className="text-sm text-gray-600 mt-1">
                        {client.actionLinks && client.actionLinks.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {client.actionLinks.map((link, index) => (
                              <li key={index}>
                                {link.name}: {link.url}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          'Aucun lien défini'
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <strong>Style de réponse:</strong>
                      <p className="text-sm text-gray-600 mt-1">
                        {client.responseStyle || 'Non défini'}
                      </p>
                    </div>
                    
                    <div>
                      <strong>URL Make:</strong>
                      <p className="text-sm text-gray-600 mt-1">
                        {client.makeWebhookUrl || 'Non configurée'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {clients.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Aucun client configuré</p>
            </CardContent>
          </Card>
        )}

        {/* Résultats de test webhook */}
        {testResult && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Résultat du test webhook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg ${
                testResult.result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    testResult.result.success ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className={`font-medium ${
                    testResult.result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.result.success ? 'Test réussi' : 'Test échoué'}
                  </span>
                </div>
                
                {testResult.result.success ? (
                  <div className="text-green-700">
                    <p className="mb-2">{testResult.result.message}</p>
                    {testResult.result.makeResponse && (
                      <div className="text-sm">
                        <p><strong>Status Make:</strong> {testResult.result.makeResponse.status}</p>
                        {testResult.result.makeResponse.data && (
                          <p><strong>Réponse Make:</strong> {JSON.stringify(testResult.result.makeResponse.data)}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-700">
                    <p className="mb-2">{testResult.result.error}</p>
                    {testResult.result.makeResponse && (
                      <div className="text-sm">
                        <p><strong>Status Make:</strong> {testResult.result.makeResponse.status}</p>
                        {testResult.result.makeResponse.data && (
                          <p><strong>Réponse Make:</strong> {JSON.stringify(testResult.result.makeResponse.data)}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                    Voir le payload envoyé
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(testResult.result.testPayload, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
