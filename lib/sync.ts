import { prisma } from './db'
import { EmeliaAPIClient, EmeliaActivity, EmeliaCampaign } from './emelia'
import { classifyResponse } from './ai-classifier'

export async function syncClientReplies(clientId: string, apiKey: string, code3: string) {
  const emeliClient = new EmeliaAPIClient(apiKey)
  
  try {
    console.log(`🔄 Starting REPLIES SYNC for client ${clientId} with code ${code3}`)
    
    // 1. Get all campaigns for this client
    const allCampaigns = await emeliClient.getCampaigns()
    const filteredCampaigns = emeliClient.filterCampaignsByCode(allCampaigns, code3)
    
    console.log(`Found ${filteredCampaigns.length} campaigns to sync replies from`)
    
    let totalReplies = 0
    
    for (const campaign of filteredCampaigns) {
      const campaignId = emeliClient.getCampaignId(campaign)
      if (!campaignId) continue
      
      // Get stored campaign
      const storedCampaign = await prisma.campaign.findFirst({
        where: {
          clientId,
          emeliaId: campaignId
        }
      })
      
      if (!storedCampaign) continue
      
      console.log(`🔍 Fetching replies for campaign: ${campaign.name}`)
      
      let cursor: string | undefined
      let campaignReplies = 0
      
      // Use pagination to get all activities
      do {
        try {
          const response = await emeliClient.getCampaignActivities(campaignId, cursor)
          const activities = response.activities || []
          
          for (const activity of activities) {
            // Only process reply activities
            if (activity.event?.toUpperCase() === 'REPLY' || activity.event?.toUpperCase() === 'REPLIED') {
              try {
                // Check if this reply already exists to avoid duplicates
                const existingMessage = await prisma.message.findFirst({
                  where: {
                    messageId: activity.id,
                    thread: { clientId }
                  }
                })
                
                if (!existingMessage) {
                  await processReplyActivity(clientId, storedCampaign.id, activity)
                  campaignReplies++
                }
              } catch (replyError) {
                console.error(`Error processing reply ${activity.id}:`, replyError)
              }
            }
          }
          
          cursor = response.nextCursor
        } catch (pageError) {
          console.error(`Error processing activities page for campaign ${campaignId}:`, pageError)
          break
        }
      } while (cursor)
      
      console.log(`📧 Found ${campaignReplies} new replies for campaign: ${campaign.name}`)
      totalReplies += campaignReplies
    }
    
    console.log(`✅ Replies sync completed: ${totalReplies} total replies processed`)
    return { success: true, totalReplies }
    
  } catch (error) {
    console.error(`❌ Replies sync failed for client ${clientId}:`, error)
    throw error
  }
}

