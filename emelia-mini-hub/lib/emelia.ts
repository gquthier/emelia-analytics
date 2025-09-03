export interface EmeliaCampaign {
  _id: string;
  id?: string; // Keep id as optional for backward compatibility
  name: string;
  createdAt: string;
  status: string;
  stats?: {
    sent: number;
    delivered: number;
    opens: number;
    clicks: number;
    replies: number;
    bounces: number;
    unsubscribes: number;
  };
}

export interface EmeliaActivity {
  _id: string;
  contact: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    custom?: {
      organizationname?: string;
      title?: string;
    };
    status?: string;
    lastReplied?: string;
    lastOpen?: string;
  };
  event: string; // SENT, FIRST_OPEN, OPENED, CLICKED, REPLIED, RE_REPLY, BOUNCED, UNSUBSCRIBED
  date: string;
  step?: number;
  version?: number;
  reply?: string; // Le texte de la réponse quand event = "REPLIED"
  sentiment?: {
    classification: string; // INTERESTED,QUESTION_ASK,NEUTRAL,INCOMPREHENSION,OUT_OF_OFFICE,DELEGATION,NOT_INTERESTED,HOSTILE
    score: number;
    message: string;
  };
  customData?: {
    repliedTo?: string;
    sentiment?: {
      classification: string; // NOT_INTERESTED, OUT_OF_OFFICE, INTERESTED, etc.
      score: number;
      message: string;
      additionalData?: any;
    };
  };
  raw?: unknown;
}

export interface EmeliaContact {
  id: string;
  email: string;
  campaignId: string;
  status: string;
}

export interface EmeliaStats {
  sent: number;
  delivered: number;
  opens: number;
  clicks: number;
  replies: number;
  bounces: number;
  unsubscribes: number;
}

