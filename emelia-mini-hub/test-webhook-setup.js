// Script pour créer un client de test et tester les webhooks
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function setupTestData() {
  console.log('🔧 Configuration des données de test...')

  try {
    // 1. Créer un client de test
    const testClient = await prisma.client.create({
      data: {
        name: 'Test Client',
        code3: 'QF1',
        apiKeyEnc: crypto.randomBytes(32).toString('hex'), // Fake encrypted key for test
        createdAt: new Date()
      }
    })
    console.log('✅ Client de test créé:', testClient.name, testClient.code3)

    // 2. Créer une campagne de test
    const testCampaign = await prisma.campaign.create({
      data: {
        clientId: testClient.id,
        emeliaId: 'test-campaign-123',
        name: 'QF1 - Test Campaign',
        createdAt: new Date()
      }
    })
    console.log('✅ Campagne de test créée:', testCampaign.name)

    // 3. Créer un webhook de test
    const webhook = await prisma.webhook.create({
      data: {
        clientId: testClient.id,
        url: 'https://b2fa7b624713.ngrok-free.app/api/webhook/emelia',
        campaignType: 'email',
        events: JSON.stringify(['REPLIED']),
        secret: crypto.randomBytes(32).toString('hex'),
        isActive: true
      }
    })
    console.log('✅ Webhook de test créé:', webhook.url)

    console.log('\n🎯 Données de test prêtes ! Vous pouvez maintenant tester avec:')
    console.log('Client ID:', testClient.id)
    console.log('Code3:', testClient.code3)
    console.log('Webhook ID:', webhook.id)

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupTestData()