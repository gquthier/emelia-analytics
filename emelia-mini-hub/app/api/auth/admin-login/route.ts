import { NextRequest, NextResponse } from 'next/server'
import { validateAdminCode, createAdminSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { accessCode } = await request.json()

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Code d\'accès requis' },
        { status: 400 }
      )
    }

    // Vérifier le code d'accès
    if (!validateAdminCode(accessCode)) {
      return NextResponse.json(
        { error: 'Code d\'accès incorrect' },
        { status: 401 }
      )
    }

    // Créer une session admin
    await createAdminSession()

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}