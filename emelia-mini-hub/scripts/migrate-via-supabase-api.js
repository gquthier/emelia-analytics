#!/usr/bin/env node
/**
 * Migration via API REST Supabase
 * Utilise l'API REST au lieu de la connexion PostgreSQL directe
 */

const { PrismaClient } = require('@prisma/client');

// SQLite client - force to use SQLite regardless of env
const path = require('path');
const sqliteDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
process.env.DATABASE_URL_BACKUP = process.env.DATABASE_URL;
process.env.DATABASE_URL = `file:${sqliteDbPath}`;

const sqliteClient = new PrismaClient();

const SUPABASE_URL = 'https://rrpxcrlmdhsavobqyibu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycHhjcmxtZGhzYXZvYnF5aWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMzU5OTUsImV4cCI6MjA3MjgxMTk5NX0.HPqYqtGDaNV2ve1LLJmmddL52xxbmbLin1PGiY6c5PY';

async function supabaseRequest(method, path, data = null) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const responseText = await response.text();
  
  if (!response.ok) {
    throw new Error(`Supabase API error (${response.status}): ${responseText}`);
  }
  
  return responseText ? JSON.parse(responseText) : null;
}

async function checkTables() {
  try {
    // Test en récupérant des données des tables existantes
    const tables = ['Client', 'Campaign', 'Thread', 'Message'];
    const results = {};
    
    for (const table of tables) {
      try {
        const data = await supabaseRequest('GET', `/${table}?limit=1`);
        results[table] = { exists: true, count: data.length };
      } catch (error) {
        results[table] = { exists: false, error: error.message };
      }
    }
    
    return results;
  } catch (error) {
    throw new Error(`Erreur lors de la vérification des tables: ${error.message}`);
  }
}

async function migrateViaAPI() {
  console.log('🚀 Début de la migration SQLite → Supabase (via API REST)\n');

  try {
    // 1. Vérifier l'état des tables Supabase
    console.log('🔍 Vérification des tables Supabase...');
    const tableStatus = await checkTables();
    console.log('État des tables:', tableStatus);
    
    // 2. Récupérer les données SQLite
    console.log('\n📊 Récupération des données SQLite...');
    const clients = await sqliteClient.client.findMany({
      include: {
        kpis: true,
        shareLinks: true
      }
    });
    
    const campaigns = await sqliteClient.campaign.findMany();
    const threads = await sqliteClient.thread.findMany();
    const messages = await sqliteClient.message.findMany();
    
    console.log(`Trouvé: ${clients.length} clients, ${campaigns.length} campagnes, ${threads.length} threads, ${messages.length} messages`);

    // 3. Migrer les clients
    console.log('\n👥 Migration des clients...');
    for (const client of clients) {
      const { kpis, shareLinks, ...clientData } = client;
      
      try {
        // Insérer le client
        await supabaseRequest('POST', '/Client', clientData);
        console.log(`  ✅ Client migré: ${client.name} (${client.code3})`);
        
        // Migrer les KPIs
        if (kpis) {
          await supabaseRequest('POST', '/ClientKpis', kpis);
          console.log(`    ✅ KPIs migrés pour ${client.name}`);
        }
        
        // Migrer les liens de partage
        for (const shareLink of shareLinks) {
          await supabaseRequest('POST', '/ShareLink', shareLink);
        }
        
      } catch (error) {
        console.log(`  ❌ Erreur client ${client.name}: ${error.message}`);
      }
    }

    // 4. Migrer les campagnes
    console.log('\n📧 Migration des campagnes...');
    for (const campaign of campaigns) {
      try {
        await supabaseRequest('POST', '/Campaign', campaign);
        console.log(`  ✅ Campagne migrée: ${campaign.name}`);
      } catch (error) {
        console.log(`  ❌ Erreur campagne ${campaign.name}: ${error.message}`);
      }
    }

    // 5. Migrer les threads
    console.log('\n🧵 Migration des threads...');
    for (const thread of threads) {
      try {
        await supabaseRequest('POST', '/Thread', thread);
        console.log(`  ✅ Thread migré: ${thread.prospectEmail}`);
      } catch (error) {
        console.log(`  ❌ Erreur thread ${thread.id}: ${error.message}`);
      }
    }

    // 6. Migrer les messages
    console.log('\n💬 Migration des messages...');
    for (const message of messages) {
      try {
        await supabaseRequest('POST', '/Message', message);
      } catch (error) {
        console.log(`  ❌ Erreur message ${message.id}: ${error.message}`);
      }
    }
    console.log(`  ✅ ${messages.length} messages traités`);

    // 7. Vérification finale
    console.log('\n🔍 Vérification post-migration...');
    const finalStatus = await checkTables();
    console.log('État final des tables:', finalStatus);

    console.log('\n✅ Migration via API REST terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await sqliteClient.$disconnect();
  }
}

// Fonction pour créer les tables via SQL raw si nécessaire
async function createTablesSQL() {
  console.log('🔧 Tentative de création des tables via SQL...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS "Client" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code3" TEXT NOT NULL,
      "apiKeyEnc" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSyncAt" TIMESTAMP(3),
      "valueProposition" TEXT,
      "slackId" TEXT,
      "actionLinks" JSONB,
      "responseStyle" TEXT,
      "makeWebhookUrl" TEXT
    );
  `;
  
  try {
    // Utiliser l'API PostgreSQL de Supabase via SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: createTableSQL })
    });
    
    if (response.ok) {
      console.log('✅ Tables créées via SQL');
      return true;
    } else {
      console.log('❌ Échec création SQL:', await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ Erreur SQL:', error.message);
    return false;
  }
}

// Lancer la migration
if (require.main === module) {
  migrateViaAPI();
}

module.exports = { migrateViaAPI, checkTables, createTablesSQL };