import { describe, it, expect } from 'vitest'
import {
  greeting,
  advance,
  parseState,
  serializeState,
  buildRegisterUrl,
  type OnboardingState,
} from '@/lib/wa-onboarding'

const APP = 'https://www.consultorio.site'
const PHONE = '593999999999'

describe('wa-onboarding state machine', () => {
  it('greeting starts at ASK_NAME and mentions the trial', () => {
    const g = greeting('Luis')
    expect(g.state.step).toBe('ASK_NAME')
    expect(g.reply).toContain('Luis')
    expect(g.reply).toContain('21 días')
    expect(g.justCompleted).toBe(false)
  })

  it('happy path: name → specialty → email → DONE with register link', () => {
    let r = advance({ step: 'ASK_NAME' }, 'María Fernanda Pérez', PHONE, APP)
    expect(r.state.step).toBe('ASK_SPECIALTY')
    expect(r.state.name).toBe('María Fernanda Pérez')
    expect(r.reply).toContain('María')

    r = advance(r.state, 'Medicina Interna', PHONE, APP)
    expect(r.state.step).toBe('ASK_EMAIL')
    expect(r.state.specialty).toBe('Medicina Interna')

    r = advance(r.state, 'maria@gmail.com', PHONE, APP)
    expect(r.state.step).toBe('DONE')
    expect(r.state.email).toBe('maria@gmail.com')
    expect(r.justCompleted).toBe(true)
    expect(r.reply).toContain('/register?')
    expect(r.reply).toContain('firstName=Mar%C3%ADa')
  })

  it('rejects invalid names (too short or only digits)', () => {
    expect(advance({ step: 'ASK_NAME' }, 'ab', PHONE, APP).state.step).toBe('ASK_NAME')
    expect(advance({ step: 'ASK_NAME' }, '12345', PHONE, APP).state.step).toBe('ASK_NAME')
  })

  it('re-asks on invalid email and normalizes valid ones', () => {
    const state: OnboardingState = { step: 'ASK_EMAIL', name: 'Ana Ruiz', specialty: 'Pediatría' }
    const bad = advance(state, 'no-es-un-correo', PHONE, APP)
    expect(bad.state.step).toBe('ASK_EMAIL')
    expect(bad.justCompleted).toBe(false)

    const ok = advance(state, '  ANA.Ruiz@Gmail.com ', PHONE, APP)
    expect(ok.state.step).toBe('DONE')
    expect(ok.state.email).toBe('ana.ruiz@gmail.com')
  })

  it('DONE: re-sends the link and detects help requests', () => {
    const state: OnboardingState = {
      step: 'DONE', name: 'Ana Ruiz', specialty: 'Pediatría', email: 'ana@gmail.com',
    }
    const again = advance(state, 'hola?', PHONE, APP)
    expect(again.state.step).toBe('DONE')
    expect(again.reply).toContain('/register?')
    expect(again.humanRequested).toBe(false)

    const help = advance(state, 'AYUDA', PHONE, APP)
    expect(help.humanRequested).toBe(true)
  })

  it('reset words restart the funnel from any step', () => {
    const state: OnboardingState = { step: 'ASK_EMAIL', name: 'X Y', specialty: 'Z' }
    const r = advance(state, 'empezar de nuevo', PHONE, APP)
    expect(r.state.step).toBe('ASK_NAME')
    expect(r.state.name).toBeUndefined()
  })

  it('buildRegisterUrl splits name and carries specialty, email, whatsapp and UTM', () => {
    const url = buildRegisterUrl(APP, {
      step: 'DONE', name: 'Juan Carlos Díaz', specialty: 'Cardiología', email: 'jc@x.com',
    }, PHONE)
    const u = new URL(url)
    expect(u.pathname).toBe('/register')
    expect(u.searchParams.get('firstName')).toBe('Juan')
    expect(u.searchParams.get('lastName')).toBe('Carlos Díaz')
    expect(u.searchParams.get('specialty')).toBe('Cardiología')
    expect(u.searchParams.get('email')).toBe('jc@x.com')
    expect(u.searchParams.get('whatsapp')).toBe(`+${PHONE}`)
    expect(u.searchParams.get('utm_source')).toBe('whatsapp')
  })

  it('parseState round-trips and rejects garbage', () => {
    const state: OnboardingState = { step: 'ASK_SPECIALTY', name: 'Ana' }
    expect(parseState(serializeState(state))).toEqual(state)
    expect(parseState(null)).toBeNull()
    expect(parseState('nota manual del CRM')).toBeNull()
    expect(parseState('{"step":"WRONG"}')).toBeNull()
  })
})