export async function backfillClient(clientId: string, apiKey: string, code3: string) {
  const emeliClient = new EmeliaAPIClient(apiKey)
  
  try {
    console.log(`🚀 Starting COMPLETE HISTORICAL BACKFILL for client ${clientId} with code ${code3}`)
    
    // 1. Get campaigns and filter by code3
    const allCampaigns = await emeliClient.getCampaigns()
    const filteredCampaigns = emeliClient.filterCampaignsByCode(allCampaigns, code3)
    
    console.log(`Found ${filteredCampaigns.length} campaigns for client ${clientId} with code ${code3}`)
    
    // 2. Store campaigns
    for (const campaign of filteredCampaigns) {
      // Get the campaign ID (handles both _id and id)
      const campaignId = emeliClient.getCampaignId(campaign);
      
      // Skip campaigns without valid ID
      if (!campaignId) {
        console.warn(`Skipping campaign "${campaign.name}" - missing or invalid ID:`, { _id: campaign._id, id: campaign.id })
        continue
      }

      // Check if campaign already exists
      const existingCampaign = await prisma.campaign.findFirst({
        where: {
          clientId: clientId,
          emeliaId: campaignId
        }
      })

      if (existingCampaign) {
        // Update existing campaign
        await prisma.campaign.update({
          where: { id: existingCampaign.id },
          data: {
            name: campaign.name,
            lastEventAt: new Date(),
          }
        })
        console.log(`📝 Updated existing campaign: ${campaign.name}`)
      } else {
        // Create new campaign
        await prisma.campaign.create({
          data: {
            clientId,
            emeliaId: campaignId,
            name: campaign.name,
            createdAt: new Date(campaign.createdAt),
          }
        })
        console.log(`➕ Created new campaign: ${campaign.name}`)
      }
    }
    
    // 3. HISTORICAL REPLIES SYNC - Get ALL replies from all campaigns
    console.log(`📧 Starting HISTORICAL REPLIES SYNC...`)
    const historicalData = await emeliClient.getAllHistoricalReplies(code3)
    
    let totalRepliesProcessed = 0
    
    for (const { campaignId, campaignName, replies } of historicalData) {
      console.log(`Processing ${replies.length} historical replies for campaign: ${campaignName}`)
      
      // Get the stored campaign from DB
      const storedCampaign = await prisma.campaign.findFirst({
        where: {
          clientId,
          emeliaId: campaignId
        }
      })
      
      if (!storedCampaign) {
        console.error(`❌ Campaign ${campaignName} not found in database, skipping replies`)
        continue
      }
      
      // Process each reply
      for (const reply of replies) {
        try {
          await processReplyActivity(clientId, storedCampaign.id, reply)
          totalRepliesProcessed++
        } catch (error) {
          console.error(`Error processing reply for ${campaignName}:`, error)
        }
      }
      
      // Update campaign lastEventAt
      await prisma.campaign.update({
        where: { id: storedCampaign.id },
        data: { lastEventAt: new Date() }
      })
    }
    
    console.log(`✅ HISTORICAL REPLIES SYNC COMPLETED: ${totalRepliesProcessed} replies processed`)
    
    // 4. Get stats for each campaign to update KPIs
    const totalStats = {
      sent: 0,
      delivered: 0,
      opens: 0,
      clicks: 0,
      replies: 0,
      bounces: 0,
      unsubs: 0,
    }
    
    for (const campaign of filteredCampaigns) {
      console.log(`Getting stats for campaign ${campaign.name}`)
      
      // Get campaign stats using the real API endpoint
      let stats = {
        sent: 0,
        delivered: 0,
        opens: 0,
        clicks: 0,
        replies: 0,
        bounces: 0,
        unsubs: 0
      }
      
      const campaignId = emeliClient.getCampaignId(campaign);
      if (campaignId) {
        console.log(`Getting stats for campaign ${campaign.name} (ID: ${campaignId})`)
        try {
          const campaignStats = await emeliClient.getCampaignStats(campaignId)
          stats = {
            sent: campaignStats.sent,
            delivered: campaignStats.delivered,
            opens: campaignStats.opens,
            clicks: campaignStats.clicks,
            replies: campaignStats.replies,
            bounces: campaignStats.bounces,
            unsubs: campaignStats.unsubscribes
          }
          console.log(`Stats retrieved for ${campaign.name}:`, stats)
        } catch (error) {
          console.error(`Failed to get stats for campaign ${campaign.name}:`, error.message)
          // Fallback to activities processing if stats fail
          try {
            stats = await processCampaignActivities(clientId, campaign, emeliClient)
          } catch (activityError) {
            console.error(`Failed to get activities for campaign ${campaign.name}:`, activityError.message)
          }
        }
      } else {
        console.log(`No valid campaign ID for ${campaign.name}, trying activities`)
        try {
          stats = await processCampaignActivities(clientId, campaign, emeliClient)
        } catch (error) {
          console.error(`Failed to get activities for campaign ${campaign.name}:`, error.message)
        }
      }
      
      // Accumulate stats
      totalStats.sent += stats.sent
      // Calculate actual delivered (delivered - bounces) for proper display
      totalStats.delivered += Math.max(0, stats.delivered - stats.bounces)
      totalStats.opens += stats.opens
      totalStats.clicks += stats.clicks
      totalStats.replies += stats.replies
      totalStats.bounces += stats.bounces
      totalStats.unsubs += stats.unsubs
    }
    
    // 4. Count interested threads
    const interestedCount = await prisma.thread.count({
      where: {
        clientId,
        label: 'INTERESSE'
      }
    })
    
    // 5. Update client KPIs
    await prisma.clientKpis.upsert({
      where: { clientId },
      update: {
        ...totalStats,
        interested: interestedCount,
        computedAt: new Date(),
      },
      create: {
        clientId,
        ...totalStats,
        interested: interestedCount,
      }
    })
    
    // 6. Update client lastSyncAt
    await prisma.client.update({
      where: { id: clientId },
      data: { lastSyncAt: new Date() }
    })
    
    console.log(`Backfill completed for client ${clientId}`)
  } catch (error) {
    console.error(`Backfill failed for client ${clientId}:`, error)
    throw error
  }
}

