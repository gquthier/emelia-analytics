import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { classifyResponse } from '@/lib/ai-classifier'

// Fonction pour envoyer vers Make
async function sendToMake(client: any, payload: EmeliaWebhookPayload, thread: any) {
  try {
    if (!client.makeWebhookUrl) {
      console.log('⚠️ URL Make non configurée pour le client:', client.name)
      return { success: false, error: 'No Make webhook URL configured' }
    }

    // Formater les données pour Make
    const makePayload = {
      // Données du prospect
      prospect: {
        email: payload.contact.email,
        firstName: payload.contact.firstName,
        lastName: payload.contact.lastName,
        company: payload.contact.company,
        phone: payload.contact.phoneNumber
      },
      
      // Données de la campagne
      campaign: {
        name: payload.campaign,
        step: payload.step,
        sender: payload.sender
      },
      
      // Réponse reçue
      reply: {
        text: payload.reply,
        date: payload.date,
        messageId: payload.messageId
      },
      
      // Analyse du sentiment
      sentiment: payload.sentiment,
      
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
        event: payload.event,
        processedAt: new Date().toISOString(),
        source: 'emelia-webhook',
        threadId: thread.id,
        label: thread.label,
        confidence: thread.confidence
      }
    }

    console.log('🚀 Envoi vers Make pour client:', client.name)
    
    const makeResponse = await fetch(client.makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Emelia-Mini-Hub/1.0'
      },
      body: JSON.stringify(makePayload)
    })

    if (makeResponse.ok) {
      console.log('✅ Données envoyées à Make avec succès')
      return { success: true, makeResponse: await makeResponse.json() }
    } else {
      console.error('❌ Erreur Make:', makeResponse.status, await makeResponse.text())
      return { success: false, error: `Make error: ${makeResponse.status}` }
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi vers Make:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

interface EmeliaWebhookPayload {
  event: string
  contact: {
    firstName?: string
    lastName?: string
    phoneNumber?: string
    email: string
    company?: string
  }
  date: string
  sender?: string
  campaign: string
  step?: number
  messageId?: string
  reply?: string
  sentiment?: {
    classification: string
    score: number
    message: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EmeliaWebhookPayload = await request.json()
    
    console.log('🔗 Webhook reçu d\'Emelia:', {
      event: body.event,
      campaign: body.campaign,
      email: body.contact?.email,
      reply: body.reply?.substring(0, 50) + '...' || 'N/A'
    })

    // Vérifier si c'est une réponse (seul event qui nous intéresse)
    if (body.event !== 'REPLIED') {
      console.log('📭 Event ignoré (pas une réponse):', body.event)
      return NextResponse.json({ status: 'ignored', reason: 'not_reply' })
    }

    // Extraire le code3 du nom de campagne
    const code3Match = body.campaign.match(/^([A-Za-z0-9]{3})/);
    if (!code3Match) {
      console.log('❌ Impossible d\'extraire le code3 du nom de campagne:', body.campaign)
      return NextResponse.json({ error: 'Invalid campaign name format' }, { status: 400 })
    }
    
    const code3 = code3Match[1].toUpperCase()

    // Trouver le client correspondant
    const client = await prisma.client.findFirst({
      where: {
        code3: code3
      },
      include: {
        campaigns: true,
        webhooks: true
      }
    })

    if (!client) {
      console.log(`❌ Client non trouvé pour le code3: ${code3}`)
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Vérifier si un webhook existe pour ce client
    const webhook = client.webhooks.find(w => 
      w.isActive && JSON.parse(w.events).includes('REPLIED')
    )
    
    if (!webhook) {
      console.log(`⚠️ Aucun webhook actif pour les réponses du client ${client.name}`)
      return NextResponse.json({ error: 'No active webhook for replies' }, { status: 404 })
    }

    // Enregistrer la livraison du webhook
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: body.event,
        payload: body as any,
        processed: false
      }
    })

    // Traitement de la réponse
    try {
      const thread = await processReply(client.id, body, delivery.id)
      
      // 🚀 NOUVEAU : Envoyer vers Make si la réponse est "INTERESSE"
      let makeResult = null
      if (thread && thread.label === 'INTERESSE') {
        console.log('🎯 Réponse INTERESSE détectée, envoi vers Make...')
        makeResult = await sendToMake(client, body, thread)
        
        // Sauvegarder le résultat Make dans le payload
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            payload: {
              ...body,
              makeResult
            } as any
          }
        })
      }
      
      // Marquer comme traité
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          processed: true,
          processedAt: new Date()
        }
      })

      // Mettre à jour le webhook
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggered: new Date()
        }
      })

      console.log('✅ Webhook traité avec succès')
      return NextResponse.json({ 
        status: 'processed',
        makeTriggered: makeResult?.success || false
      })

    } catch (error) {
      console.error('❌ Erreur lors du traitement du webhook:', error)
      
      // Marquer comme échoué
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date()
        }
      })

      return NextResponse.json(
        { error: 'Processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Erreur lors de la réception du webhook:', error)
    return NextResponse.json(
      { error: 'Invalid request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}

async function processReply(clientId: string, payload: EmeliaWebhookPayload, deliveryId: string) {
  // Trouver ou créer la campagne
  let campaign = await prisma.campaign.findFirst({
    where: {
      clientId,
      name: payload.campaign
    }
  })

  if (!campaign) {
    // Créer la campagne si elle n'existe pas
    campaign = await prisma.campaign.create({
      data: {
        clientId,
        emeliaId: `webhook_${Date.now()}`, // ID temporaire
        name: payload.campaign,
        lastEventAt: new Date(payload.date)
      }
    })
  }

  // Trouver ou créer le thread
  let thread = await prisma.thread.findFirst({
    where: {
      clientId,
      campaignId: campaign.id,
      prospectEmail: payload.contact.email
    }
  })

  const contactName = [payload.contact.firstName, payload.contact.lastName]
    .filter(Boolean)
    .join(' ') || 'Contact'
  
  const subject = `Réponse à ${payload.campaign}`

  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        clientId,
        campaignId: campaign.id,
        prospectEmail: payload.contact.email,
        subject,
        firstAt: new Date(payload.date),
        lastAt: new Date(payload.date)
      }
    })
  }

  // Créer le message avec le contenu de la réponse
  let messageContent: string
  if (payload.reply) {
    const companyInfo = payload.contact.company ? ` (${payload.contact.company})` : ''
    messageContent = `📩 Réponse de ${contactName}${companyInfo}
Email: ${payload.contact.email}
Date: ${new Date(payload.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}

💬 Contenu de la réponse:
"${payload.reply}"

📧 Expéditeur: ${payload.sender || 'N/A'}
🔗 Message ID: ${payload.messageId || 'N/A'}`
  } else {
    messageContent = `📩 Réponse reçue de ${contactName}
Email: ${payload.contact.email}
Date: ${new Date(payload.date).toLocaleDateString('fr-FR')}

⚠️ Contenu de la réponse non disponible dans le webhook`
  }

  // Vérifier si ce message existe déjà (éviter les doublons)
  const existingMessage = await prisma.message.findFirst({
    where: {
      threadId: thread.id,
      messageId: payload.messageId || `webhook_${deliveryId}`
    }
  })

  if (!existingMessage) {
    await prisma.message.create({
      data: {
        threadId: thread.id,
        direction: 'INBOUND',
        at: new Date(payload.date),
        fromAddr: payload.contact.email,
        toAddr: payload.sender,
        text: messageContent,
        messageId: payload.messageId || `webhook_${deliveryId}`
      }
    })
  }

  // Classification de la réponse
  if (!thread.label && payload.reply) {
    let label = 'NEUTRE'
    let confidence = 0.5

    // Utiliser la classification Emelia si disponible
    if (payload.sentiment?.classification) {
      const sentimentClassifications = payload.sentiment.classification.split(',')
      const mappings = {
        'INTERESTED': 'INTERESSE',
        'NOT_INTERESTED': 'PAS_INTERESSE', 
        'OUT_OF_OFFICE': 'INJOIGNABLE',
        'DELEGATION': 'A_RAPPELER',
        'QUESTION_ASK': 'INTERESSE',
        'HOSTILE': 'PAS_INTERESSE',
        'NEUTRAL': 'NEUTRE',
        'INCOMPREHENSION': 'NEUTRE'
      }

      for (const classification of sentimentClassifications) {
        const trimmedClassification = classification.trim()
        if (mappings[trimmedClassification as keyof typeof mappings]) {
          label = mappings[trimmedClassification as keyof typeof mappings]
          confidence = payload.sentiment.score
          break
        }
      }
    } else {
      // Classification avec notre système
      try {
        const classification = await classifyResponse(payload.reply, subject)
        label = classification.label
        confidence = classification.confidence
      } catch (error) {
        console.error('Erreur de classification:', error)
      }
    }

    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        label,
        confidence,
        lastAt: new Date(payload.date)
      }
    })
  }

  // Ajouter automatiquement au CRM si intéressé
  if (thread.label === 'INTERESSE') {
    await addToCRM(thread.id, clientId, payload.sentiment?.score || thread.confidence || undefined)
  }

  // Mettre à jour les KPIs du client
  await updateClientKPIs(clientId)
  
  console.log(`✅ Réponse traitée: ${contactName} (${payload.contact.email}) -> ${thread.label}`)
  
  // Retourner le thread pour l'utiliser dans Make
  return thread
}

