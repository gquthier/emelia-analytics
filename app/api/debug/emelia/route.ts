import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptApiKey } from '@/lib/crypto'
import { EmeliaAPIClient } from '@/lib/emelia'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const action = searchParams.get('action') || 'schema'
    const campaignId = searchParams.get('campaignId')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId parameter required' }, { status: 400 })
    }

    // Get client and decrypt API key
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const apiKey = decryptApiKey(client.apiKeyEnc)
    const emeliClient = new EmeliaAPIClient(apiKey)

    console.log(`🔧 Debug action: ${action} for client: ${client.name}`)

    switch (action) {
      case 'schema':
        console.log('🔍 Running GraphQL schema introspection...')
        const schema = await emeliClient.introspectGraphQLSchema()
        return NextResponse.json({
          action: 'schema',
          client: { id: clientId, name: client.name },
          schema,
          timestamp: new Date().toISOString()
        })

      case 'campaigns':
        console.log('📋 Fetching campaigns...')
        const campaigns = await emeliClient.getCampaigns()
        const filteredCampaigns = emeliClient.filterCampaignsByCode(campaigns, client.code3)
        return NextResponse.json({
          action: 'campaigns',
          client: { id: clientId, name: client.name, code3: client.code3 },
          total: campaigns.length,
          filtered: filteredCampaigns.length,
          campaigns: filteredCampaigns,
          timestamp: new Date().toISOString()
        })

      case 'activities':
        if (!campaignId) {
          return NextResponse.json({ error: 'campaignId parameter required for activities action' }, { status: 400 })
        }
        console.log(`📊 Fetching activities for campaign: ${campaignId}`)
        const activities = await emeliClient.getCampaignActivities(campaignId, 1, undefined, 10)
        return NextResponse.json({
          action: 'activities',
          client: { id: clientId, name: client.name },
          campaignId,
          activities,
          timestamp: new Date().toISOString()
        })

      case 'replies':
        if (!campaignId) {
          return NextResponse.json({ error: 'campaignId parameter required for replies action' }, { status: 400 })
        }
        console.log(`💬 Fetching replies for campaign: ${campaignId}`)
        const replies = await emeliClient.getCampaignReplies(campaignId, false)
        return NextResponse.json({
          action: 'replies',
          client: { id: clientId, name: client.name },
          campaignId,
          repliesCount: replies.length,
          replies,
          summary: {
            total: replies.length,
            contacts: replies.map(r => ({
              email: r.contact.email,
              name: `${r.contact.firstName || ''} ${r.contact.lastName || ''}`.trim() || 'N/A',
              date: r.date,
              replyContent: r.customData?.replyContent || 'No content retrieved',
              hasContent: !!(r.customData?.replyContent || r.customData?.sentiment?.message),
              contentLength: (r.customData?.replyContent || r.customData?.sentiment?.message || '').length
            }))
          },
          timestamp: new Date().toISOString()
        })
        
      case 'test-reply-content':
        const contactId = searchParams.get('contactId')
        if (!contactId) {
          return NextResponse.json({ error: 'Contact ID required for test-reply-content action' }, { status: 400 })
        }
        
        console.log(`🧪 Testing reply content fetch for contact: ${contactId}`)
        const content = await emeliClient.getReplyContent(contactId)
        
        return NextResponse.json({
          action: 'test-reply-content',
          contactId,
          content,
          hasContent: !!content,
          contentLength: content?.length || 0,
          timestamp: new Date().toISOString()
        })

      case 'test-endpoint':
        if (!campaignId) {
          return NextResponse.json({ error: 'campaignId parameter required for test-endpoint action' }, { status: 400 })
        }
        console.log(`🧪 Testing direct endpoint for campaign: ${campaignId}`)
        
        // Test the official Emelia endpoint directly
        const endpoint = `/emails/campaigns/${campaignId}/activities`
        const url = `https://api.emelia.io${endpoint}`
        
        try {
          const response = await fetch(url, {
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json',
            }
          })
          
          const responseText = await response.text()
          let responseData
          try {
            responseData = JSON.parse(responseText)
          } catch {
            responseData = responseText
          }
          
          return NextResponse.json({
            action: 'test-endpoint',
            client: { id: clientId, name: client.name },
            campaignId,
            endpoint,
            url,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            response: responseData,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          return NextResponse.json({
            action: 'test-endpoint',
            client: { id: clientId, name: client.name },
            campaignId,
            endpoint,
            url,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          })
        }

      default:
        return NextResponse.json({ 
          error: `Unknown action: ${action}`,
          availableActions: ['schema', 'campaigns', 'activities', 'replies', 'test-reply-content', 'test-endpoint']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}