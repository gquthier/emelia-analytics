#!/bin/bash

echo "🚀 Configuration automatique de ngrok pour tests webhook..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Vérifier si ngrok est installé
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok n'est pas installé. Installez-le avec: brew install ngrok"
    exit 1
fi

# 2. Tuer les anciens processus ngrok
echo "🧹 Nettoyage des anciens processus..."
pkill -f "ngrok http" 2>/dev/null || true

# 3. Démarrer ngrok en arrière-plan
echo "🌍 Démarrage de ngrok..."
nohup ngrok http 3000 --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!
echo "   PID ngrok: $NGROK_PID"

# 4. Attendre que ngrok démarre
echo "⏳ Attente du démarrage de ngrok..."
sleep 3

# 5. Récupérer l'URL publique
echo "🔍 Récupération de l'URL publique..."
NGROK_URL=""
for i in {1..10}; do
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)
    if [ "$NGROK_URL" != "null" ] && [ "$NGROK_URL" != "" ]; then
        break
    fi
    echo "   Tentative $i/10..."
    sleep 2
done

if [ "$NGROK_URL" == "null" ] || [ "$NGROK_URL" == "" ]; then
    echo "❌ Impossible de récupérer l'URL ngrok"
    kill $NGROK_PID 2>/dev/null || true
    exit 1
fi

echo "✅ URL ngrok récupérée: $NGROK_URL"

# 6. Mettre à jour le fichier .env
echo "📝 Mise à jour du fichier .env..."
if [ -f .env ]; then
    # Backup du fichier .env
    cp .env .env.backup
    
    # Remplacer BASE_URL
    sed -i '' 's|BASE_URL="[^"]*"|BASE_URL="'$NGROK_URL'"|g' .env
    echo "   ✅ BASE_URL mis à jour dans .env"
else
    echo "   ❌ Fichier .env non trouvé"
fi

# 7. Vérifier la connectivité
echo "🔗 Test de connectivité..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "ngrok-skip-browser-warning: true" "$NGROK_URL" || echo "000")

if [ "$HTTP_STATUS" == "200" ]; then
    echo "   ✅ Application accessible via ngrok"
else
    echo "   ⚠️  Status HTTP: $HTTP_STATUS (L'application Next.js doit être redémarrée)"
fi

# 8. Informations finales
echo ""
echo "🎯 Configuration terminée !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 URL publique: $NGROK_URL"
echo "🔗 Webhook URL pour Emelia: $NGROK_URL/api/webhook/emelia"
echo "🔗 Webhook URL pour tests: $NGROK_URL/api/client/[clientId]/test-webhook"
echo "🎛️  Dashboard ngrok: http://localhost:4040"
echo "📝 Logs ngrok: tail -f ngrok.log"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Redémarrez Next.js pour prendre en compte la nouvelle BASE_URL"
echo "2. Utilisez l'URL webhook dans vos services externes (Emelia, Make, Zapier)"
echo "3. Testez avec: curl -X POST '$NGROK_URL/api/webhook/emelia' -H 'Content-Type: application/json' -d @test-payload.json"
echo ""
echo "🛑 Pour arrêter: kill $NGROK_PID"

# Sauvegarder le PID pour un arrêt facile
echo $NGROK_PID > ngrok.pid