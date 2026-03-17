/**
 * Server-side PDF generation using puppeteer-core.
 * - In Vercel/serverless: uses @sparticuz/chromium (bundled headless Chromium)
 * - In local/VPS dev: uses system Chrome at CHROME_PATH
 */
import puppeteer from 'puppeteer-core'

const IS_VERCEL = !!process.env.VERCEL
const CHROME_PATH = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
// In Vercel use the public URL; in dev/VPS use localhost directly
const INTERNAL_URL = process.env.INTERNAL_APP_URL
  ?? (IS_VERCEL ? process.env.NEXT_PUBLIC_APP_URL : null)
  ?? 'http://localhost:3001'

async function getChromiumArgs(): Promise<{ executablePath: string; args: string[] }> {
  if (IS_VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default
    return {
      executablePath: await chromium.executablePath(),
      args: chromium.args,
    }
  }
  return {
    executablePath: CHROME_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
    ],
  }
}

export async function generatePdfFromPrintPage(
  path: string,           // e.g. '/prescriptions/abc123/imprimir'
  cookieHeader: string,   // raw Cookie header from the incoming request
): Promise<Buffer> {
  const { executablePath, args } = await getChromiumArgs()

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args,
  })

  try {
    const page = await browser.newPage()

    // Forward the auth cookies so the print page can authenticate
    if (cookieHeader) {
      const url = new URL(INTERNAL_URL)
      const cookies = cookieHeader.split(';').map((c) => {
        const [name, ...rest] = c.trim().split('=')
        return { name: name.trim(), value: rest.join('=').trim(), domain: url.hostname }
      })
      await page.setCookie(...cookies)
    }

    await page.goto(`${INTERNAL_URL}${path}?pdf=1`, {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    })

    // Emulate print media so @media print styles apply (hides control buttons etc.)
    await page.emulateMediaType('print')

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
