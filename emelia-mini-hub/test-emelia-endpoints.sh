#!/bin/bash

echo "🧪 TEST ENDPOINTS EMELIA POUR RÉCUPÉRER LES RÉPONSES"
echo "=================================================="

# Variables
CLIENT_ID="cmewjxzzr00004wrea8xzkxg3"
CAMPAIGN_ID="688f6729f48fa50a7a697158"
BASE_URL="https://api.emelia.io"

# Récupération de la clé API via l'endpoint debug
echo "🔑 Récupération de la clé API..."
API_KEY=$(curl -s "http://localhost:3000/api/debug/emelia?clientId=$CLIENT_ID&action=campaigns" | jq -r '.campaigns[0] | keys[0]' 2>/dev/null || echo "")

echo "📝 Test des différents endpoints pour les réponses..."
echo "Campagne cible: $CAMPAIGN_ID"
echo ""

# Liste des endpoints à tester
endpoints=(
    "/emails/campaigns/$CAMPAIGN_ID/activities"
    "/emails/campaigns/$CAMPAIGN_ID/replies"
    "/emails/campaigns/$CAMPAIGN_ID/messages"  
    "/emails/campaigns/$CAMPAIGN_ID/events"
    "/campaigns/$CAMPAIGN_ID/activities"
    "/campaigns/$CAMPAIGN_ID/replies"
    "/campaigns/$CAMPAIGN_ID/messages"
    "/activities?campaignId=$CAMPAIGN_ID"
    "/replies?campaignId=$CAMPAIGN_ID"
    "/messages?campaignId=$CAMPAIGN_ID"
    "/events?campaignId=$CAMPAIGN_ID"
    "/emails/campaigns/$CAMPAIGN_ID/activities?event=REPLIED"
    "/emails/campaigns/$CAMPAIGN_ID/activities?type=REPLIED"
)

# Fonction pour tester un endpoint
test_endpoint() {
    local endpoint="$1"
    echo "🔍 Testing: $endpoint"
    
    # Test avec notre API key récupérée via debug
    response=$(curl -s "http://localhost:3000/api/debug/emelia?clientId=$CLIENT_ID&action=test-endpoint&campaignId=$CAMPAIGN_ID&endpoint=$endpoint")
    
    status=$(echo "$response" | jq -r '.status // "error"')
    
    if [ "$status" = "200" ]; then
        # Analyser les types d'événements
        events=$(echo "$response" | jq -r '.response.activities[]?.event // .response[]?.event // empty' | sort | uniq -c | head -10)
        count=$(echo "$response" | jq -r '.response.activities | length // .response | length // 0' 2>/dev/null || echo "0")
        
        echo "  ✅ SUCCESS: $count éléments"
        echo "  📊 Event types:"
        echo "$events" | sed 's/^/    /'
        
        # Chercher spécifiquement les réponses
        replies=$(echo "$response" | jq -r '.response.activities[]? | select(.event == "REPLIED" or .event == "RE_REPLY") // .response[]? | select(.event == "REPLIED" or .event == "RE_REPLY") // empty' | wc -l)
        if [ "$replies" -gt 0 ]; then
            echo "  🎉 FOUND $replies REPLIES!"
        fi
    else
        echo "  ❌ FAILED: HTTP $status"
    fi
    echo ""
}

# Test de tous les endpoints
for endpoint in "${endpoints[@]}"; do
    test_endpoint "$endpoint"
    sleep 0.5
done

# Test pagination approfondie
echo "📄 Test pagination approfondie sur l'endpoint activities..."
for page in {1..10}; do
    echo "📄 Page $page:"
    response=$(curl -s "http://localhost:3000/api/debug/emelia?clientId=$CLIENT_ID&action=test-endpoint&campaignId=$CAMPAIGN_ID&endpoint=/emails/campaigns/$CAMPAIGN_ID/activities?page=$page")
    
    status=$(echo "$response" | jq -r '.status // "error"')
    if [ "$status" = "200" ]; then
        count=$(echo "$response" | jq -r '.response.activities | length // 0' 2>/dev/null || echo "0")
        events=$(echo "$response" | jq -r '.response.activities[]?.event // empty' | sort | uniq -c)
        replies=$(echo "$response" | jq -r '.response.activities[]? | select(.event == "REPLIED" or .event == "RE_REPLY") // empty' | wc -l)
        
        echo "  📊 $count activités - Events: $(echo "$events" | tr '\n' ', ')"
        if [ "$replies" -gt 0 ]; then
            echo "  🎉 FOUND $replies REPLIES ON PAGE $page!"
        fi
        
        if [ "$count" -eq 0 ]; then
            echo "  📄 Fin de pagination"
            break
        fi
    else
        echo "  ❌ Page $page failed"
        break
    fi
done

echo ""
echo "✅ Test terminé!"