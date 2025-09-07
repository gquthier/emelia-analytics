import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptApiKey } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const { clientId } = await request.json()
    
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    // Get client and decrypt API key
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const apiKey = decryptApiKey(client.apiKeyEnc)
    const baseUrl = 'https://api.emelia.io'
    
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }

    const results = {
      timestamp: new Date().toISOString(),
      client: {
        id: clientId,
        name: client.name,
        code3: client.code3
      },
      endpoints: [] as Array<{
        name: string
        url: string
        status: string
        hasContent: boolean
        contentSample?: string
        error?: string
      }>
    }

    // Test 1: Get user info
    try {
      const userResponse = await fetch(`${baseUrl}/me`, { headers })
      const userData = await userResponse.json()
      results.endpoints.push({
        name: 'User Info (/me)',
        url: `${baseUrl}/me`,
        status: userResponse.ok ? 'SUCCESS' : 'FAILED',
        hasContent: !!userData.id,
        contentSample: userData.email || userData.id || 'No email/id found'
      })
    } catch (error) {
      results.endpoints.push({
        name: 'User Info (/me)',
        url: `${baseUrl}/me`,
        status: 'ERROR',
        hasContent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Get campaigns
    let campaignId: string | null = null
    try {
      const campaignsResponse = await fetch(`${baseUrl}/campaigns`, { headers })
      const campaignData = await campaignsResponse.json()
      campaignId = campaignData.campaigns?.[0]?._id || campaignData.campaigns?.[0]?.id
      
      results.endpoints.push({
        name: 'Campaigns (/campaigns)',
        url: `${baseUrl}/campaigns`,
        status: campaignsResponse.ok ? 'SUCCESS' : 'FAILED',
        hasContent: !!campaignId,
        contentSample: `Found ${campaignData.campaigns?.length || 0} campaigns, first ID: ${campaignId || 'none'}`
      })
    } catch (error) {
      results.endpoints.push({
        name: 'Campaigns (/campaigns)',
        url: `${baseUrl}/campaigns`,
        status: 'ERROR',
        hasContent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    if (campaignId) {
      // Test 3: Campaign activities (basic)
      try {
        const activitiesResponse = await fetch(`${baseUrl}/campaigns/${campaignId}/activities?limit=1`, { headers })
        const activitiesData = await activitiesResponse.json()
        const firstActivity = activitiesData.activities?.[0]
        
        results.endpoints.push({
          name: 'Campaign Activities (basic)',
          url: `${baseUrl}/campaigns/${campaignId}/activities`,
          status: activitiesResponse.ok ? 'SUCCESS' : 'FAILED',
          hasContent: !!firstActivity?.event,
          contentSample: firstActivity ? `Event: ${firstActivity.event}, Reply: ${firstActivity.reply ? `"${firstActivity.reply.substring(0, 50)}..."` : 'EMPTY'}` : 'No activities found'
        })
      } catch (error) {
        results.endpoints.push({
          name: 'Campaign Activities (basic)',
          url: `${baseUrl}/campaigns/${campaignId}/activities`,
          status: 'ERROR',
          hasContent: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Test 4: Campaign activities with include params
      try {
        const activitiesResponse = await fetch(`${baseUrl}/campaigns/${campaignId}/activities?limit=1&include=message,reply,content`, { headers })
        const activitiesData = await activitiesResponse.json()
        const firstActivity = activitiesData.activities?.[0]
        
        results.endpoints.push({
          name: 'Campaign Activities (with includes)',
          url: `${baseUrl}/campaigns/${campaignId}/activities?include=message,reply,content`,
          status: activitiesResponse.ok ? 'SUCCESS' : 'FAILED',
          hasContent: !!(firstActivity?.reply || firstActivity?.message?.content || firstActivity?.content),
          contentSample: firstActivity ? `Keys: ${Object.keys(firstActivity).join(', ')}` : 'No activities found'
        })
      } catch (error) {
        results.endpoints.push({
          name: 'Campaign Activities (with includes)',
          url: `${baseUrl}/campaigns/${campaignId}/activities?include=message,reply,content`,
          status: 'ERROR',
          hasContent: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Test 5: Campaign messages
      try {
        const messagesResponse = await fetch(`${baseUrl}/campaigns/${campaignId}/messages?limit=1`, { headers })
        const messagesData = await messagesResponse.json()
        
        results.endpoints.push({
          name: 'Campaign Messages',
          url: `${baseUrl}/campaigns/${campaignId}/messages`,
          status: messagesResponse.ok ? 'SUCCESS' : 'FAILED',
          hasContent: !!(messagesData.messages?.[0]?.content || messagesData.messages?.[0]?.text),
          contentSample: messagesData.messages?.[0] ? `Found message with keys: ${Object.keys(messagesData.messages[0]).join(', ')}` : 'No messages found'
        })
      } catch (error) {
        results.endpoints.push({
          name: 'Campaign Messages',
          url: `${baseUrl}/campaigns/${campaignId}/messages`,
          status: 'ERROR',
          hasContent: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Test 6: Campaign replies
      try {
        const repliesResponse = await fetch(`${baseUrl}/campaigns/${campaignId}/replies?limit=1`, { headers })
        const repliesData = await repliesResponse.json()
        
        results.endpoints.push({
          name: 'Campaign Replies',
          url: `${baseUrl}/campaigns/${campaignId}/replies`,
          status: repliesResponse.ok ? 'SUCCESS' : 'FAILED',
          hasContent: !!(repliesData.replies?.[0]?.content || repliesData.replies?.[0]?.text),
          contentSample: repliesData.replies?.[0] ? `Found reply with keys: ${Object.keys(repliesData.replies[0]).join(', ')}` : 'No replies found'
        })
      } catch (error) {
        results.endpoints.push({
          name: 'Campaign Replies',
          url: `${baseUrl}/campaigns/${campaignId}/replies`,
          status: 'ERROR',
          hasContent: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Test 7: Generic messages endpoint
    try {
      const messagesResponse = await fetch(`${baseUrl}/messages?limit=1`, { headers })
      const messagesData = await messagesResponse.json()
      
      results.endpoints.push({
        name: 'All Messages',
        url: `${baseUrl}/messages`,
        status: messagesResponse.ok ? 'SUCCESS' : 'FAILED',
        hasContent: !!(messagesData.messages?.[0]?.content || messagesData.messages?.[0]?.text),
        contentSample: messagesData.messages?.[0] ? `Found message with keys: ${Object.keys(messagesData.messages[0]).join(', ')}` : 'No messages found'
      })
    } catch (error) {
      results.endpoints.push({
        name: 'All Messages',
        url: `${baseUrl}/messages`,
        status: 'ERROR',
        hasContent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 8: Generic replies endpoint
    try {
      const repliesResponse = await fetch(`${baseUrl}/replies?limit=1`, { headers })
      const repliesData = await repliesResponse.json()
      
      results.endpoints.push({
        name: 'All Replies',
        url: `${baseUrl}/replies`,
        status: repliesResponse.ok ? 'SUCCESS' : 'FAILED',
        hasContent: !!(repliesData.replies?.[0]?.content || repliesData.replies?.[0]?.text),
        contentSample: repliesData.replies?.[0] ? `Found reply with keys: ${Object.keys(repliesData.replies[0]).join(', ')}` : 'No replies found'
      })
    } catch (error) {
      results.endpoints.push({
        name: 'All Replies',
        url: `${baseUrl}/replies`,
        status: 'ERROR',
        hasContent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 9: GraphQL for messages
    try {
      const graphqlQuery = {
        query: `query GetMessages { messages(first: 1) { edges { node { id content text body } } } }`
      }
      
      const graphqlResponse = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify(graphqlQuery)
      })
      const graphqlData = await graphqlResponse.json()
      
      results.endpoints.push({
        name: 'GraphQL Messages',
        url: `${baseUrl}/graphql`,
        status: graphqlResponse.ok ? 'SUCCESS' : 'FAILED',
        hasContent: !!(graphqlData.data?.messages?.edges?.[0]?.node?.content),
        contentSample: graphqlData.errors ? `GraphQL Error: ${graphqlData.errors[0]?.message}` : (graphqlData.data ? 'GraphQL Success' : 'No data')
      })
    } catch (error) {
      results.endpoints.push({
        name: 'GraphQL Messages',
        url: `${baseUrl}/graphql`,
        status: 'ERROR',
        hasContent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Summary
    const successCount = results.endpoints.filter(e => e.status === 'SUCCESS').length
    const withContentCount = results.endpoints.filter(e => e.hasContent).length
    
    return NextResponse.json({
      ...results,
      summary: {
        totalTests: results.endpoints.length,
        successful: successCount,
        withContent: withContentCount,
        recommendation: withContentCount > 0 ? 
          'Des endpoints retournent du contenu ! Nous pouvons les intégrer.' :
          'Aucun endpoint ne retourne de contenu de message. Utilisez les webhooks ou IMAP.'
      }
    })

  } catch (error) {
    console.error('Test endpoints error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}