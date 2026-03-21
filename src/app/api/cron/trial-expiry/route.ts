/**
 * GET /api/cron/trial-expiry
 * Downgrades expired TRIAL doctors to FREE.
 * Call daily via cron (e.g. curl -H "x-cron-secret: $CRON_SECRET" https://consultorio.site/api/cron/trial-expiry)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await prisma.doctor.updateMany({
    where: {
      plan: 'TRIAL',
      trialEndsAt: { lt: new Date() },
    },
    data: { plan: 'FREE' },
  })

  console.log(`[cron/trial-expiry] Expired ${result.count} trial(s)`)
  return NextResponse.json({ expired: result.count })
}
