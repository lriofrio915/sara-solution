import Link from 'next/link'
import SaraLogo from '@/components/SaraLogo'

export const metadata = {
  title: 'Eliminación de Datos — Sara',
  description: 'Instrucciones para solicitar la eliminación de tus datos personales en Sara.',
}

export default function DataDeletionPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Eliminación de Datos</h1>
        <p className="text-gray-400 text-sm mb-8">Última actualización: 18 de marzo de 2026</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Tu derecho a eliminar tus datos</h2>
            <p>
              Tienes el derecho de solicitar la eliminación permanente de todos tus datos personales
              almacenados en Sara. Una vez procesada la solicitud, eliminaremos de forma irreversible
              tu cuenta, historial de conversaciones, datos de pacientes y cualquier otra información
              asociada a tu perfil en un plazo máximo de <strong>30 días hábiles</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">¿Qué datos se eliminan?</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li>Datos de cuenta: nombre, correo electrónico, contraseña y perfil profesional.</li>
              <li>Historial de conversaciones con Sara IA.</li>
              <li>Datos de pacientes ingresados en la plataforma.</li>
              <li>Citas, recetas, certificados y órdenes de examen.</li>
              <li>Configuraciones y preferencias personalizadas.</li>
              <li>Datos de facturación (excepto los que la ley exija conservar).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Cómo solicitar la eliminación</h2>
            <p className="mb-4">Puedes solicitar la eliminación de tus datos mediante cualquiera de estos métodos:</p>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Opción 1 — Desde tu cuenta</h3>
                <p>
                  Inicia sesión en Sara, ve a <strong>Configuración → Cuenta → Eliminar cuenta</strong>.
                  Confirma la acción y tu solicitud será procesada automáticamente.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Opción 2 — Por correo electrónico</h3>
                <p>
                  Envía un correo a{' '}
                  <a href="mailto:soporte@consultorio.site" className="text-primary hover:underline font-medium">
                    soporte@consultorio.site
                  </a>{' '}
                  con el asunto <strong>&quot;Solicitud de eliminación de datos&quot;</strong> e incluye
                  el correo electrónico asociado a tu cuenta. Responderemos en un plazo de 5 días hábiles.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Confirmación</h2>
            <p>
              Una vez procesada la solicitud, recibirás un correo de confirmación indicando que tus
              datos han sido eliminados de forma permanente. Si no recibes confirmación en 30 días,
              contáctanos nuevamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Excepciones legales</h2>
            <p>
              En algunos casos, la ley puede obligarnos a conservar ciertos datos (por ejemplo,
              registros de facturación o datos requeridos por autoridades sanitarias). En esos casos,
              te informaremos qué datos no pueden eliminarse y la razón legal correspondiente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contacto</h2>
            <p>
              Para cualquier consulta sobre el proceso de eliminación de datos:{' '}
              <a href="mailto:soporte@consultorio.site" className="text-primary hover:underline">
                soporte@consultorio.site
              </a>
            </p>
          </section>
        </div>

        <div className="mt-6 text-center space-x-4">
          <Link href="/privacy" className="text-sm text-gray-400 hover:text-primary transition-colors">
            ← Política de Privacidad
          </Link>
          <Link href="/terms" className="text-sm text-gray-400 hover:text-primary transition-colors">
            Términos y Condiciones →
          </Link>
        </div>
      </div>
    </div>
  )
}