class EmeliaAPIClient {
  private apiKey: string;
  private baseUrl = 'https://api.emelia.io';
  private graphqlUrl = 'https://graphql.emelia.io/graphql';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getRESTHeaders() {
    return {
      'Authorization': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<unknown> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.getRESTHeaders(),
            ...options.headers,
          },
        });

        if (!response.ok) {
          if (response.status === 429 && i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            continue;
          }
          throw new Error(`Emelia API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  private async graphqlRequest(query: string, variables?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: this.getRESTHeaders(), // Use REST headers for GraphQL as well
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.getCampaigns();
      return true;
    } catch (error) {
      return false;
    }
  }

  async introspectGraphQLSchema(): Promise<any> {
    try {
      const query = `
        query IntrospectionQuery {
          __schema {
            queryType { name }
            types {
              name
              fields {
                name
                args {
                  name
                  type { name }
                }
                type { name }
              }
            }
          }
        }
      `;
      
      console.log('🔍 Introspecting GraphQL schema...');
      const data = await this.graphqlRequest(query);
      console.log('✅ GraphQL schema introspection successful');
      return data;
    } catch (error) {
      console.log('❌ GraphQL schema introspection failed:', error);
      return null;
    }
  }

  async getCampaigns(): Promise<EmeliaCampaign[]> {
    // Try GraphQL first
    try {
      const query = `
        query getCampaigns {
          campaigns {
            _id
            name
            createdAt
            status
            stats {
              sent
              delivered
              opens
              clicks
              replies
              bounces
              unsubscribes
            }
          }
        }
      `;
      
      const data = await this.graphqlRequest(query);
      return (data as any)?.campaigns || [];
    } catch (graphqlError) {
      console.log('GraphQL failed, trying REST:', graphqlError);
      
      // Fallback to REST
      try {
        const url = `${this.baseUrl}/emails/campaigns`;
        const data = await this.fetchWithRetry(url);
        return data.campaigns || data || [];
      } catch (restError) {
        console.error('Both GraphQL and REST failed:', { graphqlError, restError });
        throw new Error(`API access failed: GraphQL (${graphqlError.message}), REST (${restError.message})`);
      }
    }
  }

  async getCampaignActivities(campaignId: string, page: number = 1, eventType?: string, limit: number = 50): Promise<{
    activities: EmeliaActivity[];
    hasMore: boolean;
    totalCount?: number;
  }> {
    console.log(`🔍 Fetching activities for campaign ${campaignId}, page ${page} (limit: ${limit})${eventType ? `, filtering for: ${eventType}` : ''}...`);
    
    // Use the official Emelia endpoint - DON'T use parameters that cause 400 errors
    let url = `${this.baseUrl}/emails/campaigns/${campaignId}/activities`;
    
    // Only add pagination if page > 1, as page=1 seems to work without params
    if (page > 1) {
      const params = new URLSearchParams({
        page: page.toString(),
      });
      url = `${url}?${params}`;
    }
    
    // NOTE: Event type filtering causes 400 errors, so we filter client-side
    
    try {
      const data = await this.fetchWithRetry(url);
      const activities = data.activities || data.data || data || [];
      
      console.log(`✅ Official endpoint success: found ${Array.isArray(activities) ? activities.length : 0} activities on page ${page}`);
      
      // Check if there are more pages by seeing if we got a full page
      const hasMore = Array.isArray(activities) && activities.length >= limit;
      
      return {
        activities: Array.isArray(activities) ? activities : [],
        hasMore,
        totalCount: data.totalCount || data.total || activities.length
      };
      
    } catch (error) {
      console.error(`❌ Official endpoint failed for page ${page}: ${error.message}`);
      
      // Return empty result if the official endpoint fails
      return {
        activities: [],
        hasMore: false,
        totalCount: 0
      };
    }
  }

  private async getCampaignActivitiesREST(campaignId: string, page: number = 1, eventType?: string, limit: number = 30): Promise<{
    activities: EmeliaActivity[];
    hasMore: boolean;
    totalCount?: number;
  }> {
    console.log(`🔄 Falling back to REST endpoints for campaign ${campaignId}...`);
    
    // Try different endpoint variations that might work with Emelia API
    const endpoints = [
      `${this.baseUrl}/emails/campaigns/${campaignId}/activities`,
      `${this.baseUrl}/campaigns/${campaignId}/activities`,
      `${this.baseUrl}/v1/campaigns/${campaignId}/activities`,
      `${this.baseUrl}/emails/campaign/${campaignId}/activities`,
      `${this.baseUrl}/campaign/${campaignId}/events`,
      `${this.baseUrl}/emails/campaigns/${campaignId}/events`,
      // Try without specific campaign ID in URL
      `${this.baseUrl}/activities`,
      `${this.baseUrl}/events`,
    ]
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    // Add campaign ID as parameter if not in URL
    params.append('campaignId', campaignId);
    params.append('campaign_id', campaignId);
    params.append('campaign', campaignId);
    
    if (eventType) {
      params.append('type', eventType);
      params.append('event', eventType);
      params.append('eventType', eventType);
    }

    for (const baseEndpoint of endpoints) {
      const url = `${baseEndpoint}?${params}`;
      
      try {
        console.log(`Trying REST endpoint: ${url}`)
        const data = await this.fetchWithRetry(url);
        const activities = data.activities || data.data || data.events || data.results || data || [];
        
        if (Array.isArray(activities) && activities.length > 0) {
          console.log(`✅ REST success with endpoint: ${baseEndpoint}, found ${activities.length} activities`)
          
          return {
            activities,
            hasMore: activities.length === limit,
            totalCount: data.totalCount || data.total || data.count
          };
        }
      } catch (error) {
        console.log(`❌ Failed REST endpoint: ${baseEndpoint} - ${error.message}`);
        continue;
      }
    }
    
    // If all endpoints fail, log the issue and return empty
    console.error(`❌ All GraphQL and REST endpoints failed for campaign ${campaignId}`);
    return {
      activities: [],
      hasMore: false
    };
  }

  async getCampaignReplies(campaignId: string, forceFullSync: boolean = false): Promise<EmeliaActivity[]> {
    const allReplies: EmeliaActivity[] = []
    let page = 1
    let hasMore = true
    const maxPages = forceFullSync ? 1000 : 50 // ULTRA HIGH limits for maximum historical coverage
    
    console.log(`🎯 Fetching ${forceFullSync ? 'ALL HISTORICAL' : 'recent'} replies for campaign ${campaignId}...`)
    console.log(`💡 NEW APPROACH: Extracting replies from contact statuses, not events`)
    
    try {
      // NEW STRATEGY: Extract replies from contact statuses (not events)
      console.log(`📧 Scanning activities for contacts with REPLIED status...`)
      
      while (hasMore && page <= maxPages) {
        const { activities, hasMore: morePages } = await this.getCampaignActivities(campaignId, page, undefined, 50)
        
        // Extract contacts with REPLIED status from any activity
        const repliedContacts = activities.filter(activity => 
          activity.contact && 
          activity.contact.status === 'REPLIED' &&
          activity.contact.lastReplied
        )
        
        if (repliedContacts.length > 0) {
          console.log(`✅ Found ${repliedContacts.length} contacts with REPLIED status on page ${page}`)
          
          // Convert contact info to activity format for compatibility AND fetch real reply content
          const replyActivities = await Promise.all(repliedContacts.map(async activity => {
            console.log(`🔍 Fetching reply content for ${activity.contact.email}...`)
            
            // Try to get the actual reply content
            const replyContent = await this.getReplyContent(activity.contact._id)
            
            return {
              _id: `reply_${activity.contact._id}_${activity.contact.lastReplied}`,
              contact: activity.contact,
              event: 'REPLIED',
              date: activity.contact.lastReplied,
              step: activity.step || 0,
              version: activity.version || 0,
              customData: {
                extractedFromContactStatus: true,
                originalEvent: activity.event,
                // Store the actual reply content here!
                replyContent: replyContent || 'Contenu de la réponse non disponible',
                sentiment: {
                  message: replyContent || 'Réponse reçue - contenu non récupéré'
                }
              },
              raw: activity
            }
          }))
          
          allReplies.push(...replyActivities)
        }
        
        // Log progress for debugging
        if (page <= 5 || page % 25 === 0 || repliedContacts.length > 0) {
          const repliedCount = activities.filter(a => a.contact?.status === 'REPLIED').length
          const eventTypes = [...new Set(activities.map(a => a.event))]
          console.log(`📊 Page ${page}: ${activities.length} activities, ${repliedCount} replied contacts, events: ${eventTypes.join(', ')}`)
        }
        
        // Check if we should continue
        if (activities.length === 0) {
          console.log(`📄 Reached end at page ${page} (got ${activities.length} activities)`)
          break
        }
        
        hasMore = morePages
        page++
        
        // Optimized rate limiting for maximum coverage
        if (page % 25 === 0) {
          console.log(`⏸️ Major rate limiting pause at page ${page}/1000...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        } else if (page % 10 === 0) {
          console.log(`⏸️ Rate limiting pause at page ${page}...`)
          await new Promise(resolve => setTimeout(resolve, 500))
        } else if (page % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
    } catch (error) {
      console.error(`❌ Error fetching replies for campaign ${campaignId}:`, error)
    }
    
    // Remove duplicates based on contact ID + last replied date
    const uniqueReplies = allReplies.filter((reply, index, self) => 
      index === self.findIndex(r => 
        r.contact._id === reply.contact._id && 
        r.contact.lastReplied === reply.contact.lastReplied
      )
    )
    
    console.log(`🎯 Total unique replies found for campaign ${campaignId}: ${uniqueReplies.length} (${forceFullSync ? 'FULL SYNC' : 'incremental'})`)
    
    // Show details of found replies
    if (uniqueReplies.length > 0) {
      console.log(`📧 Reply details:`)
      uniqueReplies.slice(0, 3).forEach((reply, i) => {
        console.log(`  ${i+1}. ${reply.contact.email} (${reply.contact.firstName} ${reply.contact.lastName}) - ${reply.date}`)
      })
    }
    
    return uniqueReplies
  }

  async getCampaignContacts(campaignId: string, cursor?: string, limit: number = 100): Promise<{
    contacts: EmeliaContact[];
    nextCursor?: string;
  }> {
    const params = new URLSearchParams({
      campaignId,
      limit: limit.toString(),
    });
    
    if (cursor) {
      params.append('cursor', cursor);
    }

    const url = `${this.baseUrl}/emails/campaign/contacts?${params}`;
    const data = await this.fetchWithRetry(url);
    
    return {
      contacts: data.contacts || data || [],
      nextCursor: data.nextCursor
    };
  }

  async getCampaignStats(campaignId: string): Promise<EmeliaStats> {
    const params = new URLSearchParams({
      campaignId: campaignId,
      detailed: 'true'
    });

    const url = `${this.baseUrl}/stats?${params}`;
    try {
      const data = await this.fetchWithRetry(url);
      
      // Use the global stats from detailed response
      if (data.global) {
        return {
          sent: data.global.sent || 0,
          delivered: data.global.sent || 0, // Use sent as delivered approximation
          opens: data.global.first_open || 0,
          clicks: data.global.unique_clicked || 0,
          replies: data.global.replied || 0,
          bounces: data.global.bounced || 0,
          unsubscribes: data.global.unsubscribed || 0,
        };
      }
      
      // Fallback to simple response format
      return {
        sent: data.mailsSent || data.sent || 0,
        delivered: data.mailsSent || data.sent || 0,
        opens: data.opens || 0,
        clicks: data.linkClicked || data.clicked || 0,
        replies: data.replied || 0,
        bounces: data.bounced || 0,
        unsubscribes: data.unsubscribed || 0,
      };
    } catch (error) {
      console.error(`Failed to get stats for campaign ${campaignId}:`, error);
      return {
        sent: 0,
        delivered: 0,
        opens: 0,
        clicks: 0,
        replies: 0,
        bounces: 0,
        unsubscribes: 0,
      };
    }
  }

  filterCampaignsByCode(campaigns: EmeliaCampaign[], code3: string): EmeliaCampaign[] {
    return campaigns.filter(campaign => 
      campaign.name.toLowerCase().includes(code3.toLowerCase())
    );
  }

  // New method to get reply content from Emelia
  async getReplyContent(contactId: string, messageId?: string): Promise<string | null> {
    console.log(`💬 Fetching reply content for contact ${contactId}...`)
    
    // Try different endpoints to get message content
    const endpoints = [
      `${this.baseUrl}/contacts/${contactId}/messages`,
      `${this.baseUrl}/contacts/${contactId}/replies`,
      `${this.baseUrl}/contacts/${contactId}`,
      `${this.baseUrl}/messages/${contactId}`,
      `${this.baseUrl}/emails/contacts/${contactId}/messages`,
      `${this.baseUrl}/v1/contacts/${contactId}/messages`
    ]
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying reply endpoint: ${endpoint}`)
        const data = await this.fetchWithRetry(endpoint)
        
        // Look for message content in various response formats
        if (data.messages && Array.isArray(data.messages)) {
          const latestReply = data.messages.find(msg => 
            msg.direction === 'INBOUND' || 
            msg.type === 'reply' || 
            msg.isReply
          )
          if (latestReply?.content || latestReply?.text || latestReply?.body) {
            const content = latestReply.content || latestReply.text || latestReply.body
            console.log(`✅ Found reply content: "${content.substring(0, 100)}..."`)
            return content
          }
        }
        
        // Check if the contact object itself has reply info
        if (data.lastReplyContent || data.replyText || data.latestReply) {
          const content = data.lastReplyContent || data.replyText || data.latestReply
          console.log(`✅ Found reply in contact data: "${content.substring(0, 100)}..."`)
          return content
        }
        
        console.log(`❌ No reply content found in response from ${endpoint}`)
        
      } catch (error) {
        console.log(`❌ Failed endpoint ${endpoint}: ${error.message}`)
        continue
      }
    }
    
    console.log(`❌ Could not retrieve reply content for contact ${contactId}`)
    return null
  }

  // New method to get ALL historical replies for a client across all campaigns
  async getAllHistoricalReplies(code3: string): Promise<{
    campaignId: string;
    campaignName: string;
    replies: EmeliaActivity[];
  }[]> {
    console.log(`🚀 Starting COMPREHENSIVE HISTORICAL SYNC for client with code: ${code3}`)
    console.log(`📋 This will scan up to 1000 pages per campaign to find ALL replies`)
    console.log(`⚡ Ultra-optimized pagination with intelligent rate limiting`)
    
    // Get all campaigns for this client
    const allCampaigns = await this.getCampaigns()
    const filteredCampaigns = this.filterCampaignsByCode(allCampaigns, code3)
    
    console.log(`📊 Found ${filteredCampaigns.length} campaigns to sync historically`)
    
    const results = []
    let totalProcessedCampaigns = 0
    
    for (const campaign of filteredCampaigns) {
      const campaignId = this.getCampaignId(campaign)
      if (!campaignId) continue
      
      totalProcessedCampaigns++
      console.log(`\n🎯 [${totalProcessedCampaigns}/${filteredCampaigns.length}] Starting deep historical sync for campaign: ${campaign.name}`)
      console.log(`📄 Campaign ID: ${campaignId}`)
      
      try {
        // Force full sync for each campaign with maximum scanning
        const replies = await this.getCampaignReplies(campaignId, true)
        
        if (replies.length > 0) {
          results.push({
            campaignId,
            campaignName: campaign.name,
            replies
          })
          
          console.log(`✅ Historical sync completed for "${campaign.name}": ${replies.length} replies`)
          
          // Show sample of replies found
          replies.slice(0, 2).forEach((reply, i) => {
            console.log(`  ${i+1}. ${reply.contact.email} - ${reply.date}`)
          })
        } else {
          console.log(`ℹ️ No replies found for campaign: ${campaign.name}`)
        }
        
        // Add delay between campaigns to avoid rate limiting
        console.log(`⏸️ Waiting 2s before next campaign to avoid rate limits...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`❌ Failed to sync campaign "${campaign.name}":`, error)
        // Continue with next campaign even if one fails
        console.log(`⏭️ Continuing with next campaign...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    const totalReplies = results.reduce((sum, r) => sum + r.replies.length, 0)
    const campaignsWithReplies = results.filter(r => r.replies.length > 0).length
    
    console.log(`\n🎉 COMPREHENSIVE HISTORICAL SYNC COMPLETED!`)
    console.log(`📊 FINAL RESULTS:`)
    console.log(`   📧 Total replies found: ${totalReplies}`)
    console.log(`   📈 Campaigns with replies: ${campaignsWithReplies}/${filteredCampaigns.length}`)
    console.log(`   🔍 Total campaigns processed: ${totalProcessedCampaigns}`)
    
    if (results.length > 0) {
      console.log(`📋 CAMPAIGNS WITH REPLIES:`)
      results.forEach((result, i) => {
        console.log(`   ${i+1}. "${result.campaignName}": ${result.replies.length} replies`)
      })
    }
    
    return results
  }

  // Helper function to get the campaign ID (handles both _id and id)
  getCampaignId(campaign: EmeliaCampaign): string | undefined {
    return campaign._id || campaign.id;
  }
}

export { EmeliaAPIClient };