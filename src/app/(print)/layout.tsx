import { NOINDEX } from '@/lib/seo'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Área privada con datos clínicos: fuera de buscadores, además del guard de sesión.
export const metadata = NOINDEX

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return <>{children}</>
}
