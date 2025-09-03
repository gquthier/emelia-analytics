# Emelia Mini-Hub

Application web ultra-simple pour agences gérant leurs campagnes Emelia clients.

## Fonctionnalités

### 🏠 Accueil Agence (/)
- **Ajouter des clients** : Nom d'entreprise, clé API Emelia, identifiant 3 lettres
- **Liste des clients** : Tableau avec nom, code, dernière sync, actions
- **Validation automatique** des clés API Emelia
- **Génération de liens de partage** automatique

### 📊 Dashboard Client (/c/[clientId])
- **KPIs complets** : Envoyés, Délivrés, Taux d'ouverture, Clics, Réponses, Intéressés, Bounces, Désabonnements
- **Graphique temporel** : Évolution des événements sur 30 jours
- **Table des réponses** avec filtre et recherche
- **Classification IA** des réponses (Intéressé, À rappeler, Neutre, etc.)
- **Panneaux de threads** pour voir l'historique complet des conversations
- **Mode lecture seule** via liens partagés

### 🔄 Synchronisation
- **Backfill immédiat** à l'ajout d'un client
- **Resync automatique** toutes les 24h via CRON
- **Filtrage intelligent** par identifiant 3 lettres dans les noms de campagnes

### 🔐 Sécurité
- **Chiffrement AES-GCM** des clés API au repos
- **JWT sécurisé** pour les liens de partage
- **Sessions administrateur** protégées
- **Contrôle d'accès** granulaire

## Stack Technique

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Recharts** pour les graphiques
- **Prisma** (SQLite dev / PostgreSQL prod)
- **Chiffrement AES-GCM** pour les secrets
- **JWT** pour l'authentification

## Installation

### 1. Cloner et installer les dépendances

```bash
git clone <repository>
cd emelia-mini-hub
npm install
```

### 2. Configuration des variables d'environnement

Copiez `.env.example` vers `.env` et configurez :

```bash
DATABASE_URL="file:./dev.db"
AES_KEY="9cc1eac624537bb555efe22d6c74ffc9576c92711dfd3c54e18e108eac46d3f8"
JWT_SIGNING_KEY="super-secret-jwt-key-change-in-production-123456789"
CRON_SECRET="super-secret-cron-key-change-in-production-987654321"
BASE_URL="http://localhost:3000"
```

### 3. Initialiser la base de données

```bash
npx prisma generate
npx prisma db push
```

### 4. Démarrer l'application

```bash
npm run dev
```

L'application sera disponible sur http://localhost:3000

## Utilisation

### Ajouter un client

1. Accédez à la page d'accueil
2. Remplissez le formulaire "Ajouter un client"
3. **Important** : L'identifiant 3 lettres doit être présent dans le nom des campagnes Emelia
4. La synchronisation démarre automatiquement

### Convention de nommage Emelia

Pour que les campagnes soient correctement filtrées, nommez-les ainsi côté Emelia :
- `QF1 - Prospecting FR #Sept` 
- `ABC - Lead Generation #Q4`
- `XYZ - Outreach Campaign #2024`

### Liens de partage

- Générés automatiquement à la création du client
- Accessibles en lecture seule
- Pas d'expiration par défaut (configurable)
- Copiables d'un clic

### Classification IA des réponses

L'IA classifie automatiquement les réponses en :
- **Intéressé** : Montre de l'intérêt, veut en savoir plus
- **À rappeler** : Demande à être recontacté plus tard  
- **Neutre** : Réponse unclear ou factuelle
- **Pas intéressé** : Refuse explicitement l'offre
- **Injoignable** : Absent, en vacances, indisponible
- **Opt-out** : Demande de désabonnement

## Déploiement

### Vercel (Recommandé)

1. Connectez votre repository GitHub
2. Configurez les variables d'environnement
3. Le CRON est configuré automatiquement via `vercel.json`

### Autre plateforme

1. Buildez l'application : `npm run build`  
2. Configurez une base PostgreSQL
3. Mettez à jour `DATABASE_URL`
4. Configurez un CRON externe pour `/api/cron/sync`

## API Interne

### POST /api/client
Créer un nouveau client avec validation Emelia

### POST /api/client/[id]/share-link  
Générer un nouveau lien de partage

### POST /api/client/[id]/sync
Déclencher une resynchronisation manuelle

### GET /api/client/[id]/timeline
Récupérer les données temporelles pour le graphique

### PATCH /api/thread/[id]/label
Corriger le label d'un thread manuellement

### POST /api/cron/sync
Endpoint CRON pour resync globale (protégé par secret)

## Configuration CRON

Voir `CRON_SETUP.md` pour les détails de configuration selon votre plateforme.

## Sécurité en Production

⚠️ **Changez obligatoirement ces clés en production** :

```bash
# Générer une nouvelle clé AES
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Générer un secret JWT
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## Surveillance

- Les logs de synchronisation sont visibles dans la console
- L'endpoint `/api/cron/sync` retourne un statut détaillé
- Surveillez les erreurs via votre plateforme de logging

## Support

- Les erreurs de clé API Emelia sont affichées clairement
- La classification IA a un fallback heuristique
- Mode dégradé si l'API Emelia est indisponible temporairement

---

**Développé pour une utilisation interne agence. Minimaliste et efficace.** 🚀
