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
  },

  async create(options: { data: { [key: string]: unknown } }) {
    // Générer un ID unique si pas fourni
    if (!options.data.id) {
      options.data.id = `cm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    }
    
    const result = await supabaseRequest('POST', '/Client', options.data);
    return result?.[0] || result;
  },

  async update(options: { where: { id: string }, data: { [key: string]: unknown } }) {
    const result = await supabaseRequest('PATCH', `/Client?id=eq.${options.where.id}`, options.data);
    return result?.[0] || result;
  },

  async delete(options: { where: { id: string } }) {
    await supabaseRequest('DELETE', `/Client?id=eq.${options.where.id}`);
    return { id: options.where.id };
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
  },

  async findFirst(options: { where?: { [key: string]: unknown } } = {}) {
    let path = '/Campaign?select=*&limit=1';

    if (options.where) {
      const whereClause = Object.entries(options.where)
        .map(([key, value]) => `${key}=eq.${value}`)
        .join('&');
      path += `&${whereClause}`;
    }

    const result = await supabaseRequest('GET', path);
    return result?.[0] || null;
  },

  async findUnique(options: { where: { [key: string]: unknown } }) {
    let path = '/Campaign?select=*&limit=1';

    const whereClause = Object.entries(options.where)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&');
    path += `&${whereClause}`;

    const result = await supabaseRequest('GET', path);
    return result?.[0] || null;
  },

  async create(options: { data: { [key: string]: unknown } }) {
    // Générer un ID unique si pas fourni
    if (!options.data.id) {
      options.data.id = `cm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    }
    
    const result = await supabaseRequest('POST', '/Campaign', options.data);
    return result?.[0] || result;
  },

  async update(options: { where: { [key: string]: unknown }, data: { [key: string]: unknown } }) {
    const whereClause = Object.entries(options.where)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&');
    
    const result = await supabaseRequest('PATCH', `/Campaign?${whereClause}`, options.data);
    return result?.[0] || result;
  },

  async upsert(options: { where: { [key: string]: unknown }, create: { [key: string]: unknown }, update: { [key: string]: unknown } }) {
    // Try to find existing record
    const existing = await this.findUnique(options);
    
    if (existing) {
      return this.update({ where: options.where, data: options.update });
    } else {
      return this.create({ data: { ...options.where, ...options.create } });
    }
  }
};

// Adaptateur pour les ShareLink
export const supabaseShareLinks = {
  async create(options: { data: { [key: string]: unknown } }) {
    // Générer un ID unique si pas fourni
    if (!options.data.id) {
      options.data.id = `cm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    }
    
    const result = await supabaseRequest('POST', '/ShareLink', options.data);
    return result?.[0] || result;
  },

  async findFirst(options: { where: { [key: string]: unknown } }) {
    let path = '/ShareLink?select=*&limit=1';
    
    const whereClause = Object.entries(options.where)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&');
    path += `&${whereClause}`;
    
    const result = await supabaseRequest('GET', path);
    return result?.[0] || null;
  }
};

// Adaptateur pour les Thread
export const supabaseThreads = {
  async update(options: { where: { id: string }, data: { [key: string]: unknown } }) {
    const result = await supabaseRequest('PATCH', `/Thread?id=eq.${options.where.id}`, options.data);
    return result?.[0] || result;
  },

  async findUnique(options: { where: { id: string } }) {
    const path = `/Thread?select=*&id=eq.${options.where.id}&limit=1`;
    const result = await supabaseRequest('GET', path);
    return result?.[0] || null;
  },

  async findFirst(options: { where: { [key: string]: unknown } }) {
    let path = '/Thread?select=*&limit=1';
    
    const whereClause = Object.entries(options.where)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&');
    path += `&${whereClause}`;
    
    const result = await supabaseRequest('GET', path);
    return result?.[0] || null;
  },

  async create(options: { data: { [key: string]: unknown } }) {
    // Générer un ID unique si pas fourni
    if (!options.data.id) {
      options.data.id = `cm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    }
    
    const result = await supabaseRequest('POST', '/Thread', options.data);
    return result?.[0] || result;
  },

  async count(options: { where: { [key: string]: unknown } }) {
    let path = '/Thread?select=count';

    if (options.where) {
      const whereClause = Object.entries(options.where)
        .map(([key, value]) => `${key}=eq.${value}`)
        .join('&');
      path += `&${whereClause}`;
    }

    try {
      // Use HEAD request to get count from Content-Range header
      const url = `${SUPABASE_URL}/rest/v1${path}`;
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      });

      if (!response.ok) {
        console.warn(`Supabase count warning (${response.status})`);
        return 0;
      }

      const contentRange = response.headers.get('Content-Range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      }

      return 0;
    } catch (error) {
      console.error('Error in count method:', error);
      return 0;
    }
  }
};

// Adaptateur pour les Messages
export const supabaseMessages = {
  async findFirst(options: { where: { [key: string]: unknown } }) {
    let path = '/Message?select=*&limit=1';
    
    const whereClause = Object.entries(options.where)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&');
    path += `&${whereClause}`;
    
    const result = await supabaseRequest('GET', path);
    return result?.[0] || null;
  },

  async create(options: { data: { [key: string]: unknown } }) {
    // Générer un ID unique si pas fourni
    if (!options.data.id) {
      options.data.id = `cm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    }
    
    const result = await supabaseRequest('POST', '/Message', options.data);
    return result?.[0] || result;
  },

  async count(options: { where: { [key: string]: unknown } }) {
    let path = '/Message?select=count';
    
    if (options.where) {
      const whereClause = Object.entries(options.where)
        .map(([key, value]) => `${key}=eq.${value}`)
        .join('&');
      path += `&${whereClause}`;
    }
    
    const result = await supabaseRequest('HEAD', path);
    return parseInt(result.headers?.get('Content-Range')?.split('/')[1] || '0');
  }
};

// Adaptateur pour les ClientKpis
export const supabaseClientKpis = {
  async upsert(options: { where: { [key: string]: unknown }, create: { [key: string]: unknown }, update: { [key: string]: unknown } }) {
    // Try to find existing record
    let path = '/ClientKpis?select=*&limit=1';
    
    const whereClause = Object.entries(options.where)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&');
    path += `&${whereClause}`;
    
    const existing = await supabaseRequest('GET', path);
    
    if (existing?.[0]) {
      // Update existing
      const result = await supabaseRequest('PATCH', `/ClientKpis?${whereClause}`, options.update);
      return result?.[0] || result;
    } else {
      // Create new
      const createData = { ...options.where, ...options.create };
      if (!createData.id) {
        createData.id = `cm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      }
      const result = await supabaseRequest('POST', '/ClientKpis', createData);
      return result?.[0] || result;
    }
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