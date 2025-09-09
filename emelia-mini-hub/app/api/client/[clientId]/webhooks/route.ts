import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

interface CreateWebhookRequest {
  campaignType: 'email' | 'advanced' | 'linkedin'
  events: string[] // ['REPLIED', 'SENT', 'OPENED']
  customUrl?: string // URL personnalisée optionnelle
}

// GET - Récupérer tous les webhooks d'un client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    const webhooks = await prisma.webhook.findMany({
      where: { clientId },
      include: {
        deliveries: {
          orderBy: { receivedAt: 'desc' },
          take: 10
        },
        _count: {
          select: { deliveries: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const webhooksWithStats = webhooks.map(webhook => ({
      ...webhook,
      events: JSON.parse(webhook.events),
      totalDeliveries: webhook._count.deliveries,
      lastDeliveries: webhook.deliveries
    }))

    return NextResponse.json({ webhooks: webhooksWithStats })
  } catch (error) {
    console.error('Erreur lors de la récupération des webhooks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau webhook
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { campaignType, events, customUrl }: CreateWebhookRequest = await request.json()

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Vérifier qu'un webhook pour ce type de campagne n'existe pas déjà
    const existingWebhook = await prisma.webhook.findUnique({
      where: {
        clientId_campaignType: {
          clientId,
          campaignType
        }
      }
    })

    if (existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook already exists for this campaign type' },
        { status: 409 }
      )
    }

    // Générer un secret pour sécuriser le webhook
    const secret = crypto.randomBytes(32).toString('hex')
    
    // Déterminer l'URL du webhook
    let webhookUrl: string
    let isCustomUrl = false
    
    if (customUrl && customUrl.trim()) {
      // Valider l'URL personnalisée
      try {
        new URL(customUrl)
        webhookUrl = customUrl.trim()
        isCustomUrl = true
        console.log(`🎯 Utilisation d'une URL personnalisée: ${webhookUrl}`)
      } catch {
        return NextResponse.json(
          { error: 'Invalid custom URL provided' },
          { status: 400 }
        )
      }
    } else {
      // URL du webhook par défaut (notre endpoint)
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
      webhookUrl = `${baseUrl}/api/webhook/emelia`
      console.log(`🔗 Utilisation de l'URL par défaut: ${webhookUrl}`)
    }

    // Créer le webhook en base
    const webhook = await prisma.webhook.create({
      data: {
        clientId,
        url: webhookUrl,
        campaignType,
        events: JSON.stringify(events),
        secret,
        isActive: true
      }
    })

    // Log de création
    console.log(`🔗 Webhook créé pour ${client.name} (${campaignType}):`, {
      url: webhookUrl,
      isCustom: isCustomUrl,
      events: events
    })
    
    // TODO: Si URL personnalisée, on n'a pas besoin de créer côté Emelia
    // Si URL par défaut, il faudrait créer le webhook côté Emelia via leur API

    return NextResponse.json({
      webhook: {
        ...webhook,
        events: JSON.parse(webhook.events),
        isCustomUrl
      },
      message: isCustomUrl 
        ? 'Webhook personnalisé créé avec succès' 
        : 'Webhook Emelia créé avec succès'
    })

  } catch (error) {
    console.error('Erreur lors de la création du webhook:', error)
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer tous les webhooks d'un client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    // Supprimer tous les webhooks et leurs livraisons
    await prisma.webhook.deleteMany({
      where: { clientId }
    })

    return NextResponse.json({ message: 'All webhooks deleted successfully' })
  } catch (error) {
    console.error('Erreur lors de la suppression des webhooks:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhooks' },
      { status: 500 }
    )
  }
}