import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST - Ajouter une note à un contact CRM
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string; contactId: string } }
) {
  try {
    const { clientId, contactId } = params
    const { note } = await request.json()

    if (!note || typeof note !== 'string') {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 })
    }

    // Vérifier que le contact appartient au client
    const existingContact = await prisma.cRMContact.findFirst({
      where: {
        id: contactId,
        clientId
      }
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Ajouter la note aux notes existantes
    const currentNotes = existingContact.notes || ''
    const timestamp = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const newNotes = currentNotes 
      ? `${currentNotes}\n\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`

    // Mettre à jour le contact
    const updatedContact = await prisma.cRMContact.update({
      where: { id: contactId },
      data: { notes: newNotes }
    })

    // Créer une activité
    await prisma.cRMActivity.create({
      data: {
        contactId,
        type: 'NOTE_ADDED',
        details: `Note ajoutée: ${note.substring(0, 100)}${note.length > 100 ? '...' : ''}`,
        metadata: { note }
      }
    })

    return NextResponse.json({ contact: updatedContact })

  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note:', error)
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    )
  }
}