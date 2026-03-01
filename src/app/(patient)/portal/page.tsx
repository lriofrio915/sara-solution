import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Portal del Paciente' }

export default function PatientDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-sm">
              P
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Portal del Paciente</p>
              <p className="text-gray-400 text-xs">Dra. Stéfanny Medrano</p>
            </div>
          </div>
          <Link href="/login" className="text-gray-400 hover:text-gray-600 text-sm">
            Cerrar sesión
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Bienvenido/a a tu portal</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: '📅', title: 'Mis Citas', desc: 'Ver y gestionar tus próximas citas médicas', href: '#' },
            { icon: '📋', title: 'Historial Médico', desc: 'Accede a tu historial de consultas y diagnósticos', href: '#' },
            { icon: '💊', title: 'Mis Recetas', desc: 'Consulta tus prescripciones y medicamentos', href: '#' },
            { icon: '📄', title: 'Resultados', desc: 'Revisa tus exámenes y resultados de laboratorio', href: '#' },
            { icon: '📞', title: 'Contactar', desc: 'Comunícate directamente con la doctora', href: 'https://wa.me/593998176580' },
          ].map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{card.title}</h3>
              <p className="text-gray-500 text-sm">{card.desc}</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
