import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    const thread = await prisma.thread.update({
      where: { id: threadId },
      data: { 
        label,
        confidence: 1.0 // Manual correction has 100% confidence
      },
      include: {
        client: {
          include: {
            kpis: true
          }
        }
      }
    })

    // Recalculate KPIs
    const interestedCount = await prisma.thread.count({
      where: {
        clientId: thread.clientId,
        label: 'INTERESSE'
      }
    })

    await prisma.clientKpis.upsert({
      where: { clientId: thread.clientId },
      update: { 
        interested: interestedCount,
        computedAt: new Date()
      },
      create: {
        clientId: thread.clientId,
        interested: interestedCount,
        sent: 0,
        delivered: 0,
        opens: 0,
        clicks: 0,
        replies: 0,
        bounces: 0,
        unsubs: 0
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Label update error:', error)
    return NextResponse.json('Erreur serveur', { status: 500 })
  }
}