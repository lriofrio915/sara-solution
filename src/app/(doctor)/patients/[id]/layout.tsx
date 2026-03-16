import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import PatientTabNav from '@/components/PatientTabNav'

export const dynamic = 'force-dynamic'

function calcAge(birthDate: Date | null): string {
  if (!birthDate) return ''
  const now = new Date()
  const years = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return `${years} años`
}

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) redirect('/login')

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, doctorId: doctor.id },
    select: {
      id: true,
      name: true,
      birthDate: true,
      chart: {
        select: {
          alert1: true,
          alert2: true,
          alert3: true,
        },
      },
    },
  })

  if (!patient) redirect('/patients')

  const age = calcAge(patient.birthDate)
  const alerts = [patient.chart?.alert1, patient.chart?.alert2, patient.chart?.alert3].filter(Boolean)
  const hasAlerts = alerts.length > 0

  const tabs = [
    { href: `/patients/${params.id}`, label: 'Resumen', icon: '📋' },
    { href: `/patients/${params.id}/ficha`, label: 'Ficha Médica', icon: '🗂️' },
    { href: `/patients/${params.id}/atenciones`, label: 'Atenciones', icon: '🩺' },
    { href: `/patients/${params.id}/prescriptions`, label: 'Recetas', icon: '💊' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Patient header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="px-4 md:px-6 pt-4 pb-0">
          {/* Breadcrumb + Patient info */}
          <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <a
                href="/patients"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors flex-shrink-0"
              >
                ← Pacientes
              </a>
              <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">/</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {patient.name}
                  </h1>
                  {age && (
                    <span className="text-sm text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {age}
                    </span>
                  )}
                  {hasAlerts && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full flex-shrink-0">
                      ⚠️ {alerts.length} alerta{alerts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {hasAlerts && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {alerts.map((alert, i) => (
                      <span
                        key={i}
                        className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded"
                      >
                        {alert}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation tabs (client component for active state) */}
          <PatientTabNav tabs={tabs} />
        </div>
      </div>

      {/* Page content */}
      <div className="p-4 md:p-6">
        {children}
      </div>
    </div>
  )
}