export async function resyncClient(clientId: string, apiKey: string, code3: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  })
  
  if (!client) {
    throw new Error(`Client ${clientId} not found`)
  }
  
  // For resync, we use the same logic as backfill but could optimize by using lastSyncAt
  // to only fetch recent activities (if Emelia API supports it)
  await backfillClient(clientId, apiKey, code3)
}

// New function specifically for full historical sync of responses
export async function fullHistoricalSync(clientId: string, apiKey: string, code3: string) {
  const emeliClient = new EmeliaAPIClient(apiKey)
  
  try {
    console.log(`🔄 Starting FULL HISTORICAL RESPONSE SYNC for client ${clientId} with code ${code3}`)
    
    // 1. Ensure campaigns are created/updated first
    const allCampaigns = await emeliClient.getCampaigns()
    const filteredCampaigns = emeliClient.filterCampaignsByCode(allCampaigns, code3)
    
    console.log(`Found ${filteredCampaigns.length} campaigns for historical sync`)
    
    // 2. Store/update campaigns in database
    for (const campaign of filteredCampaigns) {
      const campaignId = emeliClient.getCampaignId(campaign)
      if (!campaignId) continue

      await prisma.campaign.upsert({
        where: {
          clientId_emeliaId: {
            clientId: clientId,
            emeliaId: campaignId
          }
        },
        update: {
          name: campaign.name,
          lastEventAt: new Date()
        },
        create: {
          clientId,
          emeliaId: campaignId,
          name: campaign.name,
          createdAt: new Date(campaign.createdAt)
        }
      })
    }
    
    // 3. Get ALL historical replies using the new comprehensive method
    const historicalData = await emeliClient.getAllHistoricalReplies(code3)
    
    let totalRepliesProcessed = 0
    let newRepliesAdded = 0
    
    for (const { campaignId, campaignName, replies } of historicalData) {
      console.log(`🔍 Processing ${replies.length} historical replies for: ${campaignName}`)
      
      const storedCampaign = await prisma.campaign.findFirst({
        where: {
          clientId,
          emeliaId: campaignId
        }
      })
      
      if (!storedCampaign) {
        console.error(`❌ Campaign ${campaignName} not found in database`)
        continue
      }
      
      for (const reply of replies) {
        try {
          // Check if this reply already exists
          const existingMessage = await prisma.message.findFirst({
            where: {
              messageId: reply._id,
              thread: { clientId }
            }
          })
          
          if (!existingMessage) {
            await processReplyActivity(clientId, storedCampaign.id, reply)
            newRepliesAdded++
          }
          
          totalRepliesProcessed++
        } catch (error) {
          console.error(`Error processing historical reply:`, error)
        }
      }
      
      // Update campaign timestamp
      await prisma.campaign.update({
        where: { id: storedCampaign.id },
        data: { lastEventAt: new Date() }
      })
    }
    
    // 4. Update client sync timestamp
    await prisma.client.update({
      where: { id: clientId },
      data: { lastSyncAt: new Date() }
    })
    
    console.log(`✅ FULL HISTORICAL SYNC COMPLETED`)
    console.log(`   📊 Total replies processed: ${totalRepliesProcessed}`)
    console.log(`   ➕ New replies added: ${newRepliesAdded}`)
    console.log(`   📈 Campaigns synced: ${historicalData.length}`)
    
    return {
      success: true,
      totalRepliesProcessed,
      newRepliesAdded,
      campaignsSynced: historicalData.length,
      message: `Historical sync completed: ${newRepliesAdded} new replies added from ${totalRepliesProcessed} total processed`
    }
    
  } catch (error) {
    console.error(`❌ Full historical sync failed for client ${clientId}:`, error)
    throw error
  }
}

