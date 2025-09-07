#!/bin/bash

# Test script pour explorer les endpoints Emelia API
# Usage: ./test-emelia-endpoints.sh YOUR_API_KEY

API_KEY="$1"
BASE_URL="https://api.emelia.io"

if [ -z "$API_KEY" ]; then
    echo "❌ Usage: ./test-emelia-endpoints.sh YOUR_API_KEY"
    exit 1
fi

echo "🔍 Testing Emelia API endpoints for message content..."
echo "🔑 Using API Key: ${API_KEY:0:10}..."
echo ""

# Common headers
HEADERS="Authorization: Bearer $API_KEY"

# Test 1: Get user info
echo "📋 1. Testing /me endpoint..."
curl -s -H "$HEADERS" "$BASE_URL/me" | jq -r '.id // "FAILED"' | head -1
echo ""

# Test 2: Get campaigns (to find a campaign ID)
echo "📋 2. Getting campaigns..."
CAMPAIGN_ID=$(curl -s -H "$HEADERS" "$BASE_URL/campaigns" | jq -r '.campaigns[0]._id // .campaigns[0].id // "NONE"')
echo "Found campaign ID: $CAMPAIGN_ID"
echo ""

if [ "$CAMPAIGN_ID" != "NONE" ] && [ "$CAMPAIGN_ID" != "null" ]; then
    echo "📋 3. Testing campaign-specific endpoints..."
    
    # Test campaign activities with different params
    echo "  🔍 3a. Campaign activities (basic):"
    curl -s -H "$HEADERS" "$BASE_URL/campaigns/$CAMPAIGN_ID/activities?limit=1" | jq -r '.activities[0].event // "NO_ACTIVITIES"'
    
    echo "  🔍 3b. Campaign activities (with message content):"
    curl -s -H "$HEADERS" "$BASE_URL/campaigns/$CAMPAIGN_ID/activities?limit=1&include=message,reply,content" | jq -r '.activities[0] | keys[]' 2>/dev/null || echo "FAILED"
    
    echo "  🔍 3c. Campaign messages endpoint:"
    curl -s -H "$HEADERS" "$BASE_URL/campaigns/$CAMPAIGN_ID/messages?limit=1" | jq -r '.messages[0].content // .messages[0].text // "NO_MESSAGES"' 2>/dev/null || echo "ENDPOINT_NOT_FOUND"
    
    echo "  🔍 3d. Campaign replies endpoint:"
    curl -s -H "$HEADERS" "$BASE_URL/campaigns/$CAMPAIGN_ID/replies?limit=1" | jq -r '.replies[0].content // .replies[0].text // "NO_REPLIES"' 2>/dev/null || echo "ENDPOINT_NOT_FOUND"
    
    echo "  🔍 3e. Campaign conversations endpoint:"
    curl -s -H "$HEADERS" "$BASE_URL/campaigns/$CAMPAIGN_ID/conversations?limit=1" | jq -r '.conversations[0].messages[0].content // "NO_CONVERSATIONS"' 2>/dev/null || echo "ENDPOINT_NOT_FOUND"
fi

echo ""
echo "📋 4. Testing generic message endpoints..."

# Test 4: Generic message endpoints
echo "  🔍 4a. All messages:"
curl -s -H "$HEADERS" "$BASE_URL/messages?limit=1" | jq -r '.messages[0].content // .messages[0].text // "NO_MESSAGES"' 2>/dev/null || echo "ENDPOINT_NOT_FOUND"

echo "  🔍 4b. All replies:"
curl -s -H "$HEADERS" "$BASE_URL/replies?limit=1" | jq -r '.replies[0].content // .replies[0].text // "NO_REPLIES"' 2>/dev/null || echo "ENDPOINT_NOT_FOUND"

echo "  🔍 4c. All conversations:"
curl -s -H "$HEADERS" "$BASE_URL/conversations?limit=1" | jq -r '.conversations[0].messages[0].content // "NO_CONVERSATIONS"' 2>/dev/null || echo "ENDPOINT_NOT_FOUND"

echo ""
echo "📋 5. Testing GraphQL endpoint for messages..."

GRAPHQL_QUERY='{
  "query": "query GetMessages { messages(first: 1) { edges { node { id content text body } } } }"
}'

curl -s -X POST \
  -H "$HEADERS" \
  -H "Content-Type: application/json" \
  -d "$GRAPHQL_QUERY" \
  "$BASE_URL/graphql" | jq -r '.data.messages.edges[0].node.content // .errors[0].message // "GRAPHQL_FAILED"' 2>/dev/null || echo "GRAPHQL_ENDPOINT_NOT_FOUND"

echo ""
echo "✅ Test completed! Check the results above to see which endpoints work."
echo "💡 If any endpoint returns actual content, we can integrate it into the system."