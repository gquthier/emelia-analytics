import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT - Mettre à jour un contact CRM
export async function PUT(
  request: NextRequest,
  { params }: { params: { clientId: string; contactId: string } }
) {
  try {
    const { clientId, contactId } = params
    const { status, priority, notes, nextAction, nextActionAt } = await request.json()

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

    // Préparer les données de mise à jour
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (notes !== undefined) updateData.notes = notes
    if (nextAction !== undefined) updateData.nextAction = nextAction
    if (nextActionAt !== undefined) updateData.nextActionAt = nextActionAt ? new Date(nextActionAt) : null

    // Mettre à jour le contact
    const updatedContact = await prisma.cRMContact.update({
      where: { id: contactId },
      data: updateData
    })

    // Créer une activité pour le changement de statut
    if (status && status !== existingContact.status) {
      await prisma.cRMActivity.create({
        data: {
          contactId,
          type: 'STATUS_CHANGE',
          details: `Statut changé de ${existingContact.status} à ${status}`,
          metadata: {
            oldStatus: existingContact.status,
            newStatus: status
          }
        }
      })
    }

    return NextResponse.json({ contact: updatedContact })

  } catch (error) {
    console.error('Erreur lors de la mise à jour du contact CRM:', error)
    return NextResponse.json(
      { error: 'Failed to update CRM contact' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un contact du CRM
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string; contactId: string } }
) {
  try {
    const { clientId, contactId } = params

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

    // Supprimer le contact (cascade supprime les activités)
    await prisma.cRMContact.delete({
      where: { id: contactId }
    })

    return NextResponse.json({ message: 'Contact removed from CRM' })

  } catch (error) {
    console.error('Erreur lors de la suppression du contact CRM:', error)
    return NextResponse.json(
      { error: 'Failed to delete CRM contact' },
      { status: 500 }
    )
  }
}