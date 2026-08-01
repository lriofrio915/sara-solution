import type { Metadata } from 'next'
import Link from 'next/link'
import SaraLogo from '@/components/SaraLogo'
import DoctorTestimonial from '@/components/DoctorTestimonial'
import { HOTMART } from '@/lib/plan'
import { Check, X } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Precios — Sara Medical | Planes para tu consultorio',
  description:
    'Sara Medical automatiza tu agenda, recetas digitales y marketing con IA. Plan Pro $29/mes. Enterprise para clínicas con múltiples médicos. Prueba 21 días sin tarjeta.',
  openGraph: {
    title: 'Precios — Sara Medical',
    description:
      'Automatiza tu consultorio con IA: agenda, recetas y marketing. Prueba 21 días gratis.',
    url: 'https://consultorio.site/pricing',
    siteName: 'Sara Medical',
  },
}

const ENTERPRISE_HOTMART = 'https://pay.hotmart.com/N104843955S?checkoutMode=2'

const FREE_FEATURES = [
  { label: '3 pacientes', included: true },
  { label: 'Fichas y recetas básicas', included: true },
  { label: 'Agenda de citas', included: true },
  { label: 'Pacientes ilimitados', included: false },
  { label: 'Sara IA (chat + WhatsApp)', included: false },
  { label: 'Marketing Suite (4 redes sociales)', included: false },
  { label: 'Autopilot: publicación automática', included: false },
  { label: 'Web médica profesional', included: false },
  { label: 'Soporte prioritario', included: false },
]

const PRO_FEATURES = [
  { label: 'Pacientes ilimitados', included: true },
  { label: 'Fichas, recetas, exámenes y certificados', included: true },
  { label: 'Agenda con recordatorios automáticos', included: true },
  { label: 'Sara IA (chat + WhatsApp Business 24/7)', included: true },
  { label: 'Marketing Suite: Instagram, Facebook, TikTok, LinkedIn', included: true },
  { label: 'Autopilot: publica mientras atiendes pacientes', included: true },
  { label: 'Web médica profesional incluida', included: true },
  { label: 'CIE-10 y ICD-11 integrado', included: true },
  { label: 'Portal del paciente incluido', included: true },
  { label: 'Soporte prioritario', included: true },
]

const ENTERPRISE_FEATURES = [
  { label: 'Todo el Plan Pro para cada médico', included: true },
  { label: 'Hasta 5 médicos incluidos', included: true },
  { label: '+$20/mes por médico adicional', included: true },
  { label: 'Panel centralizado multi-médico', included: true },
  { label: 'Asistentes ilimitadas por médico', included: true },
  { label: 'White-label (tu marca, tu dominio)', included: true },
  { label: 'Onboarding dedicado para tu equipo', included: true },
  { label: 'Soporte VIP — respuesta en menos de 2 horas', included: true },
  { label: 'Acceso anticipado a nuevas funcionalidades', included: true },
]

