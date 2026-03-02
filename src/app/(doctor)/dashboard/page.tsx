import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { formatTime } from '@/lib/utils'
import PublicPageCard from '@/components/PublicPageCard'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }

const appointmentTypeLabel: Record<string, string> = {
  IN_PERSON: 'Presencial',
  TELECONSULT: 'Teleconsulta',
  HOME_VISIT: 'Domicilio',
  EMERGENCY: 'Urgencia',
  FOLLOW_UP: 'Seguimiento',
}

export default async function DashboardPage() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      redirect('/login')
    }

    const doctor = await prisma.doctor.findFirst({
      where: {
        OR: [
          { id: user.id },
          { email: user.email! },
        ],
      },
    })

    if (!doctor) {
      redirect('/onboarding')
    }

    // Rango de hoy
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Rango de este mes
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
    const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59, 999)

    const [todayAppointments, totalPatients, monthAppointmentsCount, pendingReminders] =
      await Promise.all([
        prisma.appointment.findMany({
          where: {
            doctorId: doctor.id,
            date: { gte: todayStart, lte: todayEnd },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
          include: { patient: { select: { name: true } } },
          orderBy: { date: 'asc' },
        }),
        prisma.patient.count({ where: { doctorId: doctor.id } }),
        prisma.appointment.count({
          where: {
            doctorId: doctor.id,
            date: { gte: monthStart, lte: monthEnd },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
        }),
        prisma.reminder.count({
          where: { doctorId: doctor.id, completed: false },
        }),
      ])

    const firstName = doctor.name.split(' ')[0]
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

    const stats = [
      { label: 'Pacientes Totales', value: totalPatients, icon: '👥', color: 'from-blue-500 to-blue-600' },
      { label: 'Citas Hoy', value: todayAppointments.length, icon: '📅', color: 'from-teal-500 to-teal-600' },
      { label: 'Citas Este Mes', value: monthAppointmentsCount, icon: '📊', color: 'from-violet-500 to-violet-600' },
      { label: 'Recordatorios', value: pendingReminders, icon: '🔔', color: 'from-orange-500 to-orange-600' },
    ]

    const quickActions = [
      { href: '/patients/new', icon: '➕', label: 'Nuevo Paciente' },
      { href: '/appointments/new', icon: '📅', label: 'Nueva Cita' },
      { href: '/sara', icon: '🤖', label: 'Consultar Sara' },
    ]

    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Aquí tienes el resumen de hoy.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl mb-4`}
              >
                {stat.icon}
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions + Sara promo + public page */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Acciones Rápidas</h2>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 hover:bg-primary/5 dark:hover:bg-primary/10 border border-gray-200 dark:border-gray-600 hover:border-primary/30 text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary px-5 py-3 rounded-xl font-medium text-sm transition-colors"
                >
                  <span>{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>

            {/* Today's appointments */}
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 text-sm">
                Citas de hoy ({todayAppointments.length})
              </h3>

              {todayAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-3xl mb-2">📅</p>
                  <p className="text-sm">No hay citas programadas hoy</p>
                  <Link
                    href="/appointments/new"
                    className="mt-3 inline-block text-primary text-sm font-medium hover:underline"
                  >
                    Agendar una cita →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-primary/5 transition-colors"
                    >
                      <div className="text-center min-w-[52px]">
                        <p className="font-bold text-primary text-sm">{formatTime(apt.date)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {apt.patient.name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {appointmentTypeLabel[apt.type] ?? apt.type}
                          {apt.reason ? ` · ${apt.reason}` : ''}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                          apt.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-700'
                            : apt.status === 'COMPLETED'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {apt.status === 'CONFIRMED'
                          ? 'Confirmada'
                          : apt.status === 'COMPLETED'
                            ? 'Completada'
                            : 'Programada'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Sara promo + public page */}
          <div className="flex flex-col gap-6">
            {/* Sara promo */}
            <div
              className="rounded-2xl p-6 text-white"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
            >
              <div className="text-4xl mb-4">✨</div>
              <h2 className="font-bold text-xl mb-2">Hola, soy Sara</h2>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                Tu asistente médica IA. Puedo ayudarte a registrar pacientes, agendar citas, buscar
                historiales y redactar recetas con solo pedírmelo.
              </p>
              <Link
                href="/sara"
                className="flex items-center justify-center gap-2 bg-white text-primary font-semibold px-5 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm"
              >
                🤖 Hablar con Sara
              </Link>
            </div>

            {/* Public page card */}
            <PublicPageCard
              slug={doctor.slug}
              appUrl={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
            />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Dashboard error:', error)
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Error cargando el dashboard</h1>
        <p className="text-gray-500 mb-4">Por favor recarga la página o contacta soporte.</p>
        <pre className="text-xs text-gray-400 bg-gray-50 p-4 rounded-xl overflow-auto">
          {String(error)}
        </pre>
      </div>
    )
  }
}
