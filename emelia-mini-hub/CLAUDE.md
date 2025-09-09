# CLAUDE.md - Analyse Complète du Code Emelia Mini-Hub

## 📋 Vue d'ensemble du projet

**Emelia Mini-Hub** est une application web Next.js 15 ultra-simple pour agences gérant leurs campagnes Emelia clients. L'application centralise la gestion des campagnes email, analyse les réponses avec IA, et fournit des tableaux de bord clients avec KPIs détaillés.

## 🏗️ Architecture Technique

### Stack Technologique
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui + Radix UI
- **Base de données**: Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- **Graphiques**: Recharts pour les visualisations temporelles
- **Sécurité**: Chiffrement AES-256-GCM + JWT
- **Déploiement**: Vercel avec CRON automatique

### Structure des Dossiers
```
emelia-mini-hub/
├── app/                    # App Router Next.js 15
│   ├── api/               # API Routes
│   │   ├── client/        # Gestion des clients
│   │   ├── cron/          # Synchronisation automatique
│   │   └── thread/        # Gestion des threads
│   ├── c/[clientId]/      # Dashboard client
│   └── page.tsx           # Page d'accueil agence
├── components/             # Composants React réutilisables
│   ├── ui/                # Composants UI de base
│   └── *.tsx              # Composants métier
├── lib/                    # Logique métier et utilitaires
├── prisma/                 # Schéma et migrations DB
└── public/                 # Assets statiques
```

## 🔧 Composants Principaux

### 1. **ClientForm.tsx** - Formulaire d'ajout de client
- **Fonctionnalités**:
  - Validation du code3 (3 caractères alphanumériques)
  - Validation de la clé API Emelia
  - Génération automatique du lien de partage
  - Gestion des erreurs et états de chargement

- **Validation**:
  ```typescript
  if (!/^[A-Za-z0-9]{3}$/.test(formData.code3)) {
    setError('L\'identifiant doit contenir exactement 3 caractères alphanumériques')
  }
  ```

- **API Endpoint**: `POST /api/client`

### 2. **KPICards.tsx** - Affichage des métriques
- **Métriques affichées**:
  - Envoyés, Délivrés, Taux d'ouverture
  - Taux de clic, Taux de réponse, Intéressés
  - Bounces, Désabonnements

- **Calculs automatiques**:
  ```typescript
  const openRate = kpis.delivered > 0 ? (kpis.opens / kpis.delivered * 100) : 0
  const clickRate = kpis.delivered > 0 ? (kpis.clicks / kpis.delivered * 100) : 0
  ```

### 3. **TimeSeriesChart.tsx** - Graphique temporel
- **Technologie**: Recharts avec LineChart
- **Période**: 30 derniers jours
- **Métriques**: Envoyés, Délivrés, Ouvertures, Clics, Réponses
- **Localisation**: Format français avec date-fns
- **API Endpoint**: `GET /api/client/[clientId]/timeline`

### 4. **ThreadsList.tsx** - Liste des conversations
- **Fonctionnalités**:
  - Filtrage par label (INTERESSE, A_RAPPELER, etc.)
  - Recherche par email, sujet ou nom de campagne
  - Pagination et tri par date
  - Aperçu des messages

- **Labels supportés**:
  ```typescript
  const LABELS = {
    INTERESSE: { label: 'Intéressé', color: 'bg-green-100 text-green-800' },
    A_RAPPELER: { label: 'À rappeler', color: 'bg-blue-100 text-blue-800' },
    NEUTRE: { label: 'Neutre', color: 'bg-gray-100 text-gray-800' },
    PAS_INTERESSE: { label: 'Pas intéressé', color: 'bg-red-100 text-red-800' },
    INJOIGNABLE: { label: 'Injoignable', color: 'bg-orange-100 text-orange-800' },
    OPT_OUT: { label: 'Opt-out', color: 'bg-purple-100 text-purple-800' }
  }
  ```

## 🗄️ Modèles de Données (Prisma)

### **Client**
```prisma
model Client {
  id         String     @id @default(cuid())
  name       String                    # Nom de l'entreprise
  code3      String                    # Identifiant 3 lettres (ex: "QF1")
  apiKeyEnc  String                    # Clé API Emelia chiffrée
  createdAt  DateTime  @default(now())
  lastSyncAt DateTime?                 # Dernière synchronisation
  campaigns  Campaign[]                # Campagnes associées
  threads    Thread[]                  # Conversations
  kpis       ClientKpis?              # Métriques calculées
  shareLinks ShareLink[]               # Liens de partage
}
```

### **Campaign**
```prisma
model Campaign {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  emeliaId    String                    # ID Emelia
  name        String                    # Nom de la campagne
  createdAt   DateTime @default(now())
  lastEventAt DateTime?                 # Dernier événement
  threads     Thread[]
  
  @@unique([clientId, emeliaId])       # Contrainte d'unicité
}
```