const FAQS = [
  {
    q: '¿Necesito tarjeta de crédito para el trial?',
    a: 'No. Los 21 días de prueba son completamente gratis, sin tarjeta. Solo te registras con tu correo.',
  },
  {
    q: '¿Cómo se activa el plan después de pagar?',
    a: 'Automáticamente. En menos de 1 minuto de completar el pago en Hotmart, tu cuenta queda en modo Pro completo.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí. Cancelas desde Hotmart y no se cobra el siguiente mes. Tu acceso continúa hasta el final del período ya pagado.',
  },
  {
    q: '¿Qué pasa con mis datos si no me suscribo?',
    a: 'Tu información está guardada de forma segura. Si te suscribes después, recuperas acceso inmediato a toda tu información.',
  },
  {
    q: '¿El plan Enterprise es para clínicas?',
    a: 'Sí. Enterprise está diseñado para clínicas con múltiples médicos y centros de salud. Incluye panel centralizado multi-médico, white-label y soporte VIP. Contáctanos para un plan a tu medida.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/">
            <SaraLogo size="sm" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-500 hover:text-primary transition-colors font-medium">
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
            🎁 21 días de prueba gratis · Sin tarjeta
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Un plan para cada etapa
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
              de tu práctica médica
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Desde el médico independiente que recién digitaliza su consulta hasta la clínica con múltiples especialistas. Sara crece contigo.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-14">

          {/* FREE */}
          <div className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col">
            <div className="mb-6">
              <span className="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full mb-3">Gratis</span>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Free</h2>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-extrabold text-gray-900">$0</span>
                <span className="text-gray-400 text-sm mb-1">/mes</span>
              </div>
              <p className="text-sm text-gray-400">Para explorar la plataforma.</p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  {f.included
                    ? <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                    : <X size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                  }
                  <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>{f.label}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block text-center py-3 px-6 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:border-primary hover:text-primary transition-colors text-sm"
            >
              Crear cuenta gratis
            </Link>
          </div>

          {/* PRO MENSUAL */}
          <div className="bg-white rounded-2xl border-2 border-primary p-7 flex flex-col shadow-lg shadow-primary/10 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow whitespace-nowrap">
              ⭐ Más popular
            </div>
            <div className="mb-6 mt-2">
              <div className="mb-3">
                <span className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  🚀 Precio de lanzamiento · Sube pronto
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Pro Mensual</h2>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-4xl font-extrabold text-gray-900">$29</span>
                <span className="text-gray-400 text-sm mb-1">/mes</span>
              </div>
              <p className="text-sm text-gray-400">Sin compromisos. Cancela cuando quieras.</p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{f.label}</span>
                </li>
              ))}
            </ul>
            <a
              href={`${HOTMART.monthly}&offDiscount=TRIAL21`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3.5 px-6 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors text-sm"
            >
              Empezar 21 días gratis →
            </a>
          </div>

          {/* ENTERPRISE */}
          <div
            className="relative rounded-2xl p-7 flex flex-col text-white shadow-2xl shadow-blue-900/20 ring-1 ring-white/10"
            style={{ background: 'linear-gradient(160deg, #1E3A8A 0%, #0F766E 100%)' }}
          >
            <div className="mb-6">
              <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                🏥 Para clínicas
              </span>
              <h2 className="text-xl font-bold mb-1">Enterprise</h2>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-4xl font-extrabold">$129</span>
                <span className="text-blue-200 text-sm mb-1">/mes</span>
              </div>
              <p className="text-blue-200 text-sm mb-1">hasta 5 médicos incluidos</p>
              <div className="inline-flex items-center gap-1 bg-white/15 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                +$20/mes por médico adicional
              </div>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {ENTERPRISE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-blue-100">
                  <Check size={16} className="flex-shrink-0 mt-0.5 text-teal-300" />
                  {f.label}
                </li>
              ))}
            </ul>
            <a
              href={ENTERPRISE_HOTMART}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3.5 px-6 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors text-sm"
            >
              Contratar Enterprise →
            </a>
            <a
              href="mailto:soporte@consultorio.site?subject=Plan%20Enterprise%20-%20Consulta"
              className="block text-center py-2 px-6 text-blue-300 hover:text-white transition-colors text-xs mt-2"
            >
              ¿Tienes preguntas? Escríbenos →
            </a>
          </div>
        </div>

        {/* Social proof */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-14 text-center">
          <p className="text-gray-400 text-sm mb-4 font-medium uppercase tracking-wider">Usado por médicos en Ecuador</p>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { stat: '+200', label: 'médicos activos' },
              { stat: '21 días', label: 'Trial gratis, sin tarjeta' },
              { stat: '< 1 min', label: 'Activación automática post-pago' },
              { stat: '4.9/5', label: 'valoración media' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-extrabold text-gray-900">{item.stat}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonio real (flag `testimonial` + contenido en DoctorTestimonial.tsx) */}
        <DoctorTestimonial />

        {/* FAQ */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Preguntas frecuentes</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
            {FAQS.map((item, i) => (
              <div key={i} className="p-6">
                <p className="font-semibold text-gray-900 mb-1">{item.q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA bottom */}
        <div
          className="rounded-2xl p-10 text-center text-white"
          style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #0F766E 100%)' }}
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Empieza hoy, gratis</h2>
          <p className="text-blue-200 mb-7 max-w-md mx-auto">
            21 días con acceso completo. Sin tarjeta. Sin compromiso. Si te convence, un clic y estás en Pro.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-all hover:-translate-y-0.5 shadow-xl text-base"
          >
            Crear cuenta gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="text-blue-300 text-xs mt-4">
            ¿Tienes preguntas? Escríbenos a{' '}
            <a href="mailto:soporte@consultorio.site" className="underline hover:text-white transition-colors">
              soporte@consultorio.site
            </a>
          </p>
        </div>

        {/* Footer nav */}
        <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-gray-400">
          <Link href="/" className="hover:text-primary transition-colors">← Inicio</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Términos</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacidad</Link>
          <Link href="/login" className="hover:text-primary transition-colors">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  )
}
