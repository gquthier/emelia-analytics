import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'success',
    message: 'API fonctionne correctement',
    timestamp: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasAesKey: !!process.env.AES_KEY,
    }
  })
}