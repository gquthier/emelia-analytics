import { NextRequest, NextResponse } from 'next/server'

// GET - Récupérer tous les contacts CRM d'un client
export async function GET() {
  try {
    // Return empty contacts for now - CRM feature requires complex Supabase adapter work
    const contacts: unknown[] = []

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
export async function POST(request: NextRequest) {
  try {
    const { threadIds } = await request.json()

    if (!threadIds || !Array.isArray(threadIds)) {
      return NextResponse.json(
        { error: 'threadIds array is required' },
        { status: 400 }
      )
    }

    // Return empty success for now - CRM feature requires complex Supabase adapter work
    const createdContacts: unknown[] = []

    return NextResponse.json({ 
      message: `CRM feature temporarily disabled - requires Supabase adapter implementation`,
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