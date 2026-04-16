import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import NavHeader from '@/components/landing/NavHeader'
import BackToTop from '@/components/landing/BackToTop'
import SaraChatWidget from '@/components/landing/SaraChatWidget'
import AuthErrorRedirect from '@/components/AuthErrorRedirect'
import DemoSection from '@/components/landing/DemoSection'

export const metadata: Metadata = {
  title: 'Sara — Publica en redes mientras atiendes pacientes',
  description:
    'Sara publica tu contenido en Instagram, Facebook, TikTok y LinkedIn con IA mientras tú atiendes pacientes. Agenda inteligente, fichas médicas y recetas digitales incluidas.',
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
            Sara publica en redes{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-blue-200">
              mientras atiendes pacientes
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/75 leading-relaxed mb-10 max-w-lg">
            Marketing con IA para Instagram, Facebook, TikTok y LinkedIn. Más agenda inteligente, fichas médicas y recetas digitales — todo en una sola plataforma.
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
    icon: '🧠',
    title: 'IA 360° Clínica',
    desc: 'Antes de cada consulta, Sara analiza el historial completo del paciente y te entrega un resumen inteligente con alertas, tendencias y recomendaciones.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: '🩺',
    title: 'Controles médicos especiales',
    desc: 'Calendario PAI Ecuador, gráficas de crecimiento infantil OMS y seguimiento de embarazo con edad gestacional y FPP calculados automáticamente.',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    icon: '🎂',
    title: 'Recordatorio de cumpleaños',
    desc: 'Sara detecta el cumpleaños de tus pacientes y te avisa por WhatsApp para que nunca se te pase — un gesto que fideliza.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: '📱',
    title: 'Marketing Suite con IA',
    desc: 'Genera posts, carruseles, reels y guiones para Instagram, Facebook, TikTok y LinkedIn. Elige el enfoque (atraer pacientes, ganar credibilidad, viralizar) y la IA escribe el copy y los hashtags.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: '🗓️',
    title: 'Planificador de contenido',
    desc: 'Define frecuencia diaria, semanal o mensual, fecha de inicio y fin. Sara genera un calendario completo de publicaciones con imágenes IA incluidas — solo aprueba y publica.',
    color: 'bg-fuchsia-50 text-fuchsia-600',
  },
  {
    icon: '💼',
    title: 'LinkedIn médico inteligente',
    desc: 'Posts con IA basados en tu especialidad médica. Sara genera contenido optimizado para LinkedIn que te posiciona como referente y atrae pacientes y colegas a tu red.',
    color: 'bg-sky-50 text-sky-700',
  },
  {
    icon: '🔔',
    title: 'Recordatorios por WhatsApp',
    desc: 'Recordatorios automáticos 24h y 2h antes de cada cita. También puedes enviarlos manualmente con un clic directamente desde la agenda.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: '⭐',
    title: 'Encuestas de satisfacción',
    desc: 'Sara envía automáticamente una encuesta tras cada consulta. Recopila calificaciones y comentarios para mejorar tu práctica y construir reputación.',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    icon: '👤',
    title: 'Multi-usuario y Recepción',
    desc: 'Invita a tu asistente con su propio acceso. Una asistente puede gestionar múltiples consultorios desde la misma cuenta. Recepción virtual con módulo dedicado para administrar la clínica.',
    color: 'bg-cyan-50 text-cyan-600',
  },
  {
    icon: '🌐',
    title: 'Web médica profesional',
    desc: 'Tu página personalizada lista para compartir: perfil, especialidad, servicios, horarios y agenda en línea. Incluye chat con Sara IA para atender preguntas de pacientes potenciales.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: '📋',
    title: 'Portal del Paciente',
    desc: 'Cada paciente tiene su propio dashboard donde puede ver su historial de atenciones, citas, recetas, órdenes de examen y certificados — todo disponible desde su celular, en cualquier momento.',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: '📊',
    title: 'Análisis e informes',
    desc: 'Dashboard con métricas clave: citas por período, tasa de retención, ingresos, campañas de marketing y rendimiento del consultorio.',
    color: 'bg-sky-50 text-sky-600',
  },
]

const featuresTop = features.slice(0, 6)
const featuresRest = features.slice(6)

