# 🚀 GUIDE DE MIGRATION VERS SUPABASE

## 📋 État actuel de la préparation

✅ **Configuration terminée :**
- Schema Prisma mis à jour pour PostgreSQL
- Variables d'environnement Supabase configurées
- Script de migration SQLite → PostgreSQL créé
- Tests de connexion préparés

✅ **Données existantes à migrer :**
- 4 clients
- 10 campagnes  
- 28 threads
- 50 messages

---

## 🔧 ÉTAPE 1 : Obtenir les identifiants Supabase

### Option A : Via le Dashboard Supabase

1. **Allez sur :** https://supabase.com/dashboard/project/rrpxcrlmdhsavobqyibu/settings/database

2. **Dans la section "Database password" :**
   - Copiez le mot de passe affiché
   - OU cliquez sur "Reset database password" si nécessaire

3. **Dans la section "Connection string" :**
   - Copiez l'URI PostgreSQL complète
   - Elle ressemble à : `postgresql://postgres.rrpxcrlmdhsavobqyibu:MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`

### Option B : Connection String URI directe

Si vous avez l'URI complète, copiez-la directement.

---

## 🔧 ÉTAPE 2 : Configurer les variables d'environnement

### Ouvrez le fichier `.env` et modifiez :

```bash
# Remplacez cette ligne :
DATABASE_URL="postgresql://postgres:[YOUR_SUPABASE_PASSWORD]@db.rrpxcrlmdhsavobqyibu.supabase.co:5432/postgres?sslmode=require"

# Par votre vraie connection string, par exemple :
DATABASE_URL="postgresql://postgres.rrpxcrlmdhsavobqyibu:VOTRE_VRAI_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

---

## 🚀 ÉTAPE 3 : Lancer la migration

### 3.1 Créer les tables dans Supabase

```bash
npm run db:push
```

Cette commande va :
- Se connecter à votre base Supabase
- Créer toutes les tables selon le schéma Prisma
- Configurer les relations et contraintes

### 3.2 Migrer les données existantes

```bash
npm run migrate:supabase
```

Cette commande va :
- Lire toutes les données de SQLite
- Les transférer vers Supabase PostgreSQL  
- Conserver tous les IDs et relations
- Afficher un rapport de migration

---

## 🔍 ÉTAPE 4 : Vérification

### Test de connexion

```bash
npm run test:supabase
```

### Vérification des données migrées

L'application devrait maintenant fonctionner avec Supabase. Vérifiez :

1. **Dashboard principal** : Tous les clients doivent être visibles
2. **KPIs** : Les métriques doivent s'afficher correctement  
3. **Graphique temporel** : Les données historiques doivent être présentes
4. **Threads** : Les conversations et classifications doivent être intactes

---

## 🔧 COMMANDES UTILES

```bash
# Tester la connexion Supabase
npm run test:supabase

# Créer/mettre à jour les tables  
npm run db:push

# Migrer les données SQLite → Supabase
npm run migrate:supabase

# Reset complet de la base (ATTENTION : efface tout)
npm run db:reset
```

---

## 🚨 RÉSOLUTION DE PROBLÈMES

### Erreur : "Tenant or user not found"
➜ Le mot de passe est incorrect. Vérifiez dans le dashboard Supabase.

### Erreur : "Connection refused"  
➜ Vérifiez l'URL de connexion. Utilisez le pooler : `aws-0-eu-central-1.pooler.supabase.com`

### Erreur : "Database does not exist"
➜ Utilisez `postgres` comme nom de base de données par défaut.

### Tables non créées
➜ Lancez `npm run db:push` avant la migration.

---

## ✅ APRÈS LA MIGRATION

### 1. Mise à jour Vercel

Une fois la migration locale réussie, mettez à jour Vercel :

```bash
# Mettre à jour les variables d'environnement Vercel
vercel env add DATABASE_URL
# Entrez votre connection string Supabase

# Redéployer
git add . && git commit -m "Migrate to Supabase PostgreSQL" && git push
```

### 2. Webhooks prêts

Votre endpoint webhook sera maintenant :
```
https://emelia-mini-h7bw4egxv-gquthiers-projects.vercel.app/api/webhooks/emelia
```

### 3. Performance améliorée

Supabase PostgreSQL offre :
- ✅ Meilleure performance que SQLite
- ✅ Sauvegarde automatique  
- ✅ Scaling automatique
- ✅ Dashboard d'administration Supabase
- ✅ Compatible avec toutes les fonctionnalités existantes

---

## 📞 SUPPORT

Si vous rencontrez des problèmes :

1. **Vérifiez les logs** : `npm run dev` pour voir les erreurs
2. **Testez la connexion** : `npm run test:supabase`  
3. **Dashboard Supabase** : Vérifiez que les tables sont créées
4. **Variables d'environnement** : Assurez-vous que `DATABASE_URL` est correcte

**La migration est conçue pour être 100% sûre et réversible. Vos données SQLite restent intactes.**