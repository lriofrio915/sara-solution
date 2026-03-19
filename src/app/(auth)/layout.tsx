import SaraLogo from '@/components/SaraLogo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Left panel - branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #0D9488 100%)' }}
      >
        <SaraLogo dark />

        <div className="text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-6">
            🏥
          </div>
          <h1 className="text-4xl font-bold mb-4">Tu consultorio, más inteligente</h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Gestiona pacientes, agenda citas y haz crecer tu práctica médica con Sara,
            tu asistente IA disponible las 24 horas.
          </p>
          <div className="mt-8 space-y-3">
            {[
              '✓ Gestión de pacientes y citas',
              '✓ Historia clínica electrónica',
              '✓ Asistente IA Sara disponible 24/7',
              '✓ Recetas y prescripciones digitales',
            ].map((f) => (
              <p key={f} className="text-blue-100 text-sm">{f}</p>
            ))}
          </div>
        </div>

        <p className="text-blue-200 text-sm">© 2025 Sara Medical</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <SaraLogo size="sm" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
