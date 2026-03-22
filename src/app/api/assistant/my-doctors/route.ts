/**
 * GET /api/assistant/my-doctors
 * Returns all doctors the authenticated assistant has access to.
 * Used by the sidebar switcher and /select-doctor page.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAssistantDoctors } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctors = await getAssistantDoctors(user.id)

    return NextResponse.json({ doctors })
  } catch (err) {
    console.error('GET /api/assistant/my-doctors:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
