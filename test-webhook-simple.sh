#!/bin/bash

# Script pour créer et tester un webhook rapidement

CLIENT_ID="cmf38f4dv00144wd3zygzs1mj"  # Remplacez par l'ID de votre client
NGROK_URL="https://9297915ba250.ngrok-free.app"

echo "🧪 Test complet des webhooks avec ngrok"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Créer un webhook de test
echo "1️⃣ Création d'un webhook de test..."
WEBHOOK_RESPONSE=$(curl -s -X POST "$NGROK_URL/api/client/$CLIENT_ID/webhooks" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{
    "campaignType": "email",
    "events": ["REPLIED"],
    "customUrl": "https://webhook.site/test"
  }')

echo "📄 Réponse création webhook:"
echo "$WEBHOOK_RESPONSE" | jq '.' 2>/dev/null || echo "$WEBHOOK_RESPONSE"

# Extraire l'ID du webhook si la création a réussi
WEBHOOK_ID=$(echo "$WEBHOOK_RESPONSE" | jq -r '.webhook.id' 2>/dev/null)

if [ "$WEBHOOK_ID" != "null" ] && [ "$WEBHOOK_ID" != "" ]; then
    echo "✅ Webhook créé avec l'ID: $WEBHOOK_ID"
    
    # 2. Tester le webhook
    echo ""
    echo "2️⃣ Test du webhook créé..."
    TEST_RESPONSE=$(curl -s -X POST "$NGROK_URL/api/client/$CLIENT_ID/test-webhook" \
      -H "Content-Type: application/json; charset=utf-8" \
      -H "ngrok-skip-browser-warning: true" \
      -d "{
        \"webhookId\": \"$WEBHOOK_ID\",
        \"testType\": \"sample\"
      }")
    
    echo "📄 Réponse test webhook:"
    echo "$TEST_RESPONSE" | jq '.' 2>/dev/null || echo "$TEST_RESPONSE"
    
    # 3. Vérifier le résultat
    SUCCESS=$(echo "$TEST_RESPONSE" | jq -r '.success' 2>/dev/null)
    if [ "$SUCCESS" = "true" ]; then
        echo "✅ Test réussi !"
    else
        echo "❌ Test échoué"
    fi
    
else
    echo "❌ Échec de la création du webhook"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Pour tester depuis l'interface web:"
echo "   1. Allez sur $NGROK_URL"
echo "   2. Connectez-vous avec ADMIN2025"
echo "   3. Cliquez sur 🧪 Tester sur le webhook créé"