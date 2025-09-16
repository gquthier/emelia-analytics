// Migration vers Supabase - ce fichier redirige vers l'adaptateur Supabase
import { supabaseClients, supabaseCampaigns, supabaseThreads, supabaseMessages, supabaseClientKpis } from './supabase-adapter'

// Export d'un objet "prisma" compatible pour éviter de casser le code existant
export const prisma = {
  client: supabaseClients,
  campaign: supabaseCampaigns,
  thread: supabaseThreads,
  message: supabaseMessages,
  clientKpis: supabaseClientKpis,

  // Méthodes pour la compatibilité
  $connect: async () => { console.log('Supabase adapter - no connection needed') },
  $disconnect: async () => { console.log('Supabase adapter - no disconnection needed') }
}