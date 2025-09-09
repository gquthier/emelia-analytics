#!/usr/bin/env node
/**
 * Test de connexion Supabase PostgreSQL
 * 
 * Ce script teste différentes chaînes de connexion pour Supabase
 */

const { PrismaClient } = require('@prisma/client');

const supabaseRef = 'rrpxcrlmdhsavobqyibu';

// Chaînes de connexion possibles pour Supabase
const connectionStrings = [
  // Pooler connection (recommandée pour les apps)
  `postgresql://postgres.${supabaseRef}:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  // Direct connection
  `postgresql://postgres:[password]@db.${supabaseRef}.supabase.co:5432/postgres?sslmode=require`,
  // Alternative avec pgbouncer
  `postgresql://postgres.${supabaseRef}:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require`,
];

async function testConnection(connectionString, password = '') {
  const fullConnectionString = connectionString.replace('[password]', password);
  
  try {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: fullConnectionString
        }
      }
    });

    // Test simple de connexion
    await prisma.$connect();
    console.log(`✅ Connexion réussie: ${connectionString.split('@')[1]}`);
    
    // Test d'une requête simple
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log(`   PostgreSQL version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`);
    
    await prisma.$disconnect();
    return true;
    
  } catch (error) {
    console.log(`❌ Échec: ${connectionString.split('@')[1]}`);
    console.log(`   Erreur: ${error.message}`);
    return false;
  }
}

async function findWorkingConnection() {
  console.log('🔍 Test des connexions Supabase PostgreSQL\n');
  
  // D'abord, tester sans mot de passe (au cas où ce serait une base publique)
  console.log('📡 Test sans mot de passe...');
  for (const connStr of connectionStrings) {
    const success = await testConnection(connStr, '');
    if (success) {
      return connStr.replace('[password]', '');
    }
  }
  
  console.log('\n🔐 Mot de passe requis. Voici les formats à tester:');
  connectionStrings.forEach((connStr, index) => {
    console.log(`${index + 1}. ${connStr}`);
  });
  
  console.log('\n💡 Pour obtenir votre mot de passe:');
  console.log('1. Allez sur https://supabase.com/dashboard');
  console.log('2. Projet → Settings → Database');
  console.log('3. Copiez le mot de passe ou la connection string complète');
  
  return null;
}

async function main() {
  try {
    const workingConnection = await findWorkingConnection();
    
    if (workingConnection) {
      console.log(`\n🎯 Connection string valide:`);
      console.log(`DATABASE_URL="${workingConnection}"`);
      console.log('\nMettez cette valeur dans votre fichier .env');
    } else {
      console.log('\n⚠️  Aucune connexion sans mot de passe ne fonctionne.');
      console.log('Un mot de passe est requis pour continuer.');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testConnection, findWorkingConnection };