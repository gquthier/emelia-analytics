#!/bin/bash

echo "🛑 Arrêt de la configuration ngrok..."

# 1. Arrêter ngrok si le PID existe
if [ -f ngrok.pid ]; then
    NGROK_PID=$(cat ngrok.pid)
    if kill -0 $NGROK_PID 2>/dev/null; then
        echo "🔍 Arrêt de ngrok (PID: $NGROK_PID)..."
        kill $NGROK_PID
        echo "   ✅ ngrok arrêté"
    else
        echo "   ⚠️  Processus ngrok déjà arrêté"
    fi
    rm ngrok.pid
else
    # Fallback: tuer tous les processus ngrok
    echo "🧹 Nettoyage de tous les processus ngrok..."
    pkill -f "ngrok http" 2>/dev/null && echo "   ✅ Processus ngrok arrêtés" || echo "   ⚠️  Aucun processus ngrok trouvé"
fi

# 2. Restaurer le fichier .env si backup existe
if [ -f .env.backup ]; then
    echo "📝 Restauration de la configuration .env..."
    mv .env.backup .env
    echo "   ✅ Configuration .env restaurée"
fi

# 3. Nettoyer les fichiers temporaires
echo "🧹 Nettoyage des fichiers temporaires..."
rm -f ngrok.log
echo "   ✅ Fichiers temporaires supprimés"

echo ""
echo "✅ Nettoyage terminé !"
echo "💡 L'application fonctionne maintenant en local sur http://localhost:3000"