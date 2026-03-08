import type { Metadata } from 'next'
import Link from 'next/link'
import NavHeader from '@/components/landing/NavHeader'

export const metadata: Metadata = {
  title: 'Sara — Tu asistente médica con IA',
  description:
    'Gestiona tu consultorio, capta pacientes y haz crecer tu práctica médica con inteligencia artificial. Agenda inteligente, fichas médicas, recetas digitales y más.',
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #0F766E 60%, #1D4ED8 100%)' }}
    >
      {/* Decoración de fondo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20 grid lg:grid-cols-2 gap-16 items-center w-full">
        {/* Copy */}
        <div className="text-white">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-7">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            Asistente IA para médicos
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
            Sara, tu asistente{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-blue-200">
              médica con IA
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/75 leading-relaxed mb-10 max-w-lg">
            Gestiona tu consultorio, capta pacientes y haz crecer tu práctica médica con
            inteligencia artificial.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-7 py-4 rounded-xl hover:bg-blue-50 transition-all hover:-translate-y-0.5 shadow-xl text-base"
            >
              Comienza gratis
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/25 text-white font-semibold px-7 py-4 rounded-xl hover:bg-white/20 transition-all hover:-translate-y-0.5 text-base"
            >
              Ver demo
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center gap-6">
            <div className="flex -space-x-2">
              {['AM', 'JR', 'CP', 'MV'].map((initials) => (
                <div
                  key={initials}
                  className="w-9 h-9 rounded-full border-2 border-white/30 bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold"
                >
                  {initials}
                </div>
              ))}
            </div>
            <p className="text-white/70 text-sm">
              <strong className="text-white">+200 médicos</strong> ya usan Sara
            </p>
          </div>
        </div>

        {/* Mock UI — chat preview */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="relative w-full max-w-sm">
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-teal-400/30 rounded-3xl blur-2xl scale-110" />

            {/* Card principal */}
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
              {/* Header mock */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/15 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://useileqhvoxljyxpjgfb.supabase.co/storage/v1/object/public/avatars/gemini_sara_perfil.png"
                  alt="Sara"
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-md"
                />
                <div>
                  <p className="text-white font-semibold text-sm">Sara</p>
                  <p className="text-white/50 text-xs">Asistente IA · en línea</p>
                </div>
                <div className="ml-auto w-2 h-2 bg-accent rounded-full animate-pulse" />
              </div>

              {/* Mensajes */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-end">
                  <div className="bg-white/20 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                    Agéndame una cita con la paciente María López para mañana a las 10am
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[85%] shadow-sm">
                    <p>✅ Hecho. Cita agendada para <strong>mañana 10:00 AM</strong> con María López.</p>
                    <p className="text-gray-500 text-xs mt-1">¿Quieres que le envíe el recordatorio por WhatsApp?</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-white/20 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm">
                    Sí, y genera la receta de su última consulta
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm">
                    <p>💊 Receta generada y lista para enviar. <span className="text-primary font-medium">Ver PDF →</span></p>
                  </div>
                </div>
              </div>

              {/* Input mock */}
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
                <span className="text-white/40 text-sm flex-1">Escríbele a Sara...</span>
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Floating stats */}
            <div className="absolute -top-4 -right-6 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-sm">📅</div>
              <div>
                <p className="text-xs font-bold text-gray-900">8 citas hoy</p>
                <p className="text-xs text-gray-400">2 pendientes</p>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-primary text-sm">👥</div>
              <div>
                <p className="text-xs font-bold text-gray-900">243 pacientes</p>
                <p className="text-xs text-green-500">+3 esta semana</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Problems ──────────────────────────────────────────────────────────────────

const problems = [
  {
    emoji: '📉',
    title: 'Pierdes pacientes por mala gestión de agenda',
    desc: 'Llamadas perdidas, dobles citas y pacientes que no regresan porque el seguimiento es manual y caótico.',
    color: 'from-red-50 to-orange-50',
    border: 'border-red-100',
    badge: 'bg-red-100 text-red-600',
  },
  {
    emoji: '📱',
    title: 'No tienes tiempo para redes sociales',
    desc: 'Sabes que necesitas presencia digital para captar nuevos pacientes, pero entre consulta y consulta no hay espacio.',
    color: 'from-amber-50 to-yellow-50',
    border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-600',
  },
  {
    emoji: '📄',
    title: 'El papeleo te quita tiempo con tus pacientes',
    desc: 'Recetas, fichas, historiales — administrar todo esto a mano consume horas que deberías dedicar a curar.',
    color: 'from-orange-50 to-red-50',
    border: 'border-orange-100',
    badge: 'bg-orange-100 text-orange-600',
  },
]

function Problems() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block bg-red-50 text-red-600 font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            ¿Te suena familiar?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Los problemas que frenan tu{' '}
            <span className="text-primary">práctica médica</span>
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            La mayoría de médicos independientes los enfrentan todos los días. Sara los resuelve.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {problems.map((p) => (
            <div
              key={p.title}
              className={`bg-gradient-to-br ${p.color} border ${p.border} rounded-2xl p-7 hover:-translate-y-1 transition-transform duration-200`}
            >
              <div className={`w-12 h-12 rounded-2xl ${p.badge} flex items-center justify-center text-2xl mb-5`}>
                {p.emoji}
              </div>
              <h3 className="font-bold text-gray-900 text-lg leading-snug mb-3">{p.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: '📅',
    title: 'Agenda inteligente',
    desc: 'Tus pacientes agendan citas 24/7 sin que tú intervengas. Sara gestiona confirmaciones, cancelaciones y reprogramaciones automáticamente.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: '👥',
    title: 'Gestión de pacientes',
    desc: 'Fichas médicas completas, historial clínico, alergias, diagnósticos y evolución de cada paciente en un solo lugar.',
    color: 'bg-teal-50 text-teal-600',
  },
  {
    icon: '💊',
    title: 'Recetas digitales',
    desc: 'Genera y envía recetas profesionales en segundos. Sara recuerda medicamentos frecuentes y los formatea correctamente.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: '📱',
    title: 'Contenido para RRSS',
    desc: 'Sara redacta posts educativos e imágenes con IA para Instagram, Facebook y TikTok — sin que tú escribas una sola línea.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: '🔔',
    title: 'Recordatorios automáticos',
    desc: 'Nunca olvides un seguimiento. Sara manda recordatorios de citas, controles y medicamentos a ti y a tus pacientes.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: '⭐',
    title: 'Calificación del servicio',
    desc: 'Recopila feedback automático de tus pacientes tras cada consulta. Construye reputación y mejora tu práctica.',
    color: 'bg-yellow-50 text-yellow-600',
  },
]

function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block bg-primary/10 text-primary font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Características
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Todo lo que necesitas para{' '}
            <span className="text-primary">hacer crecer tu práctica</span>
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            Sara no es solo un chatbot. Es tu asistente completa de gestión médica.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group border border-gray-100 rounded-2xl p-7 hover:border-primary/20 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 bg-white"
            >
              <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-200`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Knowledge Base ────────────────────────────────────────────────────────────

const knowledgeUseCases = [
  {
    icon: '📄',
    question: '¿Cuál es el protocolo de manejo para hipertensión resistente?',
    answer: 'Sara busca en tus documentos y te da la respuesta exacta con la fuente y el número de página.',
    tag: 'Protocolo clínico',
    tagColor: 'bg-blue-50 text-blue-600',
  },
  {
    icon: '📊',
    question: '¿Qué dice mi último estudio sobre interacciones medicamentosas?',
    answer: 'Sara analiza el archivo, extrae los hallazgos clave y te los resume en segundos.',
    tag: 'Investigación',
    tagColor: 'bg-teal-50 text-teal-600',
  },
  {
    icon: '📚',
    question: '¿Cuál es la dosis pediátrica de amoxicilina según el formulario que subí?',
    answer: 'Sara encuentra la información en segundos y la presenta con el contexto correcto.',
    tag: 'Formulario médico',
    tagColor: 'bg-violet-50 text-violet-600',
  },
]

const supportedFormats = [
  { icon: '📕', label: 'PDF' },
  { icon: '📝', label: 'Word' },
  { icon: '📊', label: 'Excel' },
  { icon: '📋', label: 'PowerPoint' },
  { icon: '📄', label: 'TXT' },
  { icon: '🖼️', label: 'Imágenes' },
]

function KnowledgeBase() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-secondary/10 text-secondary font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Base de conocimiento
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 max-w-2xl mx-auto leading-snug">
            Sara estudia tus documentos y te{' '}
            <span className="text-secondary">responde como experta</span>
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Sube tus guías clínicas, protocolos, investigaciones y libros médicos. Sara los lee,
            los entiende y los usa para responderte con precisión cuando más lo necesitas.
          </p>
        </div>

        {/* Casos de uso */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {knowledgeUseCases.map((c) => (
            <div
              key={c.question}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
            >
              {/* Tag */}
              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 ${c.tagColor}`}>
                {c.tag}
              </span>

              {/* Pregunta del médico */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                  🧑‍⚕️
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-gray-700 text-sm font-medium leading-snug">{c.question}</p>
                </div>
              </div>

              {/* Respuesta de Sara */}
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #0D9488)' }}
                >
                  S
                </div>
                <div className="bg-secondary/8 border border-secondary/15 rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
                  <p className="text-gray-600 text-sm leading-snug">{c.answer}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs text-secondary font-medium">{c.icon} Documento encontrado</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Formatos soportados + quote */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Formatos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <p className="font-bold text-gray-900 mb-1">Formatos soportados</p>
            <p className="text-gray-500 text-sm mb-5">
              Sube cualquier documento de tu práctica médica.
            </p>
            <div className="flex flex-wrap gap-3">
              {supportedFormats.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 hover:border-secondary/30 hover:bg-secondary/5 transition-colors"
                >
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-sm font-semibold text-gray-700">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quote */}
          <div
            className="rounded-2xl p-7 flex flex-col justify-between"
            style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 50%, #0891B2 100%)' }}
          >
            <div className="text-5xl mb-4 text-white/30 font-serif leading-none">&ldquo;</div>
            <blockquote className="text-white text-xl font-semibold leading-snug mb-6">
              Como tener una residente que leyó todos tus libros y los recuerda perfectamente.
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                🧠
              </div>
              <div>
                <p className="text-white font-medium text-sm">Sara IA</p>
                <p className="text-teal-200 text-xs">Memoria médica ilimitada</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ──────────────────────────────────────────────────────────────

const steps = [
  {
    num: '01',
    icon: '🧑‍⚕️',
    title: 'Te registras y configuras tu perfil médico',
    desc: 'En menos de 5 minutos tienes tu cuenta lista. Ingresa tu especialidad, horarios y preferencias. Sara aprende cómo trabajas.',
  },
  {
    num: '02',
    icon: '🌐',
    title: 'Sara crea tu página personalizada con subdominio',
    desc: 'Obtienes una landing profesional en tu propio subdominio (ej: drmedrano.saramedica.com) lista para compartir con tus pacientes.',
  },
  {
    num: '03',
    icon: '🎯',
    title: 'Tus pacientes agendan, tú te enfocas en curar',
    desc: 'Sara maneja la agenda, los recordatorios, las recetas y las redes sociales. Tú haces lo que mejor sabes hacer: medicina.',
  },
]

function HowItWorks() {
  return (
    <section id="how" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block bg-secondary/10 text-secondary font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Cómo funciona
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Empieza en <span className="text-secondary">minutos</span>
          </h2>
          <p className="mt-4 text-gray-500 max-w-lg mx-auto">
            Sin instalaciones, sin configuraciones complejas, sin necesitar un equipo técnico.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 relative">
          {/* Línea conectora (desktop) */}
          <div className="absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 hidden sm:block pointer-events-none" />

          {steps.map((step) => (
            <div key={step.num} className="flex flex-col items-center text-center relative">
              {/* Número + ícono */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-primary/15 shadow-md flex items-center justify-center text-3xl">
                  {step.icon}
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-md">
                  {step.num.replace('0', '')}
                </div>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-3 leading-snug">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ───────────────────────────────────────────────────────────────────

const plans = [
  {
    name: 'Starter',
    price: '$29',
    period: '/mes',
    desc: 'Perfecto para iniciar y ordenar tu consultorio.',
    highlight: false,
    badge: null,
    features: [
      'Hasta 50 pacientes activos',
      'Agenda inteligente',
      'Fichas médicas básicas',
      'Generación de recetas',
      'Subdominio personalizado',
      'Soporte por email',
    ],
    cta: 'Empezar con Starter',
    ctaStyle: 'border-2 border-gray-200 text-gray-700 hover:border-primary hover:text-primary',
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/mes',
    desc: 'Para médicos que quieren crecer con IA completa.',
    highlight: true,
    badge: 'Más popular',
    features: [
      'Pacientes ilimitados',
      'Todo lo del plan Starter',
      'Contenido para RRSS con IA',
      'Imágenes generadas por IA',
      'Recordatorios automáticos',
      'Calificaciones de servicio',
      'Soporte prioritario',
    ],
    cta: 'Empezar con Pro',
    ctaStyle: 'bg-primary text-white hover:bg-primary-dark',
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/mes',
    desc: 'Para clínicas y grupos médicos con múltiples sedes.',
    highlight: false,
    badge: null,
    features: [
      'Todo lo del plan Pro',
      'Multi-sede y multi-médico',
      'API de integración',
      'White-label (tu marca)',
      'Onboarding dedicado',
      'SLA garantizado',
    ],
    cta: 'Contactar ventas',
    ctaStyle: 'border-2 border-gray-200 text-gray-700 hover:border-primary hover:text-primary',
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block bg-primary/10 text-primary font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Planes y precios
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Sin sorpresas.{' '}
            <span className="text-primary">Sin letras pequeñas.</span>
          </h2>
          <p className="mt-4 text-gray-500 max-w-lg mx-auto">
            Prueba gratis 14 días. Cancela cuando quieras. Sin tarjeta de crédito para comenzar.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-8 transition-shadow duration-200 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-primary to-blue-700 text-white shadow-2xl shadow-primary/30 scale-[1.03]'
                  : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <p className={`font-bold text-lg mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </p>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm mb-1 ${plan.highlight ? 'text-blue-200' : 'text-gray-400'}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-sm ${plan.highlight ? 'text-blue-200' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm">
                    <span className={`flex-shrink-0 mt-0.5 text-base ${plan.highlight ? 'text-teal-300' : 'text-secondary'}`}>
                      ✓
                    </span>
                    <span className={plan.highlight ? 'text-blue-100' : 'text-gray-600'}>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`w-full text-center font-semibold px-6 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 text-sm ${plan.ctaStyle} ${
                  plan.highlight ? '' : 'block'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-sm mt-10">
          ¿Tienes preguntas?{' '}
          <a href="mailto:hola@saramedica.com" className="text-primary hover:underline">
            Escríbenos
          </a>{' '}
          y te respondemos en menos de 24 horas.
        </p>
      </div>
    </section>
  )
}

// ─── CTA Final ──────────────────────────────────────────────────────────────────

function CTAFinal() {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #0F766E 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-7">
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          Únete hoy
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
          Únete a los médicos que ya
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-blue-200">
            usan Sara
          </span>
        </h2>

        <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          14 días gratis, sin tarjeta de crédito. Configura tu perfil en minutos y empieza a ver
          resultados desde el primer día.
        </p>

        <Link
          href="/register"
          className="inline-flex items-center gap-3 bg-white text-primary font-bold text-lg px-10 py-5 rounded-2xl hover:bg-blue-50 transition-all hover:-translate-y-1 shadow-2xl"
        >
          Registrarme gratis
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        <p className="text-white/40 text-sm mt-5">
          Sin tarjeta de crédito · Cancela cuando quieras · Soporte incluido
        </p>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-white/5 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: 'linear-gradient(135deg, #2563EB, #0D9488)' }}
          >
            S
          </div>
          <span className="text-white font-semibold">Sara</span>
          <span className="text-white/30 text-sm">© 2025</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-sm text-white/40">
          <a href="/terms" className="hover:text-white/70 transition-colors">Términos</a>
          <a href="/privacy" className="hover:text-white/70 transition-colors">Privacidad</a>
          <a href="mailto:hola@saramedica.com" className="hover:text-white/70 transition-colors">Contacto</a>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <NavHeader />
      <main>
        <Hero />
        <Problems />
        <Features />
        <KnowledgeBase />
        <HowItWorks />
        <Pricing />
        <CTAFinal />
      </main>
      <Footer />
    </>
  )
}
