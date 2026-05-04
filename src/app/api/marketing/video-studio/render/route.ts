import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'

export const maxDuration = 300

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

export async function POST(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { template, params } = body

  if (!template || !params) {
    return NextResponse.json({ error: 'template y params requeridos' }, { status: 400 })
  }

  try {
    const { bundle } = await import('@remotion/bundler')
    const { renderMedia, selectComposition } = await import('@remotion/renderer')
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteerCore = (await import('puppeteer-core')).default

    const outFile = path.join('/tmp', `video-${doctor.id}-${Date.now()}.mp4`)
    const compositionId = `${template}_${params.platform ?? 'tiktok'}`

    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'src/lib/remotion/Root.tsx'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webpackOverride: (config: any) => config,
    })

    const executablePath = await chromium.executablePath()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const browser: any = await puppeteerCore.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    })

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: params,
      puppeteerInstance: browser,
    })

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outFile,
      inputProps: params,
      puppeteerInstance: browser,
    })

    await browser.close()

    const fileBuffer = await fs.readFile(outFile)
    await fs.unlink(outFile).catch(() => {})

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video-studio-${Date.now()}.mp4"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al renderizar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