async function processCampaignActivities(
  clientId: string, 
  campaign: EmeliaCampaign, 
  emeliClient: EmeliaAPIClient
) {
  const stats = {
    sent: 0,
    delivered: 0,
    opens: 0,
    clicks: 0,
    replies: 0,
    bounces: 0,
    unsubs: 0,
  }
  
  // Get the campaign ID (handles both _id and id)
  const campaignId = emeliClient.getCampaignId(campaign);
  
  // Skip campaigns without valid ID
  if (!campaignId) {
    console.warn(`Skipping activities for campaign "${campaign.name}" - missing or invalid ID:`, { _id: campaign._id, id: campaign.id })
    return stats
  }
  
  // Get stored campaign
  const storedCampaign = await prisma.campaign.findFirst({
    where: {
      clientId,
      emeliaId: campaignId
    }
  })
  
  if (!storedCampaign) return stats
  
  // Try to get activities from the campaign and calculate stats manually
  try {
    console.log(`Processing activities for campaign ${campaign.name} (fallback method)`)
    let cursor: string | undefined
    let totalProcessed = 0
    let repliesProcessed = 0
    
    // Use pagination to get all activities
    do {
      try {
        const response = await emeliClient.getCampaignActivities(campaignId, cursor)
        const activities = response.activities || []
        
        for (const activity of activities) {
          // Count activities by type for stats
          switch (activity.event?.toUpperCase()) {
            case 'SENT':
              stats.sent++
              break
            case 'DELIVERED':
              stats.delivered++
              break
            case 'OPEN':
            case 'FIRST_OPEN':
              stats.opens++
              break
            case 'CLICK':
            case 'CLICKED':
              stats.clicks++
              break
            case 'REPLY':
            case 'REPLIED':
              stats.replies++
              // Process the reply message
              try {
                await processReplyActivity(clientId, storedCampaign.id, activity)
                repliesProcessed++
              } catch (replyError) {
                console.error(`Error processing reply for ${activity.email}:`, replyError)
              }
              break
            case 'BOUNCE':
            case 'BOUNCED':
              stats.bounces++
              break
            case 'UNSUBSCRIBE':
            case 'UNSUBSCRIBED':
              stats.unsubs++
              break
          }
          totalProcessed++
        }
        
        cursor = response.nextCursor
      } catch (pageError) {
        console.error(`Error processing activities page for campaign ${campaignId}:`, pageError)
        break // Exit the loop on error
      }
    } while (cursor)
    
    console.log(`Processed ${totalProcessed} activities for campaign ${campaign.name} (${repliesProcessed} replies):`, stats)
  } catch (error) {
    console.error(`Error processing activities for campaign ${campaignId}:`, error)
    // Return basic stats based on campaign info if available
    if (campaign.stats) {
      return {
        sent: campaign.stats.sent || 0,
        delivered: campaign.stats.delivered || campaign.stats.sent || 0,
        opens: campaign.stats.opens || 0,
        clicks: campaign.stats.clicks || 0,
        replies: campaign.stats.replies || 0,
        bounces: campaign.stats.bounces || 0,
        unsubs: campaign.stats.unsubscribes || 0,
      }
    }
  }
  
  return stats
}

