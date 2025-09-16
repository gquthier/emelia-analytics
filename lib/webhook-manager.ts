import { EmeliaAPIClient } from './emelia'
import { prisma } from '@/lib/db'

export interface WebhookConfig {
  url: string
  events: string[]
  campaignType: 'email' | 'advanced' | 'linkedin'
}

export class WebhookManager {
  private emeliClient: EmeliaAPIClient

  constructor(apiKey: string) {
    this.emeliClient = new EmeliaAPIClient(apiKey)
  }

  /**
   * Créer un webhook côté Emelia
   */
  async createEmeliaWebhook(config: WebhookConfig): Promise<string | null> {
    try {
      // Note: Cette méthode devra être adaptée selon l'API réelle d'Emelia
      // Pour l'instant, on simule la création
      
      console.log(`🔗 Création du webhook Emelia:`, {
        url: config.url,
        events: config.events,
        campaignType: config.campaignType
      })

      // TODO: Implémenter l'appel réel à l'API Emelia
      // const response = await this.emeliClient.createWebhook({
      //   url: config.url,
      //   events: config.events,
      //   campaignType: config.campaignType
      // })
      
      // Pour l'instant, on retourne un ID simulé
      const simulatedId = `emelia_webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log(`✅ Webhook Emelia créé avec l'ID: ${simulatedId}`)
      return simulatedId

    } catch (error) {
      console.error('❌ Erreur lors de la création du webhook Emelia:', error)
      return null
    }
  }

  /**
   * Supprimer un webhook côté Emelia
   */
  async deleteEmeliaWebhook(emeliaId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Suppression du webhook Emelia: ${emeliaId}`)

      // TODO: Implémenter l'appel réel à l'API Emelia
      // const response = await this.emeliClient.deleteWebhook(emeliaId)
      
      console.log(`✅ Webhook Emelia supprimé: ${emeliaId}`)
      return true

    } catch (error) {
      console.error('❌ Erreur lors de la suppression du webhook Emelia:', error)
      return false
    }
  }

  /**
   * Lister les webhooks côté Emelia
   */
  async listEmeliaWebhooks(): Promise<any[]> {
    try {
      console.log('📋 Récupération des webhooks Emelia')

      // TODO: Implémenter l'appel réel à l'API Emelia
      // const response = await this.emeliClient.listWebhooks()
      
      // Pour l'instant, on retourne un tableau vide
      return []

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des webhooks Emelia:', error)
      return []
    }
  }

  /**
   * Créer un webhook complet (local + Emelia)
   */
  async createCompleteWebhook(
    clientId: string,
    config: WebhookConfig
  ): Promise<{ success: boolean; webhookId?: string; error?: string }> {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
      const webhookUrl = `${baseUrl}/api/webhook/emelia`
      
      // 1. Créer le webhook côté Emelia
      const emeliaId = await this.createEmeliaWebhook({
        ...config,
        url: webhookUrl
      })

      // 2. Créer le webhook en base locale
      const webhook = await prisma.webhook.create({
        data: {
          clientId,
          emeliaId,
          url: webhookUrl,
          campaignType: config.campaignType,
          events: JSON.stringify(config.events),
          secret: require('crypto').randomBytes(32).toString('hex'),
          isActive: true
        }
      })

      console.log(`✅ Webhook complet créé pour le client ${clientId}`)
      return { success: true, webhookId: webhook.id }

    } catch (error) {
      console.error('❌ Erreur lors de la création du webhook complet:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Supprimer un webhook complet (local + Emelia)
   */
  async deleteCompleteWebhook(webhookId: string): Promise<boolean> {
    try {
      // 1. Récupérer le webhook
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId }
      })

      if (!webhook) {
        console.log(`⚠️ Webhook ${webhookId} non trouvé`)
        return false
      }

      // 2. Supprimer côté Emelia si l'ID existe
      if (webhook.emeliaId) {
        const deleted = await this.deleteEmeliaWebhook(webhook.emeliaId)
        if (!deleted) {
          console.log('⚠️ Échec de la suppression côté Emelia, suppression locale quand même')
        }
      }

      // 3. Supprimer en base locale
      await prisma.webhook.delete({
        where: { id: webhookId }
      })

      console.log(`✅ Webhook ${webhookId} supprimé complètement`)
      return true

    } catch (error) {
      console.error('❌ Erreur lors de la suppression du webhook complet:', error)
      return false
    }
  }

  /**
   * Synchroniser les webhooks d'un client avec Emelia
   */
  async syncClientWebhooks(clientId: string): Promise<void> {
    try {
      console.log(`🔄 Synchronisation des webhooks pour le client ${clientId}`)

      // 1. Récupérer les webhooks locaux
      const localWebhooks = await prisma.webhook.findMany({
        where: { clientId }
      })

      // 2. Récupérer les webhooks côté Emelia
      const emeliaWebhooks = await this.listEmeliaWebhooks()

      // 3. TODO: Comparer et synchroniser
      console.log(`📊 Webhooks locaux: ${localWebhooks.length}, Webhooks Emelia: ${emeliaWebhooks.length}`)

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation des webhooks:', error)
    }
  }
}

/**
 * Utilitaire pour créer des webhooks pour un client
 */
export async function setupClientWebhooks(
  clientId: string,
  apiKey: string,
  campaignTypes: Array<'email' | 'advanced' | 'linkedin'> = ['email']
): Promise<void> {
  const manager = new WebhookManager(apiKey)

  for (const campaignType of campaignTypes) {
    try {
      const result = await manager.createCompleteWebhook(clientId, {
        url: '', // Sera défini dans createCompleteWebhook
        events: ['REPLIED'], // Focus sur les réponses uniquement
        campaignType
      })

      if (result.success) {
        console.log(`✅ Webhook ${campaignType} configuré pour le client`)
      } else {
        console.error(`❌ Échec du webhook ${campaignType}:`, result.error)
      }
    } catch (error) {
      console.error(`❌ Erreur webhook ${campaignType}:`, error)
    }
  }
}