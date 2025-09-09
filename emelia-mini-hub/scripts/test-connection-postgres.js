#!/usr/bin/env node
/**
 * Test direct de connexion PostgreSQL sans Prisma
 */

const { Client } = require('pg');

const supabaseRef = 'rrpxcrlmdhsavobqyibu';

// Chaînes de connexion possibles
const connectionStrings = [
  `postgresql://postgres.${supabaseRef}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres@db.${supabaseRef}.supabase.co:5432/postgres?sslmode=require`,
];

async function testPostgresConnection(connectionString, password = '') {
  const config = {
    connectionString: connectionString.replace('[password]', password),
    ssl: { rejectUnauthorized: false }
  };
  
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log(`✅ Connexion PostgreSQL réussie: ${connectionString.split('@')[1]}`);
    
    const result = await client.query('SELECT version()');
    console.log(`   Version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    
    await client.end();
    return true;
    
  } catch (error) {
    console.log(`❌ Connexion échouée: ${connectionString.split('@')[1]}`);
    console.log(`   Erreur: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Test direct des connexions PostgreSQL Supabase\n');
  
  // Test sans mot de passe
  for (const connStr of connectionStrings) {
    await testPostgresConnection(connStr, '');
  }
  
  console.log('\n💡 Si les connexions échouent, un mot de passe est requis.');
  console.log('Formats des connection strings:');
  connectionStrings.forEach((str, i) => {
    console.log(`${i + 1}. ${str}`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { testPostgresConnection };