async function processActivity(
  clientId: string,
  campaignId: string,
  activity: EmeliaActivity,
  stats: {
    sent: number
    delivered: number
    opens: number
    clicks: number
    replies: number
    bounces: number
    unsubs: number
  }
) {
  // Update stats based on activity event type
  switch (activity.event.toUpperCase()) {
    case 'SENT':
      stats.sent++
      break
    case 'DELIVERED':
      stats.delivered++
      break
    case 'FIRST_OPEN':
    case 'OPENED':
      stats.opens++
      break
    case 'CLICKED':
      stats.clicks++
      break
    case 'REPLIED':
    case 'RE_REPLY':
      stats.replies++
      await processReplyActivity(clientId, campaignId, activity)
      break
    case 'BOUNCED':
      stats.bounces++
      break
    case 'UNSUBSCRIBED':
      stats.unsubs++
      break
  }
}

async function processReplyActivity(clientId: string, campaignId: string, activity: EmeliaActivity) {
  // Find or create thread
  let thread = await prisma.thread.findFirst({
    where: {
      clientId,
      campaignId,
      prospectEmail: activity.contact.email
    }
  })
  
  // Get the message content and subject from the activity
  // Use the actual reply text if available, otherwise create a detailed message with contact information
  const contactName = [activity.contact.firstName, activity.contact.lastName]
    .filter(Boolean)
    .join(' ') || 'Contact'
    
  const companyInfo = activity.contact.custom?.organizationname ? 
    ` de ${activity.contact.custom.organizationname}` : ''
    
  const titleInfo = activity.contact.custom?.title ? 
    ` (${activity.contact.custom.title})` : ''
    
  const dateFormatted = new Date(activity.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric', 
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Use the actual reply content if available
  let messageContent: string;
  if (activity.reply) {
    messageContent = `📩 Réponse de ${contactName}${companyInfo}${titleInfo}
Email: ${activity.contact.email}
Date: ${dateFormatted}

💬 Contenu de la réponse:
"${activity.reply}"

📈 Informations du contact:
• Statut: ${activity.contact.status}${companyInfo ? '\n• Entreprise: ' + activity.contact.custom.organizationname : ''}${titleInfo ? '\n• Fonction: ' + activity.contact.custom.title : ''}`
  } else {
    // Fallback to previous format if no reply text is available
    messageContent = `Réponse de ${contactName}${companyInfo}${titleInfo}

Email: ${activity.contact.email}
Date: ${dateFormatted}

📩 Ce prospect a répondu à votre campagne.

📝 Pour consulter le contenu exact de la réponse, connectez-vous directement à votre interface Emelia.

📈 Informations du contact:
• Statut: ${activity.contact.status}
• Dernière ouverture: ${activity.contact.lastOpen ? new Date(activity.contact.lastOpen).toLocaleDateString('fr-FR') : 'N/A'}${companyInfo ? '\n• Entreprise: ' + activity.contact.custom.organizationname : ''}${titleInfo ? '\n• Fonction: ' + activity.contact.custom.title : ''}`
  }
    
  console.log(`💬 Processing detailed reply from ${contactName}: ${activity.contact.email}${activity.reply ? ` - "${activity.reply.substring(0, 50)}..."` : ' (no reply text)'}`)
  const subject = `Réponse à la campagne` // We don't have subject in reply activities
  
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        clientId,
        campaignId,
        prospectEmail: activity.contact.email,
        subject: subject,
        firstAt: new Date(activity.date),
        lastAt: new Date(activity.date),
      }
    })
  } else {
    // Update thread lastAt
    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        lastAt: new Date(activity.date),
      }
    })
  }
  
  // (contactName already defined above in messageContent creation)
  
  // Check if we already processed this specific reply
  const existingMessage = await prisma.message.findFirst({
    where: {
      threadId: thread.id,
      messageId: activity._id,
      direction: 'INBOUND'
    }
  })
  
  if (!existingMessage) {
    // Create message with Emelia's activity ID as messageId
    await prisma.message.create({
      data: {
        threadId: thread.id,
        direction: 'INBOUND', // Reply is always inbound
        at: new Date(activity.date),
        fromAddr: activity.contact.email,
        text: messageContent,
        messageId: activity._id, // Use Emelia's activity ID
        raw: activity,
      }
    })
    
    console.log(`✅ Created detailed reply message from ${contactName} (${activity.contact.email})`)
    console.log(`   📅 Date: ${dateFormatted}`)
    console.log(`   🏢 Company: ${activity.contact.custom?.organizationname || 'N/A'}`)
    console.log(`   💼 Title: ${activity.contact.custom?.title || 'N/A'}`)
    console.log(`   📝 Message length: ${messageContent.length} characters`)
  }
  
  // Use Emelia's classification if available, otherwise classify manually
  if (!thread.label) {
    let label = 'NEUTRE'
    let confidence = 0.5
    
    // Check for sentiment classification at the activity level (new format)
    if (activity.sentiment?.classification) {
      const sentimentClassifications = activity.sentiment.classification.split(',')
      const mappings = {
        'INTERESTED': 'INTERESSE',
        'NOT_INTERESTED': 'PAS_INTERESSE',
        'OUT_OF_OFFICE': 'INJOIGNABLE',
        'DELEGATION': 'A_RAPPELER',
        'QUESTION_ASK': 'INTERESSE', // Questions often indicate interest
        'HOSTILE': 'PAS_INTERESSE',
        'NEUTRAL': 'NEUTRE',
        'INCOMPREHENSION': 'NEUTRE'
      }
      
      // Use the first classification that matches our mappings
      for (const classification of sentimentClassifications) {
        const trimmedClassification = classification.trim()
        if (mappings[trimmedClassification as keyof typeof mappings]) {
          label = mappings[trimmedClassification as keyof typeof mappings]
          confidence = activity.sentiment.score
          console.log(`Using Emelia sentiment classification: ${trimmedClassification} -> ${label} (${confidence})`)
          break
        }
      }
    } else if (activity.customData?.sentiment?.classification) {
      // Fallback to old format classification
      const emeliClassification = activity.customData.sentiment.classification
      const mappings = {
        'NOT_INTERESTED': 'PAS_INTERESSE',
        'INTERESTED': 'INTERESSE',  
        'OUT_OF_OFFICE': 'INJOIGNABLE',
        'CALLBACK': 'A_RAPPELER',
        'UNSUBSCRIBE': 'OPT_OUT'
      }
      
      label = mappings[emeliClassification as keyof typeof mappings] || 'NEUTRE'
      confidence = activity.customData.sentiment.score
      
      console.log(`Using Emelia customData classification: ${emeliClassification} -> ${label} (${confidence})`)
    } else if (messageContent) {
      // Fallback to our heuristic classification
      try {
        const classification = await classifyResponse(messageContent, subject)
        label = classification.label
        confidence = classification.confidence
      } catch (error) {
        console.error('Classification error:', error)
        label = applyHeuristicClassification(messageContent)
        confidence = 0.6
      }
    }
    
    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        label,
        confidence,
      }
    })
  }
}