function FeatureCard({ f }: { f: typeof features[0] }) {
  return (
    <div className="group border border-gray-100 rounded-2xl p-7 hover:border-primary/20 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 bg-white">
      <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-200`}>
        {f.icon}
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
    </div>
  )
}

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
            Sara no es solo un chatbot. Es la plataforma completa de gestión médica, marketing y crecimiento para tu práctica.
          </p>
        </div>

        {/* Top 6 features */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {featuresTop.map((f) => <FeatureCard key={f.title} f={f} />)}
        </div>

        {/* Acordeón con el resto */}
        <details className="group">
          <summary className="flex items-center justify-center gap-2 cursor-pointer list-none py-3 text-primary font-semibold text-sm select-none">
            <span className="group-open:hidden">Ver todas las funcionalidades ({featuresRest.length} más) ↓</span>
            <span className="hidden group-open:inline">Ocultar ↑</span>
          </summary>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {featuresRest.map((f) => <FeatureCard key={f.title} f={f} />)}
          </div>
        </details>
      </div>
    </section>
  )
}

// ─── Marketing Suite ───────────────────────────────────────────────────────────

function MarketingSuite() {
  return (
    <section className="py-24 bg-white" id="marketing">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-pink-50 text-pink-600 font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Marketing Suite IA
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 max-w-2xl mx-auto leading-snug">
            Tu presencia digital en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
              piloto automático
            </span>
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto leading-relaxed">
            Sin contratar community manager. Sin pasar horas frente a la pantalla. Sara genera, planifica y gestiona tu contenido médico en todas las redes.
          </p>
        </div>

        {/* Redes soportadas */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { label: 'Instagram', color: 'bg-gradient-to-r from-pink-500 to-orange-400', icon: '📸' },
            { label: 'Facebook', color: 'bg-blue-600', icon: '👍' },
            { label: 'TikTok', color: 'bg-gray-900', icon: '🎵' },
            { label: 'LinkedIn', color: 'bg-blue-700', icon: '💼' },
          ].map(n => (
            <div key={n.label} className={`flex items-center gap-2 ${n.color} text-white text-sm font-semibold px-5 py-2 rounded-full shadow-sm`}>
              <span>{n.icon}</span>
              {n.label}
            </div>
          ))}
        </div>

        {/* 3 pilares */}
        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          {/* Pilar 1: Generador */}
          <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-fuchsia-50 p-7 hover:-translate-y-1 transition-transform duration-200">
            <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-2xl mb-5">✍️</div>
            <h3 className="font-bold text-gray-900 text-lg mb-3">Generador de posts con IA</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Escoge el formato — post, carrusel, reel, story o guión de video — y el enfoque: atraer pacientes, ganar credibilidad, viralizar contenido o fidelizar. La IA genera el copy, los hashtags y una imagen de referencia lista para publicar.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Post', 'Carrusel', 'Reel', 'Story', 'Video', 'Guión'].map(f => (
                <span key={f} className="text-xs bg-white border border-pink-200 text-pink-700 px-2.5 py-1 rounded-full font-medium">{f}</span>
              ))}
            </div>
          </div>

          {/* Pilar 2: Planificador */}
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-7 hover:-translate-y-1 transition-transform duration-200">
            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-2xl mb-5">🗓️</div>
            <h3 className="font-bold text-gray-900 text-lg mb-3">Planificador de contenido</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Define la frecuencia (diaria, semanal, quincenal o mensual), número de posts por período y fecha de fin. Sara genera un calendario completo con contenido para cada red. Revisa, aprueba todo de un clic, o ajusta post a post.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Multi-plataforma'].map(f => (
                <span key={f} className="text-xs bg-white border border-violet-200 text-violet-700 px-2.5 py-1 rounded-full font-medium">{f}</span>
              ))}
            </div>
          </div>

          {/* Pilar 3: Redes Sociales */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 p-7 hover:-translate-y-1 transition-transform duration-200">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mb-5">📱</div>
            <h3 className="font-bold text-gray-900 text-lg mb-3">Redes sociales con contenido de especialidad</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Sara genera posts para LinkedIn, Instagram, Facebook y TikTok basados en temas relevantes de tu especialidad, seleccionados por IA. Conviértete en referente de salud digital y amplía tu red de pacientes y referidos.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Multi-red', 'Posicionamiento', 'Networking', 'Referidos'].map(f => (
                <span key={f} className="text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full font-medium">{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Biblioteca */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">📚</div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-lg mb-1">Biblioteca de publicaciones</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Todos tus posts generados en un solo lugar — borradores y aprobados. Selecciona múltiples publicaciones a la vez para aprobarlas o eliminarlas en bloque. Tu historial de contenido siempre organizado y disponible.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {['Selección múltiple', 'Aprobar en bloque', 'Borrador / Publicado'].map(t => (
              <span key={t} className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full font-medium">{t}</span>
            ))}
          </div>
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
    desc: 'Obtienes una landing profesional lista para compartir con tus pacientes (ej: consultorio.site/juan-perez-internista).',
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
    name: 'Pro Mensual',
    price: '$29',
    priceOld: '$89',
    period: '/mes',
    desc: 'Todo el poder de Sara Medical para tu consultorio, sin compromisos.',
    highlight: false,
    badge: '🎉 70% OFF — Precio de Lanzamiento',
    badgeBg: 'bg-green-500',
    checkoutUrl: 'https://pay.hotmart.com/X104843203F?checkoutMode=2',
    priceNormalText: 'Precio normal: $89/mes',
    features: [
      { icon: '👥', text: 'Pacientes, citas y fichas clínicas ilimitadas.' },
      { icon: '🤖', text: 'Sara IA en WhatsApp Business — atiende 24/7.' },
      { icon: '📱', text: 'Marketing Suite: Instagram, Facebook, TikTok y LinkedIn.' },
      { icon: '🧠', text: 'IA 360°: análisis clínico antes de cada consulta.' },
      { icon: '🌐', text: 'Web médica profesional incluida.' },
      { icon: '📋', text: 'Portal del paciente en su celular.' },
    ],
    cta: 'Elegir Plan Mensual',
    ctaStyle: 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
  },
  {
    name: 'Pro Anual',
    price: '$249',
    priceOld: '$1,068',
    priceMonthly: '$20.75',
    period: '/año',
    savings: 'Ahorras $99 al año vs precio normal',
    desc: 'La forma más inteligente de crecer tu consultorio.',
    highlight: true,
    badge: '⭐ Mejor oferta',
    badgeBg: 'bg-accent',
    checkoutUrl: 'https://pay.hotmart.com/H104994063B?checkoutMode=2',
    features: [
      { icon: '✔', text: 'Todo lo del Plan Pro Mensual incluido.' },
      { icon: '💰', text: 'Solo $20.75/mes — ahorras $99 al año.' },
      { icon: '🎁', text: 'Onboarding personalizado 1:1 incluido.' },
      { icon: '🚀', text: 'Acceso anticipado a nuevas funcionalidades IA.' },
      { icon: '⚡', text: 'Soporte VIP con respuesta prioritaria todo el año.' },
      { icon: '🎯', text: 'Canal directo de feedback que impacta el roadmap del producto.' },
    ],
    cta: 'Elegir Plan Anual',
    ctaStyle: 'bg-white text-blue-700 font-bold hover:bg-blue-50',
  },
  {
    name: 'Enterprise',
    price: '$129',
    priceOld: '$199',
    period: '/mes',
    priceSubtitle: 'hasta 5 médicos',
    priceNote: '+$20/mes por médico adicional',
    desc: 'La solución completa para clínicas y grupos médicos.',
    highlight: false,
    badge: null,
    badgeBg: '',
    checkoutUrl: 'https://pay.hotmart.com/N104843955S?checkoutMode=2',
    features: [
      { icon: '✔', text: 'Todo el Plan PRO para cada médico incluido.' },
      { icon: '🏥', text: 'Hasta 5 médicos — sedes adicionales bajo cotización.' },
      { icon: '👥', text: 'Asistentes ilimitadas por médico.' },
      { icon: '🎨', text: 'White Label: tu marca, tu dominio personalizado.' },
      { icon: '🎁', text: 'Onboarding asistido para cada médico del equipo.' },
      { icon: '⚡', text: 'Soporte VIP — respuesta en menos de 2 horas.' },
    ],
    cta: 'Elegir Plan Enterprise',
    ctaStyle: 'border-2 border-gray-200 text-gray-700 hover:border-primary hover:text-primary',
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      {/* Hotmart Checkout Widget */}
      <link rel="stylesheet" href="https://static.hotmart.com/css/hotmart-fb.min.css" />
      <Script src="https://static.hotmart.com/checkout/widget.min.js" strategy="lazyOnload" />

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
            Acceso inmediato al suscribirte. Cancela cuando quieras.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-8 transition-all duration-200 ${
                plan.highlight
                  ? 'text-white shadow-2xl shadow-primary/40 scale-[1.04] ring-2 ring-white/20'
                  : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
              }`}
              style={plan.highlight ? { background: 'linear-gradient(160deg, #1E40AF 0%, #0D9488 100%)' } : {}}
            >
              {plan.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${plan.badgeBg} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap`}>
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <div className="mb-2">
                  <span className="inline-block bg-green-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    🎉 70% OFF — Precio de Lanzamiento
                  </span>
                </div>
                <p className={`font-bold text-lg mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </p>

                {'priceOld' in plan && plan.priceOld && (
                  <span className={`text-base font-medium line-through ${plan.highlight ? 'text-blue-300' : 'text-gray-400'}`}>
                    {plan.priceOld as string}
                  </span>
                )}
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm mb-1 ${plan.highlight ? 'text-blue-200' : 'text-gray-400'}`}>
                    {plan.period}
                    {'priceSubtitle' in plan && plan.priceSubtitle && (
                      <span className="ml-1 text-xs">({plan.priceSubtitle as string})</span>
                    )}
                  </span>
                </div>

                {/* Pro Anual: mostrar equivalente mensual + ahorro */}
                {'priceMonthly' in plan && plan.priceMonthly && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      ≈ {plan.priceMonthly as string}/mes · 💰 {(plan as { savings?: string }).savings}
                    </span>
                  </div>
                )}

                {'priceNormalText' in plan && plan.priceNormalText && (
                  <p className={`text-xs mt-0.5 mb-1 ${plan.highlight ? 'text-blue-300' : 'text-gray-400'}`}>
                    {plan.priceNormalText as string}
                  </p>
                )}

                {'priceNote' in plan && plan.priceNote && (
                  <div className="mt-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                      </svg>
                      {plan.priceNote as string}
                    </span>
                  </div>
                )}

                <p className={`text-sm ${plan.highlight ? 'text-blue-100' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat.text} className="flex items-start gap-2.5 text-sm">
                    <span className={`flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-teal-300' : 'text-secondary'}`}>
                      {feat.icon}
                    </span>
                    <span className={plan.highlight ? 'text-blue-100' : 'text-gray-600'}>{feat.text}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.checkoutUrl}
                className={`hotmart-fb hotmart__button-checkout w-full text-center font-semibold px-6 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 text-sm block ${plan.ctaStyle}`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-sm mt-10">
          ¿Tienes preguntas?{' '}
          <a href="mailto:soporte@consultorio.site" className="text-primary hover:underline">
            Escríbenos
          </a>{' '}
          y te respondemos en menos de 24 horas.
        </p>
      </div>
    </section>
  )
}

