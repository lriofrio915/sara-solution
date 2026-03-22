import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAssistantDoctors } from '@/lib/doctor-auth'
import SelectDoctorClient from './SelectDoctorClient'

export const dynamic = 'force-dynamic'

export default async function SelectDoctorPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const doctors = await getAssistantDoctors(user.id)

  // If not an assistant or has no doctors → back to login
  if (doctors.length === 0) redirect('/login')

  // Single-doctor assistants are handled by getDoctorFromUser without needing a cookie.
  // If somehow they land here, just send them to dashboard.
  if (doctors.length === 1) redirect('/dashboard')

  return <SelectDoctorClient doctors={doctors} />
}