### **Thread** (Conversation)
```prisma
model Thread {
  id            String    @id @default(cuid())
  clientId      String
  client        Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  campaignId    String
  campaign      Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  prospectEmail String                   # Email du prospect
  subject       String?                  # Sujet de la conversation
  firstAt       DateTime?                # Première interaction
  lastAt        DateTime?                # Dernière interaction
  label         String?                  # Classification IA
  confidence    Float?                   # Confiance de la classification
  messages      Message[]                # Messages de la conversation
}
```

### **Message**
```prisma
model Message {
  id        String   @id @default(cuid())
  threadId  String
  thread    Thread   @relation(fields: [threadId], references: [id], onDelete: Cascade)
  direction String                    # INBOUND | OUTBOUND
  at        DateTime
  fromAddr  String?
  toAddr    String?
  text      String                    # Contenu du message
  raw       Json?                     # Données brutes Emelia
}
```

## 🔌 Intégration API Emelia

### **EmeliaAPIClient** - Client API principal
- **URLs**:
  - REST: `https://api.emelia.io`
  - GraphQL: `https://graphql.emelia.io/graphql`

- **Méthodes principales**:
  ```typescript
  class EmeliaAPIClient {
    async getCampaigns(): Promise<EmeliaCampaign[]>
    async getCampaignActivities(campaignId: string, cursor?: string): Promise<{activities: EmeliaActivity[], nextCursor?: string}>
    async getCampaignStats(campaignId: string): Promise<EmeliaStats>
    filterCampaignsByCode(campaigns: EmeliaCampaign[], code3: string): EmeliaCampaign[]
  }
  ```

- **Fallback intelligent**: GraphQL en premier, puis REST si échec
- **Gestion des erreurs**: Retry automatique avec backoff exponentiel
- **Rate limiting**: Gestion des erreurs 429

### **Interfaces TypeScript**
```typescript
interface EmeliaCampaign {
  _id: string;
  id?: string;                    // Compatibilité backward
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

interface EmeliaActivity {
  id: string;
  campaignId: string;
  type: string;                   // sent, delivered, open, click, reply, bounce, unsubscribe
  email: string;
  subject?: string;
  content?: string;
  timestamp: string;
  raw?: unknown;
}
```

## 🤖 Classification IA des Réponses

### **Système de classification hybride**
1. **Classification sophistiquée** (patterns regex avancés)
2. **Fallback heuristique** (patterns simples)
3. **Prêt pour OpenAI** (code commenté)

### **Labels de classification**
- **INTERESSE**: Montre de l'intérêt, veut en savoir plus
- **A_RAPPELER**: Demande à être recontacté plus tard
- **NEUTRE**: Réponse unclear ou factuelle
- **PAS_INTERESSE**: Refuse explicitement l'offre
- **INJOIGNABLE**: Absent, en vacances, indisponible
- **OPT_OUT**: Demande de désabonnement

### **Patterns de détection**
```typescript
// Patterns d'intérêt (poids: 3)
const interestPatterns = [
  /intéressé|interested|interest/gi,
  /book.*call|rendez.?vous|meeting|réunion/gi,
  /tell.*more|en savoir plus|more info|plus d'info/gi
];

// Patterns de rappel (poids: 2)
const callbackPatterns = [
  /rappel|call.*back|later|plus tard/gi,
  /busy|occupé|not.*time|pas.*temps/gi
];
```

## 🔄 Synchronisation des Données

### **Processus de synchronisation**
1. **Récupération des campagnes** via API Emelia
2. **Filtrage par code3** dans le nom des campagnes
3. **Stockage/MAJ des campagnes** en base
4. **Récupération des statistiques** par campagne
5. **Traitement des activités** (fallback si stats échouent)
6. **Classification IA** des réponses
7. **Mise à jour des KPIs** client

### **Fonctions principales**
```typescript
export async function backfillClient(clientId: string, apiKey: string, code3: string)
export async function resyncClient(clientId: string, apiKey: string, code3: string)
async function processCampaignActivities(clientId: string, campaign: EmeliaCampaign, emeliClient: EmeliaAPIClient)
async function processActivity(clientId: string, campaignId: string, activity: EmeliaActivity, stats: Stats)
```

### **CRON automatique**
- **Endpoint**: `/api/cron/sync`
- **Fréquence**: Tous les 2 jours (`0 0 */2 * *`)
- **Sécurité**: Header `X-Cron-Secret` requis
- **Logs**: Statut de chaque client synchronisé

## 🔐 Sécurité et Authentification

### **Chiffrement des clés API**
- **Algorithme**: AES-256-GCM
- **Clé**: Variable d'environnement `AES_KEY` (32 bytes hex)
- **Format**: IV (16) + Tag (16) + Données chiffrées (base64)