// ─── Testimonials ──────────────────────────────────────────────────────────────

const testimonials = [
  {
    quote: 'Antes tardaba 3 horas a la semana en redes sociales. Con Sara, lo tengo listo en 10 minutos y los posts se publican solos.',
    name: 'Dra. Ana Morales',
    title: 'Médico General · Quito',
    initials: 'AM',
    gradient: 'from-blue-400 to-teal-400',
  },
  {
    quote: 'Lo que más me sorprendió fue el análisis IA 360° antes de cada consulta. Llego preparado con el historial completo del paciente en segundos.',
    name: 'Dr. Juan Riofrio',
    title: 'Cirujano · Guayaquil',
    initials: 'JR',
    gradient: 'from-violet-400 to-blue-500',
  },
  {
    quote: 'Mis pacientes me preguntan cómo mantengo tan activo mi Instagram. No les digo que Sara lo hace sola.',
    name: 'Dra. Carolina Paz',
    title: 'Dermatóloga · Cuenca',
    initials: 'CP',
    gradient: 'from-pink-400 to-orange-400',
  },
]

function Testimonials() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block bg-green-50 text-green-700 font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Lo dicen los médicos
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Médicos que ya{' '}
            <span className="text-primary">usan Sara</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 flex flex-col hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              {/* Stars */}
              <div className="flex gap-0.5 mb-5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-700 text-sm leading-relaxed flex-1 mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof bar */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-center">
          <div>
            <p className="text-2xl font-extrabold text-gray-900">+200</p>
            <p className="text-xs text-gray-400 mt-0.5">médicos activos</p>
          </div>
          <div className="w-px h-8 bg-gray-200 hidden sm:block" />
          <div>
            <p className="text-2xl font-extrabold text-gray-900">4.9/5</p>
            <p className="text-xs text-gray-400 mt-0.5">valoración media</p>
          </div>
          <div className="w-px h-8 bg-gray-200 hidden sm:block" />
          <div>
            <p className="text-2xl font-extrabold text-gray-900">21 días</p>
            <p className="text-xs text-gray-400 mt-0.5">gratis sin tarjeta</p>
          </div>
          <div className="w-px h-8 bg-gray-200 hidden sm:block" />
          <div>
            <p className="text-2xl font-extrabold text-gray-900">&lt; 1 min</p>
            <p className="text-xs text-gray-400 mt-0.5">activación post-pago</p>
          </div>
        </div>
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
          21 días gratis, sin tarjeta de crédito. Configura tu perfil en minutos y empieza a ver
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
  const year = new Date().getFullYear()
  return (
    <footer className="bg-gray-950 border-t border-white/5">
      {/* Main footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #2563EB, #0D9488)' }}
            >
              S
            </div>
            <span className="text-white font-bold text-lg">Sara</span>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">
            La plataforma médica con IA para profesionales de la salud.
          </p>
          {/* Social links */}
          <div className="flex items-center gap-3 mt-5">
            <a
              href="https://instagram.com/consultorio.site"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608C4.516 2.497 5.783 2.226 7.15 2.163 8.416 2.105 8.796 2.163 12 2.163zm0-2.163c-3.259 0-3.667.014-4.947.072-1.613.073-3.046.44-4.18 1.573C1.74 2.78 1.372 4.212 1.3 5.825.014 7.105 0 7.513 0 12c0 4.487.014 4.895.072 6.175.073 1.613.44 3.046 1.573 4.18 1.134 1.133 2.567 1.5 4.18 1.573C7.105 23.986 7.513 24 12 24c4.487 0 4.895-.014 6.175-.072 1.613-.073 3.046-.44 4.18-1.573 1.133-1.134 1.5-2.567 1.573-4.18.058-1.28.072-1.688.072-6.175 0-4.487-.014-4.895-.072-6.175-.073-1.613-.44-3.046-1.573-4.18C21.046.512 19.613.145 18 .072 16.72.014 16.312 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
            </a>
            <a
              href="https://linkedin.com/company/consultorio-site"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Producto */}
        <div>
          <h4 className="text-white/70 font-semibold text-sm mb-4 uppercase tracking-wider">Producto</h4>
          <ul className="space-y-3 text-sm text-white/40">
            <li><a href="#features" className="hover:text-white/70 transition-colors">Funcionalidades</a></li>
            <li><a href="#pricing" className="hover:text-white/70 transition-colors">Precios</a></li>
            <li><a href="#how" className="hover:text-white/70 transition-colors">¿Cómo funciona?</a></li>
            <li><a href="/register" className="hover:text-white/70 transition-colors">Crear cuenta</a></li>
            <li><a href="/login" className="hover:text-white/70 transition-colors">Iniciar sesión</a></li>
          </ul>
        </div>

        {/* Soporte */}
        <div>
          <h4 className="text-white/70 font-semibold text-sm mb-4 uppercase tracking-wider">Soporte</h4>
          <ul className="space-y-3 text-sm text-white/40">
            <li>
              <a href="mailto:soporte@consultorio.site" className="hover:text-white/70 transition-colors">
                soporte@consultorio.site
              </a>
            </li>
            <li>
              <a href="https://wa.me/593996691586" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">
                WhatsApp
              </a>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-white/70 font-semibold text-sm mb-4 uppercase tracking-wider">Legal</h4>
          <ul className="space-y-3 text-sm text-white/40">
            <li><a href="/terms" className="hover:text-white/70 transition-colors">Términos de uso</a></li>
            <li><a href="/privacy" className="hover:text-white/70 transition-colors">Política de privacidad</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/25">
          <span>© {year} Sara Medical. Todos los derechos reservados.</span>
          <span className="flex items-center gap-1.5">
            Hecho con
            <svg className="w-3.5 h-3.5 text-red-500 fill-red-500" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            en Ecuador 🇪🇨 por{' '}
            <a
              href="https://www.instagram.com/nexus.593"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              Nexus Software Solution
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <AuthErrorRedirect />
      <NavHeader />
      <main>
        <Hero />
        <Problems />
        <Features />
        <MarketingSuite />
        <Testimonials />
        <KnowledgeBase />
        <HowItWorks />
        <Pricing />
        <DemoSection />
        <CTAFinal />
      </main>
      <Footer />
      <SaraChatWidget />
      <BackToTop />
    </>
  )
}
