import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import SaraLogo from '@/components/SaraLogo'

export const metadata = buildMetadata({
  title: 'Términos y Condiciones — Sara',
  description: 'Términos de servicio y condiciones de uso de Sara.',
  path: '/terms',
})

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <SaraLogo size="sm" />
          <Link href="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Términos y Condiciones</h1>
        <p className="text-gray-400 text-sm mb-8">Última actualización: 1 de marzo de 2026</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Aceptación de los términos</h2>
            <p>
              Al acceder y usar Sara (&quot;el Servicio&quot;), usted acepta estar sujeto a estos
              Términos y Condiciones. Si no está de acuerdo con alguno de los términos, no debe usar
              el Servicio. El Servicio está destinado exclusivamente a profesionales de la salud
              debidamente habilitados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Descripción del Servicio</h2>
            <p>
              Sara es una plataforma SaaS de asistencia médica que utiliza inteligencia artificial
              para ayudar a profesionales de la salud a gestionar su práctica clínica. El Servicio
              incluye:
            </p>
            <ul className="list-disc ml-5 space-y-2 mt-3">
              <li>Gestión de pacientes y expedientes clínicos.</li>
              <li>Agendamiento y administración de citas médicas.</li>
              <li>Generación de recetas y prescripciones digitales.</li>
              <li>Asistente IA conversacional (Sara) para consultas clínicas y administrativas.</li>
              <li>Gestión de base de conocimiento personalizada.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Uso permitido y restricciones</h2>
            <p>Usted se compromete a:</p>
            <ul className="list-disc ml-5 space-y-2 mt-3">
              <li>Usar el Servicio únicamente para fines legítimos de práctica médica.</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>No compartir su cuenta con terceros no autorizados.</li>
              <li>No intentar acceder a datos de otros usuarios del Servicio.</li>
              <li>Cumplir con las leyes de protección de datos aplicables en su jurisdicción.</li>
            </ul>
            <p className="mt-3">
              Queda estrictamente prohibido usar el Servicio para actividades ilegales,
              fraude o cualquier propósito que viole la ética médica.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Responsabilidad médica</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
              <p className="font-semibold text-amber-800">Aviso importante</p>
            </div>
            <p>
              Sara IA es una herramienta de <strong>asistencia</strong>, no un reemplazo del juicio
              clínico profesional. El médico usuario es el único responsable de:
            </p>
            <ul className="list-disc ml-5 space-y-2 mt-3">
              <li>Verificar la precisión de toda información generada por Sara IA.</li>
              <li>Las decisiones clínicas tomadas en base a la información del Servicio.</li>
              <li>El contenido de recetas, diagnósticos y tratamientos emitidos.</li>
              <li>La veracidad de los datos ingresados sobre pacientes.</li>
            </ul>
            <p className="mt-3">
              No nos hacemos responsables por errores médicos derivados del uso de Sara IA.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Planes y pagos</h2>
            <p>
              El Servicio ofrece planes de suscripción mensual. Los precios están disponibles en
              la página de precios. El pago se procesa mensualmente mediante Stripe. Los cargos
              no son reembolsables, salvo lo indicado en nuestra política de reembolsos.
            </p>
            <p className="mt-3">
              El plan gratuito tiene limitaciones de uso. Al superar los límites del plan gratuito,
              deberá actualizar a un plan de pago para continuar usando el Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Propiedad intelectual</h2>
            <p>
              Todo el contenido, diseño, código y funcionalidad del Servicio son propiedad de
              MedSara y están protegidos por leyes de propiedad intelectual. Usted retiene la
              propiedad de los datos que ingresa al Servicio (datos de pacientes, documentos, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Disponibilidad del Servicio</h2>
            <p>
              Nos esforzamos por mantener una disponibilidad del 99.5% mensual. Sin embargo, no
              garantizamos disponibilidad ininterrumpida. Programaremos mantenimientos con aviso
              previo cuando sea posible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Terminación</h2>
            <p>
              Puede cancelar su cuenta en cualquier momento. Nos reservamos el derecho de
              suspender o terminar cuentas que violen estos términos, con o sin previo aviso.
              Tras la terminación, tendrá 30 días para exportar sus datos antes de que sean
              eliminados permanentemente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la ley, nuestra responsabilidad total ante usted
              no excederá el monto pagado por el Servicio en los últimos 12 meses. No somos
              responsables por daños indirectos, incidentales o consecuentes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República del Ecuador. Cualquier
              disputa será resuelta en los tribunales competentes de Quito, Ecuador.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contacto</h2>
            <p>
              Para consultas sobre estos términos:{' '}
              <a href="mailto:soporte@consultorio.site" className="text-primary hover:underline">
                soporte@consultorio.site
              </a>
            </p>
          </section>
        </div>

        <div className="mt-6 text-center">
          <Link href="/privacy" className="text-sm text-gray-400 hover:text-primary transition-colors">
            Ver Política de Privacidad →
          </Link>
        </div>
      </div>
    </div>
  )
}
