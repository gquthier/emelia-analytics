/**
 * Adaptateur Supabase API - Solution temporaire pour contourner 
 * le problème d'authentification PostgreSQL
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rrpxcrlmdhsavobqyibu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycHhjcmxtZGhzYXZvYnF5aWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMzU5OTUsImV4cCI6MjA3MjgxMTk5NX0.HPqYqtGDaNV2ve1LLJmmddL52xxbmbLin1PGiY6c5PY';

async function supabaseRequest(method: string, path: string, data?: unknown) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const options: RequestInit = {
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

// Adaptateur pour les clients
export const supabaseClients = {
  async findMany(options: { orderBy?: { [key: string]: string } } = {}) {
    let path = '/Client?select=*';
    
    if (options.orderBy) {
      const orderField = Object.keys(options.orderBy)[0];
      const orderDirection = options.orderBy[orderField];
      path += `&order=${orderField}.${orderDirection}`;
    }
    
    return await supabaseRequest('GET', path);
  },

  async findFirst(options: { where?: { [key: string]: unknown } }) {
    let path = '/Client?select=*&limit=1';
    
    if (options.where) {
      const whereClause = Object.entries(options.where)
        .map(([key, value]) => `${key}=eq.${value}`)
        .join('&');
      path += `&${whereClause}`;
    }
    
    const result = await supabaseRequest('GET', path);
    return result?.[0] || null;
  },

  async findUnique(options: { where: { id: string }, include?: { kpis?: boolean } }) {
    const path = `/Client?select=*&id=eq.${options.where.id}&limit=1`;
    
    const result = await supabaseRequest('GET', path);
    const client = result?.[0];
    
    if (!client) return null;
    
    // Si include est demandé, récupérer les relations
    if (options.include) {
      if (options.include.kpis) {
        try {
          const kpis = await supabaseRequest('GET', `/ClientKpis?select=*&clientId=eq.${client.id}&limit=1`);
          client.kpis = kpis?.[0] || null;
        } catch {
          client.kpis = null;
        }
      }
    }
    
    return client;
  }
};

// Adaptateur pour les campagnes
export const supabaseCampaigns = {
  async findMany(options: { where?: { [key: string]: unknown } } = {}) {
    let path = '/Campaign?select=*';
    
    if (options.where) {
      const whereClause = Object.entries(options.where)
        .map(([key, value]) => `${key}=eq.${value}`)
        .join('&');
      path += `&${whereClause}`;
    }
    
    return await supabaseRequest('GET', path);
  }
};

// Fonction utilitaire pour convertir les dates ISO en objets Date
function convertDates(obj: unknown): unknown {
  if (!obj) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(convertDates);
  }
  
  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Convertir les champs de date connus
      if (['lastAt', 'firstAt', 'createdAt', 'updatedAt', 'at', 'lastSyncAt'].includes(key)) {
        if (typeof value === 'string' && value) {
          try {
            converted[key] = new Date(value);
          } catch {
            console.warn(`Erreur conversion date pour ${key}:`, value);
            converted[key] = null;
          }
        } else {
          converted[key] = value; // null, undefined, or already a Date
        }
      } else if (typeof value === 'object') {
        converted[key] = convertDates(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }
  
  return obj;
}

// Fonction spéciale pour la page des réponses avec relations complexes
export async function getClientWithThreadsAndMessages(clientId: string) {
  try {
    // 1. Récupérer le client
    const clients = await supabaseRequest('GET', `/Client?select=*&id=eq.${clientId}&limit=1`);
    const client = clients?.[0];
    
    if (!client) return null;

    // 2. Récupérer les campagnes du client
    const campaigns = await supabaseRequest('GET', `/Campaign?select=*&clientId=eq.${clientId}`);
    
    // 3. Pour chaque campagne, récupérer les threads
    const campaignsWithThreads = await Promise.all(
      (campaigns as Array<Record<string, unknown>>).map(async (campaign) => {
        // Récupérer les threads de cette campagne
        const threads = await supabaseRequest('GET', `/Thread?select=*&campaignId=eq.${campaign.id}&order=lastAt.desc`);
        
        // Pour chaque thread, récupérer le dernier message INBOUND
        const threadsWithMessages = await Promise.all(
          (threads as Array<Record<string, unknown>>).map(async (thread) => {
            const messages = await supabaseRequest('GET', `/Message?select=*&threadId=eq.${thread.id}&direction=eq.INBOUND&order=at.desc&limit=1`);
            
            return {
              ...thread,
              messages: convertDates(messages),
              campaign: { name: campaign.name }
            };
          })
        );
        
        return {
          ...campaign,
          threads: convertDates(threadsWithMessages)
        };
      })
    );
    
    return convertDates({
      ...client,
      campaigns: campaignsWithThreads
    });
    
  } catch (error) {
    console.error('❌ Erreur getClientWithThreadsAndMessages:', error);
    throw error;
  }
}

// Test de connexion Supabase
export async function testSupabaseConnection() {
  try {
    const clients = await supabaseClients.findMany();
    console.log(`✅ Connexion Supabase API réussie - ${clients.length} clients trouvés`);
    return true;
  } catch (error) {
    console.error('❌ Échec connexion Supabase API:', error);
    return false;
  }
}