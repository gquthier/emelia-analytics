import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto'
import { EmeliaAPIClient } from '@/lib/emelia'

// GET - Récupérer un client spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        campaigns: true,
        webhooks: true,
        kpis: true
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Décrypter la clé API pour l'affichage (optionnel)
    const decryptedApiKey = decryptApiKey(client.apiKeyEnc)

    return NextResponse.json({
      ...client,
      apiKey: decryptedApiKey // Inclure la clé décryptée pour l'édition
    })

  } catch (error) {
    console.error('Erreur lors de la récupération du client:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Mettre à jour un client
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {
      name,
      apiKey,
      code3,
      valueProposition,
      slackId,
      actionLinks,
      responseStyle,
      makeWebhookUrl
    } = await request.json()

    // Vérifier que le client existe
    const existingClient = await prisma.client.findUnique({
      where: { id: params.id }
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Validation des champs requis
    if (!name || !code3) {
      return NextResponse.json('Le nom et le code3 sont requis', { status: 400 })
    }

    if (!/^[A-Za-z0-9]{3}$/.test(code3)) {
      return NextResponse.json('L\'identifiant doit contenir exactement 3 caractères alphanumériques', { status: 400 })
    }

    // Vérifier si le code3 est déjà utilisé par un autre client
    if (code3.toUpperCase() !== existingClient.code3) {
      const code3Exists = await prisma.client.findFirst({
        where: { 
          code3: code3.toUpperCase(),
          id: { not: params.id }
        }
      })

      if (code3Exists) {
        return NextResponse.json('Cet identifiant 3 lettres est déjà utilisé', { status: 400 })
      }
    }

    // Valider la clé API si elle est fournie
    let encryptedApiKey = existingClient.apiKeyEnc
    if (apiKey && apiKey !== '') {
      const emeliClient = new EmeliaAPIClient(apiKey)
      const isValidKey = await emeliClient.validateApiKey()

      if (!isValidKey) {
        return NextResponse.json('Clé API Emelia invalide', { status: 400 })
      }

      encryptedApiKey = encryptApiKey(apiKey)
    }

    // Mettre à jour le client
    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: {
        name,
        code3: code3.toUpperCase(),
        apiKeyEnc: encryptedApiKey,
        valueProposition: valueProposition || null,
        slackId: slackId || null,
        actionLinks: actionLinks || null,
        responseStyle: responseStyle || null,
        makeWebhookUrl: makeWebhookUrl || null,
      }
    })

    return NextResponse.json({
      success: true,
      client: updatedClient
    })

  } catch (error) {
    console.error('Erreur lors de la mise à jour du client:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer un client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier que le client existe
    const existingClient = await prisma.client.findUnique({
      where: { id: params.id }
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Supprimer le client (cascade supprimera les relations)
    await prisma.client.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Client supprimé avec succès'
    })

  } catch (error) {
    console.error('Erreur lors de la suppression du client:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