function applyHeuristicClassification(content: string): string {
  const lowerContent = content.toLowerCase()
  
  // French patterns
  if (lowerContent.includes('intéressé') || 
      lowerContent.includes('interest') || 
      lowerContent.includes('book a call') ||
      lowerContent.includes('rendez-vous') ||
      lowerContent.includes('appelez') ||
      lowerContent.includes('contactez')) {
    return 'INTERESSE'
  }
  
  if (lowerContent.includes('rappel') || 
      lowerContent.includes('plus tard') ||
      lowerContent.includes('call back') ||
      lowerContent.includes('later')) {
    return 'A_RAPPELER'
  }
  
  if (lowerContent.includes('not interested') || 
      lowerContent.includes('pas intéressé') ||
      lowerContent.includes('not relevant') ||
      lowerContent.includes('no thanks')) {
    return 'PAS_INTERESSE'
  }
  
  if (lowerContent.includes('unsubscribe') || 
      lowerContent.includes('remove') ||
      lowerContent.includes('désabonner') ||
      lowerContent.includes('stop') ||
      lowerContent.includes('opt out')) {
    return 'OPT_OUT'
  }
  
  if (lowerContent.includes('out of office') || 
      lowerContent.includes('absent') ||
      lowerContent.includes('vacation') ||
      lowerContent.includes('unavailable')) {
    return 'INJOIGNABLE'
  }
  
  return 'NEUTRE'
}