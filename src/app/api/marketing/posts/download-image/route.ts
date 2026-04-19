import { NextResponse } from 'next/server'

const ALLOWED_DOMAIN_SUFFIXES = [
  'kie.ai',
  'aiquickdraw.com',
  'redpandaai.co',
  'erweima.ai',
  'pollinations.ai',
]

function isHostnameAllowed(hostname: string) {
  return ALLOWED_DOMAIN_SUFFIXES.some(
    d => hostname === d || hostname.endsWith(`.${d}`)
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const filename = searchParams.get('filename') ?? 'descarga'

  if (!url) return NextResponse.json({ error: 'url requerida' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:' || !isHostnameAllowed(parsed.hostname)) {
    console.warn('[download-image] Origen rechazado:', parsed.hostname, 'url:', url)
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  const upstream = await fetch(url)
  if (!upstream.ok) {
    console.warn('[download-image] Upstream falló', upstream.status, url)
    return NextResponse.json({ error: 'No se pudo obtener el archivo' }, { status: 502 })
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  const ext = contentType.includes('video') ? 'mp4' : 'jpg'
  const buffer = await upstream.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}.${ext}"`,
      'Cache-Control': 'no-store',
    },
  })
}
