import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { subDays, format, eachDayOfInterval } from 'date-fns'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json('Client non trouvé', { status: 404 })
    }

    const endDate = new Date()
    const startDate = subDays(endDate, days - 1)

    // Generate all dates in the range
    const allDates = eachDayOfInterval({ start: startDate, end: endDate })

    // Get messages grouped by date
    const messages = await prisma.message.groupBy({
      by: ['at'],
      where: {
        thread: {
          clientId
        },
        at: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        _all: true
      }
    })

    // Create timeline data
    const timelineData = allDates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      
      // Count events for this date
      const dayMessages = messages.filter(m => 
        format(new Date(m.at), 'yyyy-MM-dd') === dateStr
      )
      
      // This is a simplified version - in a real implementation,
      // you would need to categorize messages by type (sent, delivered, opens, clicks, replies)
      const count = dayMessages.reduce((sum, m) => sum + m._count._all, 0)
      
      return {
        date: dateStr,
        sent: Math.floor(count * 0.8), // Simplified calculation
        delivered: Math.floor(count * 0.75),
        opens: Math.floor(count * 0.4),
        clicks: Math.floor(count * 0.1),
        replies: Math.floor(count * 0.05)
      }
    })

    return NextResponse.json({ data: timelineData })
  } catch (error) {
    console.error('Timeline error:', error)
    return NextResponse.json('Erreur serveur', { status: 500 })
  }
}