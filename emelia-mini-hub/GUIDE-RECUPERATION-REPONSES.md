# 📧 GUIDE : Comment récupérer le contenu des réponses prospects

## 🚨 **PROBLÈME IDENTIFIÉ**

L'API Emelia `/campaigns/{id}/activities` détecte les événements `"REPLIED"` mais **le champ `reply` est vide** pour votre plan/configuration. Voici 4 solutions concrètes pour obtenir le contenu complet des réponses.

---

## 🎯 **SOLUTION 1 : WEBHOOKS EMELIA (RECOMMANDÉE)**

### ✅ **Avantages**
- ⚡ **Temps réel** : Réponses affichées instantanément
- 📝 **Contenu complet** : Texte intégral des réponses
- 🤖 **Classification automatique** : IA appliquée immédiatement
- 🔧 **Déjà implémenté** : Code prêt à l'emploi

### 🔧 **Configuration dans Emelia**

1. **Connectez-vous à votre compte Emelia**
2. **Allez dans les paramètres** → Section "Webhooks" ou "Intégrations"
3. **Ajoutez un nouveau webhook** :
   - **URL** : `https://votre-domaine.com/api/webhooks/emelia`
   - **Événements** : Sélectionnez `reply` et `replied`
   - **Format** : JSON
4. **Sauvegardez** et testez l'envoi

### 🧪 **Test local (pour développement)**
```bash
# Exposer votre localhost via ngrok
npx ngrok http 3000

# Utiliser l'URL ngrok dans Emelia :
# https://abc123.ngrok.io/api/webhooks/emelia
```

### 📋 **Vérification**
```bash
# Tester l'endpoint
curl https://votre-domaine.com/api/webhooks/emelia

# Réponse attendue :
# {"status":"healthy","endpoint":"emelia-webhook",...}
```

---

## 🔍 **SOLUTION 2 : TEST D'ENDPOINTS ALTERNATIFS**

### 🎯 **Objectif**
Explorer si d'autres endpoints Emelia donnent accès au contenu des messages.

### 🚀 **Utilisation**
```bash
# Rendre le script exécutable
chmod +x test-emelia-endpoints.sh

# Tester avec votre clé API
./test-emelia-endpoints.sh VOTRE_CLE_API_EMELIA
```

### 📊 **Interprétation des résultats**
- ✅ **Si un endpoint retourne du contenu** → Nous l'intégrons au système
- ❌ **Si tous retournent "ENDPOINT_NOT_FOUND"** → Passer à la solution 3
- 🔑 **Si erreur d'autorisation** → Vérifier les permissions de votre plan

---

## 📧 **SOLUTION 3 : INTÉGRATION EMAIL DIRECTE (IMAP)**

### ✅ **Avantages**
- 📥 **Accès direct** : Lecture des emails de réponse
- 🔒 **Contrôle total** : Indépendant d'Emelia
- 📝 **Contenu complet** : HTML + texte brut
- 🔄 **Surveillance continue** : Monitoring automatique

### 📋 **Prérequis**
```bash
# Installer les dépendances
npm install imapflow mailparser
```

### 🔧 **Configuration**

#### **Gmail** :
1. Activer l'authentification à 2 facteurs
2. Générer un "Mot de passe d'application"
3. Configurer :
```javascript
const gmailConfig = {
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: 'votre-email@gmail.com',
    pass: 'votre-mot-de-passe-app'  // 16 caractères
  }
}
```

#### **Outlook/Office 365** :
```javascript
const outlookConfig = {
  host: 'outlook.office365.com', 
  port: 993,
  secure: true,
  auth: {
    user: 'votre-email@outlook.com',
    pass: 'votre-mot-de-passe'
  }
}
```

### 🚀 **Utilisation**
```javascript
import { setupEmailMonitoring } from './lib/email-imap'

// Configuration du monitoring
const monitor = await setupEmailMonitoring(clientId, gmailConfig)

// Démarrer la surveillance (vérifie toutes les 5 minutes)
await monitor.monitorReplies(clientId)
```

### 🎯 **Résultat**
- Chaque réponse email sera automatiquement intégrée au dashboard
- Classification IA appliquée au contenu
- Métadonnées complètes (Message-ID, In-Reply-To, etc.)

---

## 💼 **SOLUTION 4 : UPGRADE PLAN EMELIA**

### 🎯 **Vérifications à faire**

1. **Contactez le support Emelia** :
   - Demandez si le contenu des réponses est disponible dans un plan supérieur
   - Vérifiez les limitations de votre plan actuel

2. **Paramètres du compte** :
   - Vérifiez si une option "Stockage des réponses" existe
   - Activez toutes les options liées aux "Messages" ou "Replies"

3. **Permissions API** :
   - Votre clé API a-t-elle les droits `messages:read` ?
   - Regenerez une nouvelle clé avec tous les scopes

---

## 🏆 **RECOMMANDATIONS**

### 🥇 **Priorité 1 : Webhooks**
- **Implémentation** : 30 minutes
- **Efficacité** : 100% en temps réel
- **Maintenance** : Aucune

### 🥈 **Priorité 2 : Test d'endpoints**
- **Implémentation** : 5 minutes
- **Efficacité** : Dépend des découvertes
- **Maintenance** : Aucune

### 🥉 **Priorité 3 : Intégration IMAP**  
- **Implémentation** : 1-2 heures
- **Efficacité** : 95% (délai de 5 minutes)
- **Maintenance** : Surveillance de la connexion

### 🎖️ **Priorité 4 : Upgrade Emelia**
- **Implémentation** : Dépend du support
- **Efficacité** : Potentiellement 100%
- **Coût** : Abonnement plus élevé

---

## 🔄 **PLAN D'ACTION SUGGÉRÉ**

### **Étape 1** : Configurez les webhooks Emelia (Solution 1)
```bash
# 1. Exposez votre app publiquement ou via ngrok
# 2. Configurez dans Emelia : /api/webhooks/emelia  
# 3. Testez avec une vraie réponse
```

### **Étape 2** : Si les webhooks ne marchent pas
```bash
# Testez les endpoints alternatifs
./test-emelia-endpoints.sh VOTRE_CLE_API
```

### **Étape 3** : En dernier recours
```bash
# Configurez l'intégration email IMAP
npm install imapflow mailparser
# Suivez la configuration Gmail/Outlook ci-dessus
```

---

## 🎉 **RÉSULTAT FINAL**

Avec n'importe laquelle de ces solutions, vous obtiendrez :

✅ **Contenu complet des réponses** dans le dashboard  
✅ **Classification IA automatique** (INTERESSE, PAS_INTERESSE, etc.)  
✅ **Affichage en temps réel** des nouvelles réponses  
✅ **Métadonnées complètes** (date, contact, campagne)  
✅ **Interface utilisateur optimisée** pour lire les réponses  

**Votre dashboard affichera enfin les vraies réponses des prospects ! 🚀**