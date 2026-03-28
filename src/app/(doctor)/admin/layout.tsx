import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminTabNav from '@/components/AdminTabNav'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'lriofrio915@gmail.com') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="px-4 sm:px-6 pt-5 pb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Administración
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5">
          Panel de control del sistema MedSara
        </p>
      </div>
      <AdminTabNav />
      <div className="p-3 sm:p-6">
        {children}
      </div>
    </div>
  )
}
