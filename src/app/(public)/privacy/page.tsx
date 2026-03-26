import Link from 'next/link'
import SaraLogo from '@/components/SaraLogo'

export const metadata = {
  title: 'Política de Privacidad y Protección de Datos — Sara',
  description: 'Política de privacidad, protección de datos personales y derechos ARCO conforme a la LOPDP Ecuador.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <SaraLogo size="sm" />
          <Link href="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad y Protección de Datos</h1>
        <p className="text-gray-400 text-sm mb-2">Última actualización: 25 de marzo de 2026</p>
        <p className="text-gray-500 text-xs mb-8">
          Conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador,
          Registro Oficial Suplemento 459 del 26 de mayo de 2021, y sus reglamentos vigentes
          (SPDP resoluciones 2025-2026).
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <strong>Datos sensibles de salud:</strong> Esta plataforma trata datos de salud, que constituyen{' '}
          <strong>datos sensibles</strong> conforme al Art. 26 de la LOPDP. Su tratamiento requiere y cuenta
          con el <strong>consentimiento expreso</strong> del titular. Se aplican medidas de seguridad reforzadas.
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Responsables del tratamiento</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li>
                <strong>Operador de la plataforma:</strong> Nexus Automatizaciones (Nexus Solutions),
                RUC: [en trámite], correo: <a href="mailto:dpo@consultorio.site" className="text-primary hover:underline">dpo@consultorio.site</a>
              </li>
              <li>
                <strong>Responsable del tratamiento de datos de pacientes:</strong> El profesional de
                salud que utiliza la plataforma en calidad de médico tratante, conforme al Acuerdo
                Ministerial 0009-2017 y AM 00115-2021.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Datos que recopilamos y base legal</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">Categoría</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Datos</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Base legal (LOPDP)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-medium">Cuenta médico</td>
                    <td className="border border-gray-200 px-3 py-2">Nombre, email, cédula, especialidad, código MSP, SENESCYT, teléfono</td>
                    <td className="border border-gray-200 px-3 py-2">Contrato (Art. 22 LOPDP)</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="border border-gray-200 px-3 py-2 font-medium text-red-700">Datos de salud (sensibles)</td>
                    <td className="border border-gray-200 px-3 py-2">Historia clínica, diagnósticos (CIE-10/11), prescripciones, signos vitales, alergias, antecedentes</td>
                    <td className="border border-gray-200 px-3 py-2">Consentimiento expreso (Art. 26 LOPDP) + Obligación legal AM 0009-2017</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-medium">Datos de paciente</td>
                    <td className="border border-gray-200 px-3 py-2">Nombre, cédula/pasaporte, fecha nacimiento, contacto</td>
                    <td className="border border-gray-200 px-3 py-2">Consentimiento + Obligación legal sanitaria</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-medium">Técnicos</td>
                    <td className="border border-gray-200 px-3 py-2">IP, navegador, logs de acceso (auditoría LOPDP)</td>
                    <td className="border border-gray-200 px-3 py-2">Interés legítimo en seguridad (Art. 22 LOPDP)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-medium">Firma electrónica</td>
                    <td className="border border-gray-200 px-3 py-2">Certificado .p12 BCE (almacenado cifrado AES-256-GCM)</td>
                    <td className="border border-gray-200 px-3 py-2">Contrato + AM 0009-2017</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Finalidades del tratamiento</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li>Gestión de historia clínica electrónica conforme al AM 0009-2017 y AM 00115-2021.</li>
              <li>Emisión de recetas médicas, certificados y órdenes de examen.</li>
              <li>Gestión de citas y seguimiento clínico del paciente.</li>
              <li>Asistencia médica mediante IA (Sara) para apoyo al profesional de salud.</li>
              <li>Cumplimiento de obligaciones legales ante ACESS, MSP y autoridades sanitarias.</li>
              <li>Facturación y gestión administrativa del consultorio.</li>
            </ul>
            <p className="mt-3 font-medium text-red-700">
              NO vendemos, compartimos ni cedemos datos de salud a terceros con fines comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Subencargados del tratamiento</h2>
            <p className="mb-3">Trabajamos con los siguientes subencargados, todos con acuerdos de confidencialidad y protección de datos:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Supabase Inc.</strong> (infraestructura AWS us-east-1) — base de datos, autenticación y almacenamiento de archivos.</li>
              <li><strong>OpenRouter / DeepSeek</strong> — procesamiento de consultas IA. Se recomienda no incluir datos identificables de pacientes en mensajes a Sara.</li>
              <li><strong>Stripe Inc.</strong> — procesamiento de pagos. No accede a datos de salud.</li>
              <li><strong>Resend</strong> — envío de correos transaccionales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Conservación de datos</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li>
                <strong>Historia clínica electrónica:</strong> mínimo <strong>15 años</strong> desde la
                última atención, conforme al Acuerdo Ministerial 0009-2017, Art. 3. Durante este período,
                los datos médicos se conservan aunque el titular solicite la eliminación.
              </li>
              <li>
                <strong>Datos de facturación:</strong> 7 años conforme a normativa SRI (Ley Orgánica de Régimen Tributario).
              </li>
              <li>
                <strong>Datos de cuenta y de contacto:</strong> mientras dure la relación contractual; se eliminan
                dentro de 30 días hábiles tras la solicitud de baja, salvo obligación legal.
              </li>
              <li>
                <strong>Logs de auditoría:</strong> mínimo 5 años conforme a buenas prácticas de seguridad (LOPDP Art. 30).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Medidas de seguridad</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li>Cifrado en tránsito: TLS 1.3 / HTTPS en todas las comunicaciones.</li>
              <li>Cifrado en reposo: discos cifrados (AES-256) en AWS; certificados de firma cifrados con AES-256-GCM.</li>
              <li>Control de acceso por roles (OWNER/ASSISTANT) con aislamiento multi-tenant.</li>
              <li>Autenticación mediante JWT (Supabase Auth) con sesiones de tiempo limitado.</li>
              <li>Logs de auditoría inmutables por paciente (quién accedió, qué acción, desde qué IP).</li>
              <li>Row Level Security (RLS) en la base de datos.</li>
              <li>Backups periódicos con script <code>backup-db.sh</code>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Sus derechos ARCO (LOPDP Art. 68-72)</h2>
            <p className="mb-3">Conforme a la LOPDP, usted tiene los siguientes derechos:</p>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="font-bold text-primary w-28 flex-shrink-0">Acceso</span>
                <span>Conocer qué datos suyos tratamos, para qué finalidad y durante cuánto tiempo. Solicitar copia de sus datos en formato portable (JSON). Endpoint: <code>GET /api/arco/export</code></span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="font-bold text-primary w-28 flex-shrink-0">Rectificación</span>
                <span>Corregir datos inexactos o incompletos. Contáctenos indicando el dato erróneo y el correcto.</span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="font-bold text-primary w-28 flex-shrink-0">Cancelación</span>
                <span>Solicitar la eliminación de sus datos. Los datos médicos sujetos a retención legal (15 años) serán anonimizados pero no eliminados hasta cumplirse el plazo. Endpoint: <code>POST /api/arco/delete</code> o desde Configuración → Eliminar cuenta.</span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="font-bold text-primary w-28 flex-shrink-0">Oposición</span>
                <span>Oponerse al tratamiento de sus datos para finalidades específicas (ej: marketing). El tratamiento médico obligatorio no puede ser objeto de oposición.</span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="font-bold text-primary w-28 flex-shrink-0">Portabilidad</span>
                <span>Recibir sus datos en formato estructurado y legible por máquina (JSON). Endpoint: <code>GET /api/arco/export</code></span>
              </div>
            </div>
            <p className="mt-4">
              Para ejercer cualquiera de estos derechos, contacte a nuestro{' '}
              <strong>Delegado de Protección de Datos (DPD)</strong>:{' '}
              <a href="mailto:dpo@consultorio.site" className="text-primary hover:underline font-medium">dpo@consultorio.site</a>.
              Responderemos en un plazo máximo de 15 días hábiles.
            </p>
            <p className="mt-2 text-gray-500">
              Si considera que su solicitud no ha sido atendida, puede presentar una reclamación ante la{' '}
              <strong>Superintendencia de Protección de Datos Personales (SPDP)</strong>:{' '}
              <a href="https://spdp.gob.ec" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">spdp.gob.ec</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Delegado de Protección de Datos (DPD)</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p>
                Hemos designado un <strong>Delegado de Protección de Datos (DPD)</strong> conforme a
                la SPDP Resolución 0004-R (2025):
              </p>
              <ul className="list-none mt-2 space-y-1">
                <li><strong>Email:</strong> <a href="mailto:dpo@consultorio.site" className="text-primary hover:underline">dpo@consultorio.site</a></li>
                <li><strong>Organización:</strong> Nexus Automatizaciones</li>
                <li><strong>Funciones:</strong> Supervisar cumplimiento LOPDP, atender solicitudes ARCO, gestionar notificaciones de brechas ante SPDP.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Transferencias internacionales</h2>
            <p>
              Los datos se alojan en servidores de <strong>Supabase Inc.</strong> (AWS us-east-1, Estados Unidos).
              Esta transferencia se realiza bajo garantías adecuadas (contractuales) conforme al Art. 54 de la LOPDP.
              OpenRouter (proveedor de IA) puede procesar fragmentos de conversaciones fuera de Ecuador; se
              recomienda no incluir datos identificables de pacientes en consultas a Sara.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Consentimiento y retiro</h2>
            <p>
              Para el tratamiento de datos de salud, obtenemos el <strong>consentimiento expreso e informado</strong>
              del paciente conforme al Art. 26 LOPDP, registrado digitalmente con fecha, IP y versión del texto.
            </p>
            <p className="mt-2">
              El consentimiento puede retirarse en cualquier momento contactando al médico tratante o a{' '}
              <a href="mailto:dpo@consultorio.site" className="text-primary hover:underline">dpo@consultorio.site</a>.
              El retiro del consentimiento no afecta la licitud del tratamiento previo. Pueden existir
              limitaciones al retiro cuando el tratamiento sea necesario para cumplir obligaciones legales (AM 0009-2017).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Notificación de brechas de seguridad</h2>
            <p>
              En caso de brecha de seguridad que afecte a datos de salud, notificaremos a la SPDP en un
              plazo máximo de <strong>72 horas</strong> desde su conocimiento (Art. 40 LOPDP), y a los
              titulares afectados sin demora injustificada cuando la brecha pueda suponer un riesgo elevado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Cookies</h2>
            <p>
              Utilizamos únicamente cookies estrictamente necesarias para mantener la sesión autenticada.
              No usamos cookies de rastreo, publicidad ni analítica de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">13. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política para reflejar cambios normativos (LOPDP, SPDP, ACESS).
              Notificaremos cambios significativos por correo electrónico con al menos 15 días de
              anticipación. La fecha de última actualización siempre aparece al inicio.
            </p>
          </section>

        </div>

        <div className="mt-6 text-center space-x-4">
          <Link href="/eliminar-datos" className="text-sm text-gray-400 hover:text-primary transition-colors">
            Solicitar eliminación de datos
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/terms" className="text-sm text-gray-400 hover:text-primary transition-colors">
            Términos y Condiciones →
          </Link>
        </div>
      </div>
    </div>
  )
}
