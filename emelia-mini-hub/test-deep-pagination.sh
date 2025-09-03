#!/bin/bash

echo "🔍 TEST PAGINATION PROFONDE - RECHERCHE DES RÉPONSES"
echo "================================================="

CLIENT_ID="cmewjxzzr00004wrea8xzkxg3" 
CAMPAIGN_ID="688f6729f48fa50a7a697158"

echo "🎯 Campagne: $CAMPAIGN_ID (QF1 Theo Chauvet 5)"
echo "📊 Stats indiquent: 173 réponses selon l'API"
echo ""

echo "📄 Test pagination profonde (pages 1-50)..."

found_replies=0
total_activities=0

for page in {1..50}; do
    response=$(curl -s "http://localhost:3000/api/debug/emelia?clientId=$CLIENT_ID&action=test-endpoint&campaignId=$CAMPAIGN_ID&endpoint=/emails/campaigns/$CAMPAIGN_ID/activities?page=$page")
    
    status=$(echo "$response" | jq -r '.status // "error"')
    if [ "$status" = "200" ]; then
        activities=$(echo "$response" | jq -r '.response.activities // [] | length')
        
        # Chercher tous les types d'événements
        events_json=$(echo "$response" | jq -r '.response.activities[]?.event // empty')
        unique_events=$(echo "$events_json" | sort | uniq -c | tr '\n' '|')
        
        # Chercher spécifiquement les réponses
        replies=$(echo "$response" | jq -r '.response.activities[]? | select(.event == "REPLIED" or .event == "RE_REPLY" or .event == "REPLY") | .event' | wc -l)
        
        total_activities=$((total_activities + activities))
        
        if [ "$replies" -gt 0 ]; then
            found_replies=$((found_replies + replies))
            echo "🎉 PAGE $page: FOUND $replies REPLIES! (Total activités: $activities)"
            
            # Afficher le détail de la première réponse trouvée
            echo "$response" | jq -r '.response.activities[]? | select(.event == "REPLIED" or .event == "RE_REPLY" or .event == "REPLY") | {event: .event, contact: .contact.email, date: .date}' | head -1
        elif [ "$activities" -gt 0 ]; then
            # Afficher seulement toutes les 5 pages pour éviter le spam
            if [ $((page % 5)) -eq 0 ]; then
                echo "📄 Page $page: $activities activités - Events: $(echo "$unique_events" | head -50)..."
            fi
        else
            echo "📄 Page $page: Vide - FIN DE PAGINATION"
            break
        fi
    else
        echo "❌ Page $page: Failed (status: $status)"
        break
    fi
    
    # Petit délai pour éviter le rate limiting
    sleep 0.1
done

echo ""
echo "📊 RÉSUMÉ:"
echo "  📄 Pages testées: $page"
echo "  📋 Total activités analysées: $total_activities" 
echo "  💬 Réponses trouvées: $found_replies"
echo ""

if [ "$found_replies" -eq 0 ]; then
    echo "❌ PROBLÈME CONFIRMÉ: Aucune réponse trouvée dans $total_activities activités"
    echo "🤔 Les 173 réponses des stats ne sont pas accessibles via l'API activities"
    echo ""
    echo "📋 PROCHAINES ACTIONS À TESTER:"
    echo "  1. Tester avec une autre campagne qui a des réponses récentes"
    echo "  2. Tester l'API GraphQL si disponible" 
    echo "  3. Vérifier si les permissions API incluent les réponses"
    echo "  4. Contacter le support Emelia pour la structure API"
else
    echo "✅ RÉPONSES TROUVÉES: $found_replies réponses dans $total_activities activités"
fi