```typescript
export function encryptApiKey(plaintext: string): string
export function decryptApiKey(encryptedData: string): string
export function generateSecureKey(): string
```

### **JWT pour les liens de partage**
- **Secret**: Variable d'environnement `JWT_SIGNING_KEY`
- **Types de tokens**:
  - `admin`: Session administrateur (7 jours)
  - `viewer`: Accès lecture seule client (30 jours par défaut)

```typescript
export function createShareLink(clientId: string, expiresIn?: string): string
export function verifyShareToken(token: string, clientId: string): boolean
```

### **Sessions administrateur**
- **Cookie**: `admin_session` (httpOnly, secure, sameSite: lax)
- **Durée**: 7 jours par défaut
- **Gestion**: `createAdminSession()`, `getAdminSession()`, `clearAdminSession()`

## 🌐 API Routes

### **Gestion des clients**
- **POST** `/api/client` - Créer un client
- **POST** `/api/client/[id]/sync` - Synchroniser un client
- **POST** `/api/client/[id]/share-link` - Générer un lien de partage

### **Synchronisation automatique**
- **POST** `/api/cron/sync` - CRON de synchronisation (protégé par secret)

### **Données client**
- **GET** `/api/client/[id]/timeline` - Données temporelles pour graphiques

### **Gestion des threads**
- **POST** `/api/thread/[id]/label` - Mettre à jour le label d'un thread

## 🎨 Interface Utilisateur

### **Design System**
- **Framework**: Tailwind CSS 4 + shadcn/ui
- **Composants**: Radix UI pour l'accessibilité
- **Responsive**: Grid system adaptatif (md:grid-cols-4)
- **Thème**: Palette de couleurs cohérente pour les labels

### **Composants UI personnalisés**
- **Button**: Variants outline, size sm
- **Card**: Header, Title, Content
- **Input**: Validation, aria-labels, patterns
- **Toast**: Notifications système

### **Accessibilité**
- **ARIA labels** sur tous les composants interactifs
- **Rôles** appropriés (alert, button)
- **Navigation clavier** supportée
- **Contraste** respecté

## 📊 Gestion des Erreurs

### **Stratégies de fallback**
1. **API Emelia**: GraphQL → REST → Erreur
2. **Classification IA**: IA sophistiquée → Heuristique → NEUTRE
3. **Statistiques**: API stats → Activités → Valeurs par défaut

### **Logging et monitoring**
- **Console logs** détaillés pour le debugging
- **Gestion des erreurs** par campagne
- **Statuts de synchronisation** par client
- **Métriques d'échec** dans les réponses CRON

## 🚀 Déploiement et Configuration

### **Variables d'environnement requises**
```bash
DATABASE_URL="file:./dev.db"                    # SQLite dev / PostgreSQL prod
AES_KEY="32-bytes-hex-key"                      # Clé de chiffrement
JWT_SIGNING_KEY="jwt-secret-key"                # Signature JWT
CRON_SECRET="cron-secret-key"                   # Protection CRON
BASE_URL="http://localhost:3000"                # URL de base
```

### **Configuration Vercel**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 0 */2 * *"
    }
  ]
}
```

### **Scripts disponibles**
```bash
npm run dev      # Développement avec Turbopack
npm run build    # Build de production
npm run start    # Démarrage production
npm run lint     # Vérification ESLint
```

## 🔍 Points d'attention et limitations

### **Limitations actuelles**
- **Base de données**: SQLite en dev (pas de Supabase configuré)
- **Classification IA**: Heuristique uniquement (pas d'OpenAI)
- **Authentification**: Session simple (pas de NextAuth configuré)
- **Rate limiting**: Basique (pas de Redis)

### **Améliorations possibles**
- **Supabase**: Migration PostgreSQL avec authentification
- **OpenAI**: Intégration réelle pour la classification
- **Cache**: Redis pour les performances
- **Monitoring**: Sentry, LogRocket
- **Tests**: Jest, Testing Library

### **Conventions de nommage Emelia**
- **Règle**: Le `code3` doit être présent dans le nom de la campagne
- **Exemples valides**: `QF1 - Prospecting FR`, `ABC Lead Gen`
- **Filtrage**: Insensible à la casse, recherche par inclusion

## 📈 Métriques et Performance

### **Indicateurs clés**
- **Temps de synchronisation** par client
- **Taux de succès** des API Emelia
- **Précision** de la classification IA
- **Latence** des requêtes base de données

### **Optimisations**
- **Pagination** des activités (cursor-based)
- **Batch processing** des messages
- **Index** sur les clés étrangères
- **Lazy loading** des composants

---

*Ce document a été généré automatiquement en analysant la structure complète du code du projet Emelia Mini-Hub. Dernière mise à jour : $(date)*
