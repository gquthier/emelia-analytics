import { NextRequest, NextResponse } from 'next/server'
import { supabaseClients } from '@/lib/supabase-adapter'
import { createShareLink } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params

    // Verify client exists
    const client = await supabaseClients.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json('Client non trouvé', { status: 404 })
    }

    // Create share link
    const shareLink = createShareLink(clientId)
    const token = shareLink.split('token=')[1]

    // For now, just return the share link without storing in database
    // TODO: Implement share link storage in Supabase if needed
    
    return NextResponse.json({ shareLink })
  } catch (error) {
    console.error('Share link creation error:', error)
    return NextResponse.json('Erreur serveur', { status: 500 })
  }
}