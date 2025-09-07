#!/usr/bin/env node

const { exec } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

console.log('🔧 Configuration automatique de ngrok pour les tests webhook...\n');

// Function to update .env file with ngrok URL
function updateEnvFile(ngrokUrl) {
  const envPath = path.join(__dirname, '.env');
  
  try {
    let envContent = readFileSync(envPath, 'utf8');
    
    // Update BASE_URL
    envContent = envContent.replace(
      /BASE_URL="[^"]*"/,
      `BASE_URL="${ngrokUrl}"`
    );
    
    writeFileSync(envPath, envContent);
    console.log(`✅ Fichier .env mis à jour avec l'URL: ${ngrokUrl}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du fichier .env:', error.message);
  }
}

// Function to get ngrok tunnel URL
function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    // Try to get ngrok API info
    exec('curl -s http://localhost:4040/api/tunnels', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      try {
        const response = JSON.parse(stdout);
        const httpsTunnel = response.tunnels.find(
          tunnel => tunnel.proto === 'https' && tunnel.config.addr === 'http://localhost:3000'
        );
        
        if (httpsTunnel) {
          resolve(httpsTunnel.public_url);
        } else {
          reject(new Error('Tunnel HTTPS non trouvé'));
        }
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

// Main setup function
async function setupNgrok() {
  try {
    // Check if ngrok is running
    console.log('🔍 Vérification si ngrok est actif...');
    
    const ngrokUrl = await getNgrokUrl();
    console.log(`🌍 URL ngrok détectée: ${ngrokUrl}`);
    
    // Update .env file
    updateEnvFile(ngrokUrl);
    
    // Display useful information
    console.log('\n🎯 Configuration terminée !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 URL publique: ${ngrokUrl}`);
    console.log(`🔗 Webhook URL pour Emelia: ${ngrokUrl}/api/webhook/emelia`);
    console.log(`🎛️  Dashboard ngrok: http://localhost:4040`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n📋 Prochaines étapes:');
    console.log('1. L\'application Next.js doit être redémarrée pour prendre en compte la nouvelle BASE_URL');
    console.log('2. Utilisez cette URL dans vos tests webhook: ' + ngrokUrl + '/api/webhook/emelia');
    console.log('3. Vous pouvez maintenant tester les webhooks depuis des services externes !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration ngrok:', error.message);
    console.log('\n💡 Suggestions:');
    console.log('1. Assurez-vous que ngrok est en cours d\'exécution: ngrok http 3000');
    console.log('2. Vérifiez que le dashboard ngrok est accessible: http://localhost:4040');
    process.exit(1);
  }
}

// Run setup
setupNgrok();