import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Data Deletion Callback — requerido por Meta/Facebook y otras plataformas.
 *
 * POST /api/data-deletion
 * Recibe signed_request, decodifica el user_id y retorna la URL de estado
 * y un confirmation_code único para que el usuario pueda verificar el estado.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData().catch(() => null)
    const signedRequest = body?.get('signed_request') as string | null

    let userId: string | null = null

    if (signedRequest) {
      userId = parseSignedRequest(signedRequest)
    }

    // Generar código de confirmación único
    const confirmationCode = crypto
      .createHash('sha256')
      .update(`${userId ?? 'anonymous'}-${Date.now()}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'
    const statusUrl = `${baseUrl}/eliminar-datos?code=${confirmationCode}`

    // Respuesta requerida por Meta
    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

/** GET para verificación básica del endpoint */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'data-deletion-callback',
    instructions_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/eliminar-datos`,
  })
}

/**
 * Decodifica el signed_request de Meta para extraer el user_id.
 * Referencia: https://developers.facebook.com/docs/games/gamesonfacebook/login#parsingsr
 */
function parseSignedRequest(signedRequest: string): string | null {
  try {
    const [, payload] = signedRequest.split('.')
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    const data = JSON.parse(decoded)
    return data.user_id ?? null
  } catch {
    return null
  }
}
