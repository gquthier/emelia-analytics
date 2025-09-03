import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Récupérer tous les contacts CRM d'un client
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId

    const contacts = await prisma.cRMContact.findMany({
      where: { clientId },
      include: {
        thread: {
          include: {
            campaign: {
              select: { name: true }
            },
            messages: {
              orderBy: { at: 'desc' },
              take: 5
            }
          }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Erreur lors de la récupération des contacts CRM:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CRM contacts' },
      { status: 500 }
    )
  }
}

// POST - Créer ou importer des contacts dans le CRM
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId
    const { threadIds, status = 'INTERESSE' } = await request.json()

    if (!threadIds || !Array.isArray(threadIds)) {
      return NextResponse.json(
        { error: 'threadIds array is required' },
        { status: 400 }
      )
    }

    // Créer des contacts CRM pour chaque thread
    const createdContacts = []
    
    for (const threadId of threadIds) {
      // Vérifier si le thread existe et n'est pas déjà dans le CRM
      const thread = await prisma.thread.findFirst({
        where: {
          id: threadId,
          clientId,
          crmContact: null // Pas encore dans le CRM
        }
      })

      if (thread) {
        const crmContact = await prisma.cRMContact.create({
          data: {
            clientId,
            threadId,
            status,
            priority: 'NORMALE',
            score: thread.confidence || undefined
          }
        })

        // Créer une activité
        await prisma.cRMActivity.create({
          data: {
            contactId: crmContact.id,
            type: 'STATUS_CHANGE',
            details: `Contact ajouté au CRM avec le statut ${status}`
          }
        })

        createdContacts.push(crmContact)
      }
    }

    return NextResponse.json({ 
      message: `${createdContacts.length} contacts ajoutés au CRM`,
      contacts: createdContacts
    })

  } catch (error) {
    console.error('Erreur lors de la création des contacts CRM:', error)
    return NextResponse.json(
      { error: 'Failed to create CRM contacts' },
      { status: 500 }
    )
  }
}