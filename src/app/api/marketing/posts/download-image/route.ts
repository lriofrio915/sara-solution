import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'image.kie.ai',
  'video.kie.ai',
  'image.pollinations.ai',
]

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

  if (!ALLOWED_ORIGINS.some(o => parsed.hostname === o)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  const upstream = await fetch(url)
  if (!upstream.ok) {
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
