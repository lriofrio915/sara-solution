import { Suspense } from 'react'
import LeadCaptureForm from './LeadCaptureForm'

export default function DemoSection() {
  return (
    <section id="demo" className="py-20 px-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left — value proposition */}
          <div>
            <span className="inline-block bg-primary/10 text-primary font-semibold text-sm px-4 py-1.5 rounded-full mb-5">
              Demo gratuita
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-5 leading-tight">
              Ve Sara Medical en acción en{' '}
              <span className="text-primary">tu especialidad</span>
            </h2>
            <p className="text-gray-500 dark:text-slate-300 text-lg mb-8 leading-relaxed">
              Te mostramos cómo Sara se adapta a tu flujo de trabajo en una sesión personalizada de 20 minutos. Sin letra pequeña, sin tarjeta de crédito.
            </p>

            {/* Benefits list */}
            <ul className="space-y-3">
              {[
                'Configuración completa en menos de 15 minutos',
                'Recetas, certificados y órdenes con firma electrónica',
                'Historial clínico con antecedentes y diagnósticos CIE-10',
                'Tu página web de consultorio incluida',
                'Soporte por WhatsApp incluido',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                  <span className="text-gray-600 dark:text-slate-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>

            {/* Social proof */}
            <div className="mt-8 flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex -space-x-2">
                {['M', 'C', 'A', 'R'].map((l, i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800">
                    {l}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">+120 médicos en Ecuador</p>
                <p className="text-xs text-gray-400 dark:text-slate-400">ya usan Sara Medical en su consultorio</p>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Agenda tu demo personalizada
            </h3>
            <p className="text-sm text-gray-400 dark:text-slate-400 mb-6">
              Completa el formulario y te contactamos por WhatsApp
            </p>
            <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl" />}>
              <LeadCaptureForm />
            </Suspense>
          </div>

        </div>
      </div>
    </section>
  )
}
