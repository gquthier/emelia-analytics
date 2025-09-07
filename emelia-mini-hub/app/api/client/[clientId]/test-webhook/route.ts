import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptApiKey } from '@/lib/crypto'

interface TestWebhookRequest {
  webhookId: string
  testType: 'sample' | 'custom'
  customPayload?: any
}

// POST - Tester n'importe quel webhook (Make, Emelia, etc.)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    // Résoudre les params (Next.js 15 requirement)
    const { clientId } = await params

    // Debug des headers
    const contentType = request.headers.get('content-type')
    console.log('🔍 Headers reçus:', {
      contentType,
      userAgent: request.headers.get('user-agent'),
      method: request.method
    })

    // Parser le body de manière sécurisée - une seule fois
    let requestBody: TestWebhookRequest

    try {
      // Lire le body comme texte d'abord (une seule lecture)
      const bodyText = await request.text()
      console.log('📄 Raw body reçu:', bodyText)
      
      if (!bodyText || bodyText.trim() === '') {
        return NextResponse.json({ 
          success: false,
          error: 'Request body is empty',
          debug: { contentType, bodyLength: bodyText?.length || 0 }
        }, { status: 400 })
      }
      
      // Puis parser le JSON
      requestBody = JSON.parse(bodyText)
      console.log('✅ Body parsé avec succès:', requestBody)
      
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      return NextResponse.json({ 
        success: false,
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        debug: { 
          contentType,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }
      }, { status: 400 })
    }

    const { webhookId, testType, customPayload } = requestBody

    if (!webhookId) {
      return NextResponse.json({ 
        success: false,
        error: 'webhookId is required' 
      }, { status: 400 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Récupérer le webhook spécifique
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: { client: true }
    })

    if (!webhook || webhook.clientId !== clientId) {
      return NextResponse.json({ error: 'Webhook non trouvé' }, { status: 404 })
    }

    // Créer le payload de test avec les vraies données du client
    let testPayload: any

    if (testType === 'custom' && customPayload) {
      testPayload = customPayload
    } else {
      // NOUVEAU: Utiliser les données réelles du client
      const testDate = new Date().toISOString()
      
      if (webhook.url.includes('/api/webhook/emelia')) {
        // Format Emelia pour webhook interne
        testPayload = {
          event: 'REPLIED',
          contact: {
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@exemple.fr',
            company: 'Exemple SAS',
            phoneNumber: '+33 1 23 45 67 89'
          },
          date: testDate,
          sender: 'test@emelia.io',
          campaign: `${client.code3} Test Campaign - ${client.name}`,
          step: 1,
          messageId: `test_${Date.now()}`,
          reply: `Bonjour,

Merci pour votre email concernant ${client.name}. Je suis très intéressé par votre proposition et j'aimerais en savoir plus.

Pourriez-vous m'appeler cette semaine pour discuter des détails ? Je suis disponible mardi et mercredi après-midi.

Cordialement,
Jean Dupont
PDG - Exemple SAS`,
          sentiment: {
            classification: 'INTERESTED',
            score: 0.92,
            message: 'Contact très intéressé, demande un appel'
          }
        }
      } else {
        // Format pour webhooks externes (Make, Zapier, etc.) - DONNÉES RÉELLES CLIENT
        testPayload = {
          // Données du prospect (test réaliste)
          prospect: {
            email: "jean.dupont@exemple.fr",
            firstName: "Jean",
            lastName: "Dupont",
            company: "Exemple SAS",
            phone: "+33 1 23 45 67 89"
          },
          
          // Données de la campagne (avec vraies infos)
          campaign: {
            name: `${client.code3} - Test Campaign ${client.name}`,
            step: 2,
            sender: "test@emelia.io"
          },
          
          // Réponse reçue (test réaliste)
          reply: {
            text: `Bonjour,

J'ai vu votre message concernant ${client.name}. Je suis très intéressé par ce que vous proposez et j'aimerais en savoir plus.

Pouvez-vous me contacter cette semaine ? Je suis disponible pour un appel.

Merci,
Jean Dupont`,
            date: testDate,
            messageId: `test_${Date.now()}`
          },
          
          // Analyse du sentiment
          sentiment: {
            label: "INTERESSE",
            score: 0.92,
            confidence: 0.95
          },
          
          // IMPORTANTES : Vraies informations client pour Make
          client: {
            name: client.name,
            code3: client.code3,
            valueProposition: client.valueProposition || null,
            slackId: client.slackId || null,
            actionLinks: client.actionLinks || null,
            responseStyle: client.responseStyle || null,
            makeWebhookUrl: client.makeWebhookUrl || null
          },
          
          // Métadonnées pour Make
          metadata: {
            event: "REPLIED",
            processedAt: testDate,
            source: "emelia-webhook-test",
            threadId: `test-thread-${Date.now()}`,
            label: "INTERESSE",
            confidence: 0.92,
            isTest: true,
            clientId: client.id,
            webhookId: webhook.id
          }
        }
      }
    }

    console.log(`🧪 Test webhook pour ${client.name}:`, {
      webhookId,
      testType,
      url: webhook.url
    })
    
    // Envoyer le payload de test vers l'URL du webhook
    let testResult: any = { success: false, error: 'Unknown error' }

    try {
      const testResponse = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Emelia-Test-Webhook/1.0',
          'X-Webhook-Source': 'emelia-test',
          'X-Client-Code': client.code3,
          ...(webhook.secret && { 'X-Webhook-Secret': webhook.secret })
        },
        body: JSON.stringify(testPayload)
      })

      const responseText = await testResponse.text()
      let responseData: any = {}
      
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = { raw: responseText }
      }

      testResult = {
        success: testResponse.ok,
        status: testResponse.status,
        statusText: testResponse.statusText,
        response: responseData,
        error: !testResponse.ok ? `HTTP ${testResponse.status}: ${responseText}` : undefined
      }

    } catch (error) {
      console.error('❌ Erreur lors du test webhook:', error)
      testResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }

    // Enregistrer le test dans les livraisons
    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: 'TEST',
        payload: {
          testPayload,
          testResult,
          testType,
          testedAt: new Date().toISOString()
        } as any,
        processed: testResult.success,
        error: testResult.error
      }
    })

    // Mettre à jour le webhook avec la dernière activité
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { lastTriggered: new Date() }
    })

    console.log(`${testResult.success ? '✅' : '❌'} Test webhook terminé:`, testResult)

    return NextResponse.json({
      success: true,
      testResult,
      payload: testPayload,
      message: testResult.success 
        ? 'Webhook testé avec succès !' 
        : `Échec du test: ${testResult.error}`
    })

  } catch (error) {
    console.error('❌ Erreur lors du test du webhook:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
