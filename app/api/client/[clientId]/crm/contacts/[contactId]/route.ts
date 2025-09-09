import { NextRequest, NextResponse } from 'next/server'

// PUT - Mettre à jour un contact CRM (temporairement désactivé)
export async function PUT(
  request: NextRequest,
  { params }: { params: { clientId: string; contactId: string } }
) {
  try {
    const { contactId } = params
    
    console.log('⚠️ CRM contact update temporarily disabled - needs Supabase implementation')
    
    return NextResponse.json({
      message: `CRM contact update feature temporarily disabled (contactId: ${contactId})`,
      contact: null
    })

  } catch (error) {
    console.error('Erreur lors de la mise à jour du contact CRM:', error)
    return NextResponse.json(
      { error: 'Failed to update CRM contact' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un contact du CRM (temporairement désactivé)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string; contactId: string } }
) {
  try {
    const { contactId } = params

    console.log('⚠️ CRM contact delete temporarily disabled - needs Supabase implementation')

    return NextResponse.json({
      message: `CRM contact delete feature temporarily disabled (contactId: ${contactId})`
    })

  } catch (error) {
    console.error('Erreur lors de la suppression du contact CRM:', error)
    return NextResponse.json(
      { error: 'Failed to delete CRM contact' },
      { status: 500 }
    )
  }
}