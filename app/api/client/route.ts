import { NextRequest, NextResponse } from 'next/server'
import { supabaseClients, supabaseShareLinks } from '@/lib/supabase-adapter'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto'
import { EmeliaAPIClient } from '@/lib/emelia'
import { createShareLink } from '@/lib/auth'
import { setupClientWebhooks } from '@/lib/webhook-manager'

// GET - Récupérer tous les clients
export async function GET() {
  try {
    const clients = await supabaseClients.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Décrypter les clés API pour l'affichage
    const clientsWithDecryptedKeys = clients.map((client: any) => ({
      ...client,
      apiKey: decryptApiKey(client.apiKeyEnc)
    }))

    return NextResponse.json({
      clients: clientsWithDecryptedKeys
    })

  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      apiKey, 
      code3, 
      createWebhooks, 
      selectedCampaignTypes,
      // Nouveaux champs
      valueProposition,
      slackId,
      actionLinks,
      responseStyle,
      makeWebhookUrl
    } = await request.json()

    // Validate input
    if (!name || !apiKey || !code3) {
      return NextResponse.json('Tous les champs sont requis', { status: 400 })
    }

    if (!/^[A-Za-z0-9]{3}$/.test(code3)) {
      return NextResponse.json('L\'identifiant doit contenir exactement 3 caractères alphanumériques', { status: 400 })
    }

    // Check if code3 is already used
    const existingClient = await supabaseClients.findFirst({
      where: { code3: code3.toUpperCase() }
    })

    if (existingClient) {
      return NextResponse.json('Cet identifiant 3 lettres est déjà utilisé', { status: 400 })
    }

    // Validate Emelia API key
    const emeliClient = new EmeliaAPIClient(apiKey)
    const isValidKey = await emeliClient.validateApiKey()

    if (!isValidKey) {
      return NextResponse.json('Clé API Emelia invalide', { status: 400 })
    }

    // Encrypt and store API key
    const encryptedApiKey = encryptApiKey(apiKey)

    // Create client with new fields
    const client = await supabaseClients.create({
      data: {
        name,
        code3: code3.toUpperCase(),
        apiKeyEnc: encryptedApiKey,
        // Nouveaux champs
        valueProposition: valueProposition || null,
        slackId: slackId || null,
        actionLinks: actionLinks || null,
        responseStyle: responseStyle || null,
        makeWebhookUrl: makeWebhookUrl || null,
      }
    })

    // Create initial share link
    const shareLink = createShareLink(client.id)

    await supabaseShareLinks.create({
      data: {
        clientId: client.id,
        token: shareLink.split('token=')[1],
      }
    })

    // Setup webhooks if requested
    if (createWebhooks && selectedCampaignTypes?.length > 0) {
      try {
        setupClientWebhooks(client.id, apiKey, selectedCampaignTypes).catch(error => {
          console.error('Erreur lors de la création des webhooks:', error)
        })
      } catch (error) {
        console.error('Erreur lors du setup des webhooks:', error)
      }
    }

    // Start backfill in the background
    fetch(`${process.env.BASE_URL}/api/client/${client.id}/sync`, {
      method: 'POST',
    }).catch(console.error)

    return NextResponse.json({
      client,
      shareLink,
      webhooksCreated: createWebhooks && selectedCampaignTypes?.length > 0
    })
  } catch (error) {
    console.error('Client creation error:', error)
    return NextResponse.json('Erreur serveur', { status: 500 })
  }
}