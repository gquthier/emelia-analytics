import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Récupérer un webhook spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string; webhookId: string } }
) {
  try {
    const { clientId, webhookId } = params

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        clientId
      },
      include: {
        deliveries: {
          orderBy: { receivedAt: 'desc' },
          take: 50
        }
      }
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json({
      webhook: {
        ...webhook,
        events: JSON.parse(webhook.events)
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du webhook:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: { clientId: string; webhookId: string } }
) {
  try {
    const { clientId, webhookId } = params
    const { events, isActive } = await request.json()

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        clientId
      }
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const updatedWebhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        events: events ? JSON.stringify(events) : webhook.events,
        isActive: isActive !== undefined ? isActive : webhook.isActive
      }
    })

    return NextResponse.json({
      webhook: {
        ...updatedWebhook,
        events: JSON.parse(updatedWebhook.events)
      },
      message: 'Webhook updated successfully'
    })

  } catch (error) {
    console.error('Erreur lors de la mise à jour du webhook:', error)
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un webhook spécifique
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string; webhookId: string } }
) {
  try {
    const { clientId, webhookId } = params

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        clientId
      }
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // TODO: Supprimer le webhook côté Emelia si emeliaId existe
    if (webhook.emeliaId) {
      console.log(`🗑️ TODO: Supprimer le webhook Emelia ${webhook.emeliaId}`)
    }

    await prisma.webhook.delete({
      where: { id: webhookId }
    })

    return NextResponse.json({ message: 'Webhook deleted successfully' })

  } catch (error) {
    console.error('Erreur lors de la suppression du webhook:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}