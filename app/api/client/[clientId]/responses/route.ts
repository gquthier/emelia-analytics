import { NextRequest, NextResponse } from 'next/server'
// Note: Cette route nécessite une implémentation complète avec l'adaptateur Supabase
// Pour l'instant, nous retournons des données vides pour éviter les erreurs

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { clientId } = await context.params

    // TODO: Implement full Supabase adapter for complex Message queries
    // This requires joining Thread -> Campaign -> Client tables
    
    console.log('⚠️ Responses API temporarily disabled - needs complex Supabase queries implementation')
    
    // Return empty responses for now to prevent errors
    const transformedResponses: unknown[] = []

    return NextResponse.json({ 
      responses: transformedResponses,
      total: transformedResponses.length 
    })

  } catch (error) {
    console.error('Responses API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réponses' },
      { status: 500 }
    )
  }
}