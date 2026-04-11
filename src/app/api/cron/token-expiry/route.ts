/**
 * GET /api/cron/token-expiry
 * Sends email alerts to doctors whose social media tokens expire in 7 days or fewer.
 * Run daily via Vercel Cron or external scheduler.
 *
 * Cron schedule (vercel.json): "0 9 * * *"  (09:00 UTC = 04:00 Ecuador)
 * Header required: x-cron-secret: $CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTokenExpiryEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const PLATFORMS = ['instagram', 'facebook', 'linkedin'] as const
const WARN_DAYS = 7 // notify when token expires within this many days

interface SocialTokens {
  [platform: string]: {
    accessToken?: string
    expiresAt?: string
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const warnCutoff = new Date(now.getTime() + WARN_DAYS * 24 * 60 * 60 * 1000)

  // Fetch all doctors with socialTokens set
  const doctors = await prisma.doctor.findMany({
    where: { socialTokens: { not: null } },
    select: { id: true, name: true, email: true, socialTokens: true },
  })

  let notified = 0
  let errors = 0

  for (const doctor of doctors) {
    let tokens: SocialTokens = {}
    try {
      tokens = JSON.parse(doctor.socialTokens!) as SocialTokens
    } catch {
      continue
    }

    const expiring: string[] = []

    for (const platform of PLATFORMS) {
      const t = tokens[platform]
      if (!t?.accessToken || !t?.expiresAt) continue

      const expiresAt = new Date(t.expiresAt)
      if (expiresAt <= warnCutoff && expiresAt > now) {
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        expiring.push(`${platform}:${daysLeft}`)
      }
    }

    if (expiring.length === 0) continue

    // Build human-readable platform list and minimum days
    const platformNames = expiring.map(e => {
      const [p] = e.split(':')
      return p.charAt(0).toUpperCase() + p.slice(1)
    })
    const minDays = Math.min(...expiring.map(e => parseInt(e.split(':')[1])))

    try {
      await sendTokenExpiryEmail(doctor.email, doctor.name, platformNames, minDays)
      notified++
      console.log(`[cron/token-expiry] Notified ${doctor.email} (${platformNames.join(', ')}, ${minDays}d left)`)
    } catch (err) {
      errors++
      console.error(`[cron/token-expiry] Failed to email ${doctor.email}:`, err)
    }
  }

  return NextResponse.json({ notified, errors, checked: doctors.length })
}