async function addToCRM(threadId: string, clientId: string, score?: number) {
  try {
    // Vérifier si ce thread n'est pas déjà dans le CRM
    const existingCRMContact = await prisma.cRMContact.findFirst({
      where: { threadId }
    })

    if (existingCRMContact) {
      console.log(`📋 Contact déjà dans le CRM: ${threadId}`)
      return
    }

    // Créer le contact CRM
    const crmContact = await prisma.cRMContact.create({
      data: {
        clientId,
        threadId,
        status: 'INTERESSE',
        priority: score && score > 0.8 ? 'HAUTE' : 'NORMALE',
        score: score || undefined,
        notes: `Contact ajouté automatiquement depuis webhook (${new Date().toLocaleDateString('fr-FR')})`
      }
    })

    // Créer l'activité
    await prisma.cRMActivity.create({
      data: {
        contactId: crmContact.id,
        type: 'STATUS_CHANGE',
        details: `Contact ajouté automatiquement au CRM avec le statut INTERESSE`,
        metadata: {
          source: 'webhook',
          score: score
        }
      }
    })

    console.log(`📋 Contact ajouté au CRM: ${threadId} (score: ${score})`)

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout au CRM:', error)
  }
}

async function updateClientKPIs(clientId: string) {
  // Compter les réponses
  const repliesCount = await prisma.message.count({
    where: {
      thread: {
        clientId
      },
      direction: 'INBOUND'
    }
  })

  // Compter les intéressés
  const interestedCount = await prisma.thread.count({
    where: {
      clientId,
      label: 'INTERESSE'
    }
  })

  // Mettre à jour ou créer les KPIs
  await prisma.clientKpis.upsert({
    where: { clientId },
    update: {
      replies: repliesCount,
      interested: interestedCount,
      computedAt: new Date()
    },
    create: {
      clientId,
      replies: repliesCount,
      interested: interestedCount
    }
  })
}