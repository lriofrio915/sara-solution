/**
 * Funnel de onboarding de médicos por WhatsApp — máquina de estados pura.
 *
 * Un médico prospecto escribe al número Nexus → Sara lo guía en 3 pasos
 * (nombre → especialidad → email) → se le envía un link de registro
 * pre-llenado con 21 días de trial.
 *
 * Deliberadamente determinista (sin LLM): un funnel de signup necesita
 * respuestas predecibles, cero costo por mensaje y ser testeable. La persona
 * ya mostró intención al escribir; el trabajo es no perderla, no conversar.
 *
 * Módulo puro: sin I/O, sin Prisma, sin fetch. El endpoint
 * /api/onboarding/whatsapp persiste el estado y envía las respuestas.
 */

export type OnboardingStep = 'ASK_NAME' | 'ASK_SPECIALTY' | 'ASK_EMAIL' | 'DONE'

export interface OnboardingState {
  step: OnboardingStep
  name?: string
  specialty?: string
  email?: string
}

export interface StepResult {
  state: OnboardingState
  reply: string
  /** true exactamente en la transición a DONE (dispara notificación al admin) */
  justCompleted: boolean
  /** true si el prospecto pidió hablar con un humano (dispara notificación al admin) */
  humanRequested: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const RESET_WORDS = ['reiniciar', 'reset', 'empezar de nuevo', 'comenzar de nuevo']
const HELP_WORDS = ['ayuda', 'humano', 'asesor', 'hablar con alguien', 'persona']

/** Primer nombre para saludos ("María Fernanda Pérez" → "María"). */
function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]
}

export function buildRegisterUrl(appUrl: string, state: OnboardingState, phone: string): string {
  const base = appUrl.replace(/\/$/, '')
  const parts = (state.name ?? '').trim().split(/\s+/)
  const params = new URLSearchParams()
  if (parts[0]) params.set('firstName', parts[0])
  if (parts.length > 1) params.set('lastName', parts.slice(1).join(' '))
  if (state.specialty) params.set('specialty', state.specialty)
  if (state.email) params.set('email', state.email)
  if (phone) params.set('whatsapp', `+${phone}`)
  params.set('utm_source', 'whatsapp')
  params.set('utm_campaign', 'wa-onboarding')
  return `${base}/register?${params.toString()}`
}

export function greeting(pushName?: string | null): StepResult {
  const hola = pushName ? `¡Hola, ${pushName}! 👋` : '¡Hola! 👋'
  return {
    state: { step: 'ASK_NAME' },
    reply:
      `${hola} Soy *Sara*, la asistente de *Sara Medical* 🩺\n\n` +
      `Ayudo a médicos a automatizar su consultorio: agenda, recetas digitales firmadas, ` +
      `y marketing en redes sociales que se publica solo *mientras atiendes pacientes*.\n\n` +
      `Te creo una cuenta con *21 días de prueba gratis, sin tarjeta*. ` +
      `Solo necesito 3 datos. 😊\n\n` +
      `Primero: ¿cuál es tu *nombre completo*?`,
    justCompleted: false,
    humanRequested: false,
  }
}

function doneReply(state: OnboardingState, registerUrl: string): string {
  return (
    `¡Listo, ${firstName(state.name ?? '')}! 🎉 Ya dejé tu cuenta pre-armada.\n\n` +
    `Complétala aquí (toma 2 minutos, tus datos ya van llenos):\n${registerUrl}\n\n` +
    `Al entrar activas *21 días de acceso PRO completo, gratis y sin tarjeta*. 💙\n\n` +
    `Cualquier duda escríbeme por aquí, o responde *AYUDA* para que te contacte una persona del equipo.`
  )
}

/**
 * Avanza la máquina de estados con el mensaje entrante del prospecto.
 * `appUrl` es la base pública (NEXT_PUBLIC_APP_URL); `phone` son solo dígitos.
 */
export function advance(
  state: OnboardingState,
  message: string,
  phone: string,
  appUrl: string,
): StepResult {
  const text = message.trim()
  const lower = text.toLowerCase()

  if (RESET_WORDS.some(w => lower.includes(w))) {
    const g = greeting(null)
    return { ...g, reply: `De acuerdo, empecemos de nuevo. 😊\n\n¿Cuál es tu *nombre completo*?` }
  }

  const humanRequested = HELP_WORDS.some(w => lower === w || lower.includes(w))

  switch (state.step) {
    case 'ASK_NAME': {
      if (text.length < 3 || /^\d+$/.test(text)) {
        return {
          state,
          reply: 'No me quedó claro tu nombre 🤔 ¿Me lo escribes completo, por favor? (ej: *María Pérez*)',
          justCompleted: false,
          humanRequested,
        }
      }
      const next: OnboardingState = { ...state, step: 'ASK_SPECIALTY', name: text }
      return {
        state: next,
        reply: `¡Un gusto, ${firstName(text)}! 🙌\n\n¿Cuál es tu *especialidad*? (ej: Medicina Interna, Pediatría, Medicina General...)`,
        justCompleted: false,
        humanRequested,
      }
    }

    case 'ASK_SPECIALTY': {
      if (text.length < 3) {
        return {
          state,
          reply: '¿Me confirmas tu *especialidad*? (ej: Medicina General) 😊',
          justCompleted: false,
          humanRequested,
        }
      }
      const next: OnboardingState = { ...state, step: 'ASK_EMAIL', specialty: text }
      return {
        state: next,
        reply: `Excelente. Último dato: ¿cuál es tu *correo electrónico*? Con él iniciarás sesión en la plataforma. ✉️`,
        justCompleted: false,
        humanRequested,
      }
    }

    case 'ASK_EMAIL': {
      const email = text.toLowerCase().replace(/\s/g, '')
      if (!EMAIL_RE.test(email)) {
        return {
          state,
          reply: 'Mmm, ese correo no parece válido 🤔 ¿Me lo confirmas? (ej: *nombre@gmail.com*)',
          justCompleted: false,
          humanRequested,
        }
      }
      const next: OnboardingState = { ...state, step: 'DONE', email }
      return {
        state: next,
        reply: doneReply(next, buildRegisterUrl(appUrl, next, phone)),
        justCompleted: true,
        humanRequested,
      }
    }

    case 'DONE': {
      const url = buildRegisterUrl(appUrl, state, phone)
      if (humanRequested) {
        return {
          state,
          reply: `¡Por supuesto! 🤝 Ya avisé al equipo — una persona te escribirá por este mismo chat muy pronto.\n\nMientras tanto, tu link de registro sigue activo:\n${url}`,
          justCompleted: false,
          humanRequested: true,
        }
      }
      return {
        state,
        reply: `¡Hola de nuevo! 😊 Tu link de registro sigue activo (2 minutos y quedas dentro):\n${url}\n\nSi prefieres que te contacte una persona del equipo, responde *AYUDA*.`,
        justCompleted: false,
        humanRequested: false,
      }
    }
  }
}

/** Parsea el estado guardado en Lead.notes. Devuelve null si no es un estado válido. */
export function parseState(notes: string | null | undefined): OnboardingState | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes) as Partial<OnboardingState>
    if (
      parsed &&
      typeof parsed.step === 'string' &&
      ['ASK_NAME', 'ASK_SPECIALTY', 'ASK_EMAIL', 'DONE'].includes(parsed.step)
    ) {
      return parsed as OnboardingState
    }
  } catch { /* notes no es JSON de estado */ }
  return null
}

export function serializeState(state: OnboardingState): string {
  return JSON.stringify(state)
}
