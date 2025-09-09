const { prisma } = require('./lib/db');
const { decryptApiKey } = require('./lib/crypto');

async function testDirectAPI() {
  console.log('🧪 TEST API DIRECT EMELIA\n');
  
  try {
    // Get client and API key
    const client = await prisma.client.findUnique({
      where: { id: 'cmewjxzzr00004wrea8xzkxg3' }
    });
    
    if (!client) {
      console.error('❌ Client not found');
      return;
    }
    
    const apiKey = decryptApiKey(client.apiKeyEnc);
    console.log(`📝 Testing API for client: ${client.name} (${client.code3})`);
    
    const baseUrl = 'https://api.emelia.io';
    const headers = {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    };
    
    // Test 1: Get campaigns
    console.log('\n📋 TEST 1: Getting campaigns...');
    const campaignsResponse = await fetch(`${baseUrl}/emails/campaigns`, { headers });
    const campaigns = await campaignsResponse.json();
    console.log(`✅ Found ${campaigns.campaigns?.length || 0} campaigns`);
    
    const targetCampaign = campaigns.campaigns?.find(c => c.name.includes(client.code3));
    if (!targetCampaign) {
      console.error('❌ No campaign found for this client');
      return;
    }
    
    console.log(`🎯 Target campaign: ${targetCampaign.name} (ID: ${targetCampaign._id})`);
    const campaignId = targetCampaign._id;
    
    // Test 2: Different endpoints for replies/activities
    const endpointsToTest = [
      `/emails/campaigns/${campaignId}/activities`,
      `/emails/campaigns/${campaignId}/replies`, 
      `/emails/campaigns/${campaignId}/messages`,
      `/emails/campaigns/${campaignId}/events`,
      `/campaigns/${campaignId}/activities`,
      `/campaigns/${campaignId}/replies`,
      `/campaigns/${campaignId}/messages`,
      `/activities?campaignId=${campaignId}`,
      `/replies?campaignId=${campaignId}`,
      `/messages?campaignId=${campaignId}`,
      `/events?campaignId=${campaignId}`,
    ];
    
    console.log('\n🔍 TEST 2: Testing different endpoints for replies...');
    
    for (const endpoint of endpointsToTest) {
      try {
        console.log(`\n📡 Testing: ${endpoint}`);
        const response = await fetch(`${baseUrl}${endpoint}`, { headers });
        
        if (response.ok) {
          const data = await response.json();
          const activities = data.activities || data.replies || data.messages || data.events || data.data || data;
          
          if (Array.isArray(activities) && activities.length > 0) {
            const eventTypes = [...new Set(activities.map(a => a.event || a.type))].filter(Boolean);
            const repliesFound = activities.filter(a => 
              a.event === 'REPLIED' || 
              a.event === 'RE_REPLY' || 
              a.type === 'REPLIED' || 
              a.type === 'reply' ||
              (a.content && a.content.toLowerCase().includes('re:'))
            );
            
            console.log(`  ✅ SUCCESS: ${activities.length} items`);
            console.log(`  📊 Event types: ${eventTypes.join(', ')}`);
            console.log(`  💬 Replies found: ${repliesFound.length}`);
            
            if (repliesFound.length > 0) {
              console.log(`  🎉 FOUND REPLIES! First reply:`, JSON.stringify(repliesFound[0], null, 2));
            }
          } else {
            console.log(`  ✅ SUCCESS: Empty response or non-array data`);
          }
        } else {
          console.log(`  ❌ FAILED: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Test 3: Pagination test on activities endpoint
    console.log('\n📄 TEST 3: Pagination test on activities endpoint...');
    for (let page = 1; page <= 5; page++) {
      try {
        const response = await fetch(`${baseUrl}/emails/campaigns/${campaignId}/activities?page=${page}`, { headers });
        if (response.ok) {
          const data = await response.json();
          const activities = data.activities || data || [];
          
          if (Array.isArray(activities) && activities.length > 0) {
            const eventTypes = [...new Set(activities.map(a => a.event))];
            const repliesFound = activities.filter(a => a.event === 'REPLIED' || a.event === 'RE_REPLY');
            
            console.log(`  📄 Page ${page}: ${activities.length} activities, events: ${eventTypes.join(', ')}, replies: ${repliesFound.length}`);
            
            if (repliesFound.length > 0) {
              console.log(`  🎉 FOUND REPLIES ON PAGE ${page}!`);
              break;
            }
          } else {
            console.log(`  📄 Page ${page}: Empty`);
            break;
          }
        } else {
          console.log(`  📄 Page ${page}: Failed (${response.status})`);
          break;
        }
      } catch (error) {
        console.log(`  📄 Page ${page}: Error - ${error.message}`);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } catch (error) {
    console.error('❌ Global error:', error);
  }
}

testDirectAPI().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});