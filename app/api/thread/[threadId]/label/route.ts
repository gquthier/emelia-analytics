import { NextRequest, NextResponse } from 'next/server'
import { supabaseThreads } from '@/lib/supabase-adapter'

interface RouteContext {
  params: Promise<{ threadId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { threadId } = await context.params
    const { label } = await request.json()

    const validLabels = ['INTERESSE', 'A_RAPPELER', 'NEUTRE', 'PAS_INTERESSE', 'INJOIGNABLE', 'OPT_OUT']
    
    if (!validLabels.includes(label)) {
      return NextResponse.json('Label invalide', { status: 400 })
    }

    // Update thread label
    const thread = await supabaseThreads.update({
      where: { id: threadId },
      data: { 
        label,
        confidence: 1.0 // Manual correction has 100% confidence
      }
    })

    // Note: KPIs recalculation simplified for now
    // Complex queries (count, upsert) will be handled by background sync

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Label update error:', error)
    return NextResponse.json('Erreur serveur', { status: 500 })
  }
}