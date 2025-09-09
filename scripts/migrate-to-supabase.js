#!/usr/bin/env node
/**
 * Migration script: SQLite → Supabase PostgreSQL
 * 
 * Ce script migre toutes les données de SQLite vers Supabase PostgreSQL
 * en conservant les relations et l'intégrité des données.
 */

const { PrismaClient: PrismaClientSQLite } = require('@prisma/client');
const { PrismaClient: PrismaClientPostgreSQL } = require('@prisma/client');

// Configuration des deux bases de données
const sqliteClient = new PrismaClientSQLite({
  datasources: {
    db: {
      url: "file:./prisma/dev.db"
    }
  }
});

const postgresClient = new PrismaClientPostgreSQL({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function migrateData() {
  console.log('🚀 Début de la migration SQLite → Supabase PostgreSQL\n');

  try {
    // 1. Vérifier la connexion Supabase
    console.log('📡 Test de connexion à Supabase...');
    await postgresClient.$connect();
    console.log('✅ Connexion Supabase réussie\n');

    // 2. Migrer les clients
    console.log('👥 Migration des clients...');
    const clients = await sqliteClient.client.findMany({
      include: {
        kpis: true,
        shareLinks: true,
        webhooks: {
          include: {
            deliveries: true
          }
        }
      }
    });
    
    let migratedClients = 0;
    for (const client of clients) {
      const { kpis, shareLinks, webhooks, ...clientData } = client;
      
      // Créer le client
      await postgresClient.client.upsert({
        where: { id: client.id },
        create: clientData,
        update: clientData
      });

      // Migrer les KPIs
      if (kpis) {
        await postgresClient.clientKpis.upsert({
          where: { clientId: client.id },
          create: kpis,
          update: kpis
        });
      }

      // Migrer les liens de partage
      for (const shareLink of shareLinks) {
        await postgresClient.shareLink.upsert({
          where: { id: shareLink.id },
          create: shareLink,
          update: shareLink
        });
      }

      // Migrer les webhooks et leurs livraisons
      for (const webhook of webhooks) {
        const { deliveries, ...webhookData } = webhook;
        
        await postgresClient.webhook.upsert({
          where: { id: webhook.id },
          create: webhookData,
          update: webhookData
        });

        // Migrer les livraisons de webhook
        for (const delivery of deliveries) {
          await postgresClient.webhookDelivery.upsert({
            where: { id: delivery.id },
            create: delivery,
            update: delivery
          });
        }
      }

      migratedClients++;
      console.log(`  ✅ Client migré: ${client.name} (${client.code3})`);
    }
    console.log(`📊 ${migratedClients} clients migrés\n`);

    // 3. Migrer les campagnes
    console.log('📧 Migration des campagnes...');
    const campaigns = await sqliteClient.campaign.findMany();
    
    let migratedCampaigns = 0;
    for (const campaign of campaigns) {
      await postgresClient.campaign.upsert({
        where: { 
          clientId_emeliaId: {
            clientId: campaign.clientId,
            emeliaId: campaign.emeliaId
          }
        },
        create: campaign,
        update: campaign
      });
      migratedCampaigns++;
    }
    console.log(`📊 ${migratedCampaigns} campagnes migrées\n`);

    // 4. Migrer les threads avec contacts CRM
    console.log('🧵 Migration des threads...');
    const threads = await sqliteClient.thread.findMany({
      include: {
        crmContact: {
          include: {
            activities: true,
            responseTimes: true
          }
        }
      }
    });
    
    let migratedThreads = 0;
    for (const thread of threads) {
      const { crmContact, ...threadData } = thread;
      
      // Migrer le thread
      await postgresClient.thread.upsert({
        where: { id: thread.id },
        create: threadData,
        update: threadData
      });

      // Migrer le contact CRM si présent
      if (crmContact) {
        const { activities, responseTimes, ...contactData } = crmContact;
        
        await postgresClient.cRMContact.upsert({
          where: { threadId: thread.id },
          create: contactData,
          update: contactData
        });

        // Migrer les activités CRM
        for (const activity of activities) {
          await postgresClient.cRMActivity.upsert({
            where: { id: activity.id },
            create: activity,
            update: activity
          });
        }

        // Migrer les temps de réponse
        for (const responseTime of responseTimes) {
          await postgresClient.cRMResponseTime.upsert({
            where: { id: responseTime.id },
            create: responseTime,
            update: responseTime
          });
        }
      }

      migratedThreads++;
    }
    console.log(`📊 ${migratedThreads} threads migrés\n`);

    // 5. Migrer les messages
    console.log('💬 Migration des messages...');
    const messages = await sqliteClient.message.findMany();
    
    let migratedMessages = 0;
    for (const message of messages) {
      await postgresClient.message.upsert({
        where: { id: message.id },
        create: message,
        update: message
      });
      migratedMessages++;
    }
    console.log(`📊 ${migratedMessages} messages migrés\n`);

    // 6. Vérification finale
    console.log('🔍 Vérification de la migration...');
    const postgresStats = {
      clients: await postgresClient.client.count(),
      campaigns: await postgresClient.campaign.count(),
      threads: await postgresClient.thread.count(),
      messages: await postgresClient.message.count(),
      webhooks: await postgresClient.webhook.count(),
      shareLinks: await postgresClient.shareLink.count()
    };

    console.log('📈 Statistiques finales:');
    console.log(`  👥 Clients: ${postgresStats.clients}`);
    console.log(`  📧 Campagnes: ${postgresStats.campaigns}`);
    console.log(`  🧵 Threads: ${postgresStats.threads}`);
    console.log(`  💬 Messages: ${postgresStats.messages}`);
    console.log(`  🔗 Webhooks: ${postgresStats.webhooks}`);
    console.log(`  🔗 Liens de partage: ${postgresStats.shareLinks}`);

    console.log('\n✅ Migration terminée avec succès!');
    console.log('🚀 Votre application peut maintenant utiliser Supabase PostgreSQL');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

// Lancer la migration
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };