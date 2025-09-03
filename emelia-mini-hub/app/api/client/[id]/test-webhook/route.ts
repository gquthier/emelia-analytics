import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptApiKey } from '@/lib/crypto'

// POST - Tester le webhook Make pour un client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    if (!client.makeWebhookUrl) {
      return NextResponse.json({ 
        error: 'URL Make non configurée pour ce client',
        success: false 
      }, { status: 400 })
    }

    // Créer un payload de test simulant une réponse "INTERESSE"
    const testPayload = {
      // Données du prospect (simulées)
      prospect: {
        email: "test@example.com",
        firstName: "Jean",
        lastName: "Dupont",
        company: "Entreprise Test",
        phone: "+33612345678"
      },
      
      // Données de la campagne (simulées)
      campaign: {
        name: `${client.code3} Test Campaign`,
        step: 2,
        sender: "sales@emelia.io"
      },
      
      // Réponse reçue (simulée)
      reply: {
        text: "Bonjour, votre proposition m'intéresse beaucoup. Pouvez-vous me donner plus d'informations ?",
        date: new Date().toISOString(),
        messageId: "<test-message-id@example.com>"
      },
      
      // Analyse du sentiment (simulée)
      sentiment: {
        label: "INTERESSE",
        score: 0.85,
        confidence: 0.92
      },
      
      // Informations client
      client: {
        name: client.name,
        code3: client.code3,
        valueProposition: client.valueProposition,
        slackId: client.slackId,
        actionLinks: client.actionLinks,
        responseStyle: client.responseStyle
      },
      
      // Métadonnées
      metadata: {
        event: "REPLIED",
        processedAt: new Date().toISOString(),
        source: "emelia-webhook-test",
        threadId: "test-thread-id",
        label: "INTERESSE",
        confidence: 0.92,
        isTest: true
      }
    }

    console.log('🧪 Test webhook Make pour client:', client.name)
    console.log('📤 URL Make:', client.makeWebhookUrl)
    
    // Envoyer le payload de test vers Make
    const makeResponse = await fetch(client.makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Emelia-Mini-Hub-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    })

    const responseText = await makeResponse.text()
    let responseData = null
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    if (makeResponse.ok) {
      console.log('✅ Test webhook Make réussi')
      return NextResponse.json({
        success: true,
        message: 'Test webhook envoyé avec succès',
        makeResponse: {
          status: makeResponse.status,
          data: responseData
        },
        testPayload
      })
    } else {
      console.error('❌ Test webhook Make échoué:', makeResponse.status, responseText)
      return NextResponse.json({
        success: false,
        error: `Erreur Make: ${makeResponse.status}`,
        makeResponse: {
          status: makeResponse.status,
          data: responseData
        },
        testPayload
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Erreur lors du test webhook:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}
