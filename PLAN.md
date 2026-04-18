<!-- /autoplan restore point: /root/.gstack/projects/lriofrio915-sara-solution/main-autoplan-restore-20260418-223342.md -->

# MedSara — Plan de Producto: Crecimiento y Consolidación

**Proyecto:** sara-solution (github: lriofrio915/sara-solution)
**Rama:** main
**Fecha:** 2026-04-10
**Estado:** En producción (PM2, puerto 3001)

---

## Contexto

MedSara es un SaaS médico para consultorios privados en LatAm (Ecuador, mercado principal).
Ya tiene médicos reales pagando. El cirujano fundador lo usa como herramienta de trabajo diaria.
El sistema está vivo y creciendo.

Stack: Next.js 14, Prisma ORM, PostgreSQL/Supabase, Supabase Auth, PM2 (port 3001).

---

## Lo que ya está construido (inventario completo)

### Núcleo clínico
- **Autenticación**: Login/registro/reset, Supabase Auth, roles doctor/patient
- **Dashboard**: Vista del médico con pacientes del día
- **Pacientes**: Lista, búsqueda, ficha, historial clínico completo
- **Atenciones**: Registro de consultas con ICD-11, diagnósticos, notas
- **Recetas**: Generación de recetas con PDF, numeración automática
- **Órdenes de examen**: Creación de órdenes por categoría (hematología, bioquímica, etc.)
- **Certificados médicos**: Generación y emisión de certificados
- **Agenda**: Gestión de citas, nuevas citas, recordatorios
- **Signos vitales y gráficas**: PatientChart con datos de control

### Sara IA
- **SaraFAB**: Floating action button con chat embebido
- **SaraChatPanel**: Panel de chat con historial
- **Memorias**: SaraMemory para contexto persistente por médico
- **Preguntas sin respuesta**: SaraUnansweredQuestion para mejora continua

### Marketing (módulo completo)
- **Instagram, Facebook, TikTok, LinkedIn**: Generación de posts con IA
- **Autopilot**: Publicación automática programada
- **Branding**: Perfil de marca del médico
- **Calendario**: Planificación de contenido
- **Librería**: Posts guardados y reutilizables
- **OAuth**: Integración real con Meta y LinkedIn

### Portal del paciente
- **/mi-salud**: Portal del paciente para ver su historial

### Infraestructura B2B
- **Admin**: Panel de super-admin (doctors, leads, referidos)
- **Leads**: CRM básico de prospectos
- **Referidos**: Sistema de referral con recompensas
- **Analytics**: Métricas del consultorio
- **Knowledge base**: Base de conocimiento médico
- **Onboarding**: Flujo de configuración inicial

### Compliance y seguridad
- **ARCO**: Derechos de datos (exportar, eliminar) — NOM-024, LFPDPPP
- **FHIR R4**: API estándar internacional de salud
- **Consentimientos**: ConsentRecord con firma digital
- **Encriptación**: Tokens OAuth cifrados AES-256-GCM

### Integración
- **n8n**: Webhooks personalizados por médico
- **Stripe**: Integración de pagos (billing)
- **Resend**: Email transaccional
- **Puppeteer**: Generación de PDFs

---

## Planes y monetización

- FREE: acceso básico
- TRIAL: 21 días con acceso PRO completo
- PRO_MENSUAL, PRO_ANUAL: acceso completo
- ENTERPRISE: acceso completo + features especiales

---

## Próxima fase: Primer pago digital confirmado + $500 MRR

> **Premise confirmed 2026-04-10:** Ningún médico ha pagado vía Stripe end-to-end todavía.
> La activación de planes es manual (SQL). El objetivo real es el PRIMER pago digital confirmado,
> luego $500 MRR. GTM lead: "Sara publica tu contenido mientras atiendes pacientes."

### Objetivo
Primer pago digital confirmado via Stripe en < 2 semanas. $500 MRR en 60 días.

### Tareas identificadas

**1. Onboarding sin fricción**
- El flujo actual de onboarding no está completamente pulido
- Meta: el médico pasa de registro a primera cita guardada en < 10 minutos
- Falta: demo interactivo, tooltip guiado, checklist de configuración

**2. Billing funcional**
- Stripe está integrado pero el flujo de upgrade no está completamente conectado
- Falta: página de upgrade clara, webhook de Stripe para activar plan automáticamente
- El plan se activa manualmente con SQL actualmente (ver CLAUDE.md)

**3. Referral activo**
- Sistema de referidos está en el schema y tiene endpoints
- No se sabe si el flujo completo (código → landing → registro → recompensa) funciona end-to-end

**4. Robustez de producción**
- Rate limiting en-memoria (Map<>) no escala en multi-instancia
- No hay tests automatizados
- No hay monitoreo de errores (Sentry o similar)

**5. Marketing del producto**
- El médico tiene marketing integrado pero MedSara en sí no tiene página de landing pública propia
- Falta página pública /pricing que explique planes

**6. Mobile UX**
- Interfaz diseñada desktop-first pero los médicos usan el teléfono entre consultas
- Algunos componentes no están optimizados para pantallas pequeñas

---

## Criterios de éxito

| Criterio | Estado actual | Meta (60 días) |
|----------|---------------|----------------|
| Médicos pagando | ~1-3 (estimado) | 10 |
| Onboarding < 10 min | No medido | ✓ |
| Billing automatizado | Manual (SQL) | ✓ |
| Uptime > 99% | PM2 básico | ✓ |
| Tests automatizados | 0 | Suite básica |

---

## Reglas de seguridad (de CLAUDE.md)

1. NUNCA usar service-role key en server components
2. doctor_id siempre desde session JWT
3. DOMPurify antes de renderizar notas clínicas
4. No destructive DB operations sin confirmación

---

---

## Phase 1: CEO Review — SELECTIVE EXPANSION

**Mode:** SELECTIVE EXPANSION (existing production product, iterating toward growth)
**Base branch:** main | **Commit:** 4ae08ca

---

### Pre-Review System Audit

**Git history (30):** Recent commits show: React Server Components CVE fix, CLAUDE.md quality rules, ICD-11 flow improvements, LinkedIn/social marketing expansion, LOPDP compliance (RLS AuditLog, ARCO, FHIR R4, firma digital), dark mode audit, bug fixes across prescriptions/admin.

**TODO/FIXME files (3):**
- `src/app/(doctor)/admin/doctors/page.tsx`
- `src/app/(public)/[slug]/page.tsx`
- `src/components/PhoneInput.tsx`

**Hot files (30 days):**
- `prisma/schema.prisma` (31 changes) — schema is still in flux
- `src/app/(doctor)/profile/page.tsx` (25) — most active page
- `src/components/DoctorSidebar.tsx` (17)
- `src/app/(public)/[slug]/page.tsx` (17) — public doctor page heavy iteration

**Design doc:** None found.
**Handoff note:** None found.

**Architecture taste references (well-designed):**
- `middleware.ts` — rate limiting is clean and well-commented (C6 label, tier-based)
- `PlanGate.tsx` — clean gate component, good separation
- `src/lib/supabase/admin.ts` — correctly isolates service-role client with explicit RLS bypass comment

**Anti-patterns found:**
- Billing page is a placeholder ("Plan de Implementación" phases) — not functional
- In-memory `rateLimitStore` (Map<>) breaks under multi-process/multi-instance deployment
- Onboarding skips to dashboard if `bio` exists — weak completeness check

---

### Step 0A: Premise Challenge

**P1 — Goal: "10 paying doctors in 60 days"**
Status: QUESTIONABLE. This is a headcount metric, not a business metric. At ~$50-80/month per doctor, 10 doctors = $500-800 MRR. That doesn't prove anything beyond friends-and-family adoption. The right question is: has any doctor paid via Stripe yet? The billing page is a placeholder and CLAUDE.md says plan activation is done via SQL. That means zero confirmed self-serve payments.

**P2 — Self-serve SaaS acquisition works in LatAm medical**
Status: UNVALIDATED. Medical SaaS in LatAm is heavily referral-driven (doctor asks colleague). No landing page converts a surgeon cold. The assumption that fixing onboarding gets you to 10 doctors is not proven.

**P3 — The product scope is right**
Status: PARTIALLY WRONG. FHIR R4, ARCO compliance, n8n webhooks, DoctorMember/assistant roles, consent records, satisfaction surveys — none of these are asked for by a solo surgeon in Quito. They create maintenance burden without closing a single sale.

**P4 — Marketing module is a feature**
Status: UNDERVALUED. The Instagram/LinkedIn/TikTok autopilot is the strongest differentiator. No EMR competitor does this. This should be the go-to-market hook, not buried under "clinical management."

---

### Step 0B: Existing Code Leverage Map

| Sub-problem | Existing code |
|-------------|---------------|
| Plan activation | `PlanGate`, `src/lib/plan.ts`, `isPro()` — works, just needs Stripe webhook |
| Onboarding | `src/app/(doctor)/onboarding/page.tsx` — 3-step wizard exists |
| Referral flow | Schema: `Referral` model, `referralCode` on Doctor, `/api/admin/referidos/` routes |
| Billing UI | `/billing/page.tsx` — placeholder, needs real Stripe integration |
| Error monitoring | None — gap |
| Rate limiting | `middleware.ts` — in-memory, needs Redis for multi-process |
| Marketing | Full suite built (Instagram, Facebook, LinkedIn, TikTok, autopilot) |

Nothing needs to be rebuilt. The gaps are automation/wiring.

---

### Step 0C: Dream State Mapping

```
CURRENT STATE                  THIS PLAN                      12-MONTH IDEAL
─────────────────              ────────────────────           ──────────────────────────
~1-3 doctors paying            10 doctors, billing            50+ doctors, $4K+ MRR
Manual plan activation         Stripe webhook live            Self-serve upgrade funnel
No error monitoring            Still no monitoring (gap)      Sentry + uptime alerts
Marketing built, not sold      Still no marketing angle       "Sara posts your content"
                                                               is the sales hook
In-memory rate limit           Still in-memory (gap)          Redis rate limit / CDN
No public /pricing page        Pricing page built             SEO-indexed pricing page
Onboarding: 3 steps, weak      Better onboarding              <5 min to first patient
No automated tests             No automated tests (gap)       E2E suite on core flows
```

---

### Step 0C-bis: Implementation Alternatives

```
APPROACH A: Minimal Revenue Unlock
  Summary: Wire Stripe webhooks to auto-activate plan + fix billing page
  Effort:  S (human: 2 days / CC: 1 hour)
  Risk:    Low
  Pros:    Unblocks actual revenue collection, proves self-serve works
           Fastest path to first confirmed digital payment
           No new architecture needed
  Cons:    Doesn't fix acquisition problem (still need to find doctors)
           Marketing angle not leveraged
  Reuses:  PlanGate, plan.ts, existing Stripe import in package.json

APPROACH B: Growth Stack (billing + monitoring + referral E2E)
  Summary: Stripe webhook + Sentry + test referral flow end-to-end + /pricing page
  Effort:  M (human: 1 week / CC: 2-3 hours)
  Risk:    Medium
  Pros:    Full revenue funnel working
           Error visibility in production
           Referral loop can start converting
  Cons:    More surface area to ship
           Still doesn't fix distribution channel
  Reuses:  All of the above + existing Referral schema + resend for emails

APPROACH C: Marketing-Led GTM Pivot
  Summary: Lead with Sara's marketing autopilot as the product pitch
           Build a /demo or video landing page showing "Sara posts for you while you see patients"
           Reach doctors via WhatsApp medical communities and specialty associations
  Effort:  M (human: 1 week / CC: 2 hours)
  Risk:    Medium-High (requires non-code distribution work)
  Pros:    Differentiated positioning nobody else has
           Potential for viral loop among doctors ("my colleague uses Sara for posts")
  Cons:    Requires human outreach effort (not automatable yet)
           Pivots messaging from clinical tool to marketing tool
  Reuses:  Full marketing suite already built
```

**RECOMMENDATION:** Approach B (Growth Stack) is the right foundation. It fixes the revenue mechanism, adds visibility, and unblocks the referral loop. Approach C's marketing angle should run in parallel as a positioning decision, not a code decision. Auto-decided: B (P3 — pragmatic, fixes the real bottleneck without over-building).

---

### Step 0D: Mode-Specific Analysis (SELECTIVE EXPANSION)

**Complexity check:** The plan touches the entire product (onboarding, billing, monitoring, mobile, tests). That's too broad. The minimum set that unlocks the most value: Stripe webhook auto-activation + /pricing page + Sentry.

**Expansion candidates (presented at gate — see Phase 4):**
1. Stripe webhook for auto plan activation (S, critical revenue unblock)
2. Sentry error monitoring (S, critical observability)
3. /pricing page with clear plan comparison (S, conversion)
4. Redis rate limiting to replace in-memory Map<> (M, production safety)
5. Referral end-to-end test + activation email (M, growth loop)
6. Automated test suite for core flows (M, reliability)
7. Marketing landing page: "Sara posts for you" positioning (M, GTM)
8. Mobile UX pass on key screens (M, usability)

---

### Step 0E: Temporal Interrogation

```
HOUR 1 (foundations):     Stripe webhook setup — which price IDs map to which Plan enum values?
                          SUPABASE_SERVICE_ROLE_KEY is needed for Stripe webhook to update plan.
                          Who has the Stripe dashboard access?

HOUR 2-3 (core logic):   Plan activation endpoint — does it validate Stripe signature?
                          What happens if webhook fires twice (Stripe retries)?

HOUR 4-5 (integration):  /pricing page — which plans are shown? What are the prices in USD?
                          TRIAL ends automatically? Or manual?

HOUR 6+ (polish/tests):  Email notification on plan upgrade?
                          What does the doctor see after paying — does UI update immediately?
```

---

### CEO Dual Voices

**CLAUDE SUBAGENT (CEO — strategic independence):**
```
═══════════════════════════════════════════════════════════════
1. WRONG GOAL (HIGH): "10 doctors" is a vanity metric.
   Target $3K MRR instead — proves repeatable sales.

2. CRITICAL PREMISE FAILURE: No confirmed Stripe payment has ever
   cleared. Self-serve SaaS in LatAm medical = unvalidated premise.
   Manual SQL plan activation = zero paying users via product.

3. 6-MONTH REGRET: 60 days of product polish, 4 doctors using it.
   Constraint is distribution, not onboarding UX.

4. DISMISSED ALTERNATIVE: Marketing module is the differentiator.
   "Sara posts your content while you see patients" is the hook.
   No EMR competitor does this. Should be the GTM lead.

5. COMPETITIVE RISK (HIGH): 6-12 month window before Doctoralia
   or a funded startup copies the AI marketing angle.

6. OVERBUILT (MEDIUM): FHIR R4, ARCO, n8n, consent records —
   maintenance burden, zero sales value at current stage.

7. BIGGEST GAP: Zero evidence of conversations with doctors
   outside the founder's immediate network.
═══════════════════════════════════════════════════════════════
```

**CODEX VOICE:** Not available — running single-model [subagent-only].

**CEO CONSENSUS TABLE:**
```
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   WARN    N/A    WARN
  2. Right problem to solve?           WARN    N/A    WARN
  3. Scope calibration correct?        WARN    N/A    WARN
  4. Alternatives sufficiently explored?OK     N/A    N/A
  5. Competitive/market risks covered? WARN    N/A    WARN
  6. 6-month trajectory sound?         WARN    N/A    WARN
═══════════════════════════════════════════════════════════════
NOTE: Single-model review — Codex unavailable.
```

---

### Section 1: Architecture Review

**System architecture (current state):**
```
  Browser/Mobile
      │
      ▼
  Vercel / PM2 (Next.js 14 App Router, port 3001)
      │
      ├─── Supabase Auth ──── JWT → middleware.ts → route protection
      │
      ├─── Prisma ORM ──────── PostgreSQL (Supabase) ← RLS via service-role bypass
      │                        (Doctor, Patient, Appointment, Prescription, ...)
      │
      ├─── /api/*** ──────────  API routes (Next.js route handlers)
      │       ├─ /api/admin/*   admin routes (need SUPABASE_SERVICE_ROLE_KEY)
      │       ├─ /api/marketing/* → Anthropic/OpenAI for AI content
      │       ├─ /api/sara/*    → Sara AI assistant
      │       └─ /api/stripe    (MISSING — webhook not wired)
      │
      ├─── External services:
      │       ├─ Anthropic API (Sara AI + marketing content)
      │       ├─ OpenAI (fallback?)
      │       ├─ Stripe (billing — webhook endpoint MISSING)
      │       ├─ Resend (email)
      │       ├─ Meta OAuth (Instagram/Facebook)
      │       ├─ LinkedIn OAuth
      │       └─ n8n webhooks (per-doctor)
      │
      └─── Rate limiting: in-memory Map<> (SINGLE PROCESS ONLY ⚠️)
```

**Coupling concerns:**
- `prisma.ts` is a global singleton — correct for Next.js
- `supabase/admin.ts` used in admin routes — service-role key bypasses RLS. Must never leak to client components. Currently server-only. OK.
- Stripe webhook endpoint doesn't exist yet → manual SQL workaround creates operational risk

**Scaling:**
- In-memory rate limiting breaks at 2+ PM2 instances. CRITICAL for any horizontal scale.
- Prisma connection pool: `DATABASE_URL` + `DIRECT_URL` pattern used (correct for Supabase).
- `force-dynamic` on dashboard page — every request hits DB. At 100 doctors, N+1 queries in dashboard become visible.

**Single points of failure:** PM2 single process, no Redis, no queue system.

**Rollback posture:** Git revert + `pm2 restart`. DB schema changes via `prisma db push` are NOT easily reversible (no migration files). RISK.

---

### Section 2: Error & Rescue Map

| CODEPATH | WHAT CAN FAIL | RESCUED? | USER SEES |
|----------|---------------|----------|-----------|
| Stripe webhook (missing) | — | N/A | N/A — webhook doesn't exist yet |
| Sara AI `/api/sara/chat` | Anthropic timeout | Unknown | Likely 500 |
| Sara AI `/api/sara/chat` | Anthropic rate limit | Unknown | Likely 500 |
| Marketing AI generate | OpenAI/Anthropic error | Unknown | Likely 500 |
| Meta OAuth callback | Token expired | Unknown | Likely crash |
| LinkedIn OAuth callback | Token expired | Unknown | Likely crash |
| Prescription PDF | puppeteer crash | Unknown | Silent failure |
| Patient data fetch | DB connection lost | Unknown | 500 |
| Rate limit store cleanup | Never fails (simple) | N/A | N/A |

**CRITICAL GAPS:**
- AI service calls: no rescue for timeouts, rate limits, malformed JSON responses
- PDF generation: no error surfaced to user if puppeteer fails
- OAuth token refresh: not clear if tokens are refreshed on expiry

---

### Section 3: Security & Threat Model

| THREAT | LIKELIHOOD | IMPACT | MITIGATED? |
|--------|-----------|--------|------------|
| IDOR via doctorId manipulation | Med | High | Partial — middleware checks auth but API routes need per-doctor validation |
| Service-role key leaked to client | Low | Critical | Not observed — `admin.ts` is server-only |
| Stored XSS in clinical notes | Med | High | Unknown — no DOMPurify evidence found in code |
| Stripe webhook replay attack | Med | High | Missing — no signature verification (webhook endpoint missing) |
| OAuth token theft | Low | High | Tokens encrypted AES-256-GCM in DB — good |
| SQL injection via Prisma | Low | Critical | Prisma parameterizes — not an issue |
| Medical data breach (patient notes) | Low | Critical | Supabase RLS + Prisma + auth — reasonable |
| Rate limit bypass (distributed) | Med | Med | In-memory store only checks per single-process IP |

**KEY GAP:** DOMPurify — CLAUDE.md mentions it as a rule but no implementation evidence found in codebase. Clinical notes (`notes`, `diagnosis`, `treatment` fields) are stored as plain text and rendered. If rendered via `dangerouslySetInnerHTML` anywhere, stored XSS is possible.

---

### Section 4: Data Flow & Interaction Edge Cases

**Billing flow (BROKEN):**
```
Doctor pays (Stripe) ──▶ Stripe fires webhook ──▶ [ENDPOINT MISSING] ──▶ Plan NOT updated
                                                                          ▲
                                                                     Manual SQL required
```

**Plan gate flow:**
```
Doctor accesses feature ──▶ PlanGate checks isPro(plan)
  ├── isPro = true ──▶ renders feature (OK)
  └── isPro = false ──▶ renders /upgrade link
                              │
                              ▼
                        /upgrade page (exists? needs checking)
```

**Interaction edge cases:**
| INTERACTION | EDGE CASE | HANDLED? |
|-------------|-----------|----------|
| Create prescription | Double-submit | Unknown |
| Sara AI chat | Message while response loading | Unknown |
| Marketing post publish | LinkedIn token expired | Unknown |
| Patient creation | Duplicate name | Unknown |
| Onboarding | Reload on step 2 | Resets to step 1 (no persistence) |
| Rate limit | Multi-tab same user | Each tab independent (in-memory) |

---

### Section 5: Code Quality Review

**DRY violations:**
- Doctor data fetch pattern repeated across many page components (each page fetches profile independently). A `getDoctorProfile()` server action would centralize this.
- `supabase.auth.getUser()` called in every server component. Could be abstracted.

**Well-designed patterns:**
- `PlanGate` component — clean, single responsibility
- `lib/plan.ts` + `isPro()` — correctly abstracts plan logic

**Over-engineering concerns:**
- `DoctorCredential` model, `SatisfactionSurvey`, `ConsentRecord`, `KnowledgeDocument` — built before anyone asked for them. Delete or freeze.
- `SaraUnansweredQuestion` — useful idea, but creates DB writes on every unanswered query. No evidence it's being read.

**Under-engineering:**
- No `try/catch` pattern standard across API routes (each route likely handles errors differently)
- Billing page is pure UI with no backend connection

---

### Section 6: Test Review

**New UX flows (plan's scope: billing, onboarding, referral, monitoring):**
- Stripe webhook → plan activation
- Doctor pays → UI updates (plan badge, PlanGate unlocks)
- Referral code shared → new doctor registers → referrer rewarded
- Onboarding completion → first patient created → first appointment

**NEW CODEPATHS (to be added per plan):**
| Codepath | Test Type | Exists? |
|----------|-----------|---------|
| Stripe webhook handler | Integration | NO |
| Plan activation on payment | Unit | NO |
| Referral conversion flow | Integration | NO |
| Onboarding step completion | E2E | NO |
| Rate limit under load | Load | NO |

**Test plan artifact:** Written to disk at `~/.gstack/projects/lriofrio915-sara-solution/`.
**Zero automated tests currently exist.** Every flow is manual-only.

---

### Section 7: Performance Review

**N+1 concerns:**
- Dashboard `page.tsx` uses `prisma.appointment.findMany()` with multiple related queries. At 50 patients per doctor, 100 doctors → each dashboard load is O(patients × appointments). Add indexes.
- `prisma/schema.prisma` has `@@index` on most foreign keys — good. But `[doctorId, date]` compound index on Appointment is there — good.

**Slow paths:**
1. Dashboard full analytics query (6 months of appointments, grouped) — no caching
2. PDF generation (puppeteer-core) — synchronous, blocks response
3. Sara AI chat — dependent on Anthropic latency (~1-3s)

**Connection pool:** `DATABASE_URL` pooled + `DIRECT_URL` direct (correct for Supabase/pgbouncer).

---

### Section 8: Observability & Debuggability

**Current state:** Zero monitoring. No Sentry, no uptime check, no structured logging, no dashboards.

**Critical gaps:**
- If Sara AI returns wrong answers, nobody knows
- If Stripe payment fails silently, nobody knows
- If PDF generation breaks, doctor can't print prescriptions, nobody knows
- If Meta token expires, posts stop publishing, nobody knows

**Required minimum:**
1. Sentry (frontend + backend error capture)
2. Uptime monitor (Better Uptime / Checkly for `/api/health`)
3. Log Stripe webhook receipt and outcome

---

### Section 9: Deployment & Rollout

**Current:** `npm run build && pm2 restart medsara --update-env`

**Risks:**
- `prisma db push` in Vercel build step (noted in CLAUDE.md) — destructive if schema conflicts
- No staging environment mentioned
- Rollback = git revert + rebuild. No feature flags.
- PM2 single-process on a server — what server? VPS? No redundancy.

**Migration safety:** `prisma db push` does NOT create migration files. Schema changes are not versioned. If the team grows, this is a disaster waiting to happen. Migrate to `prisma migrate` before adding any more developers.

---

### Section 10: Long-Term Trajectory

**Technical debt introduced (existing, not new):**
- `prisma db push` instead of `prisma migrate` — high debt
- In-memory rate limiting — medium debt
- No test suite — high debt
- No error monitoring — high debt
- Manual billing activation — blocks growth

**Reversibility of key decisions:**
- Supabase Auth: 3/5 (can migrate but painful)
- Prisma + PostgreSQL: 5/5 (standard, reversible)
- Next.js 14 App Router: 4/5
- n8n webhooks: 5/5 (just a URL field)

**1-year trajectory concern:** If this product works and needs to scale beyond 50 doctors, the in-memory rate limiting, no test suite, and `prisma db push` workflow become blockers. Fix them before they become emergencies.

---

### Section 11: Design & UX Review (UI scope detected)

**Interaction state coverage:**
| FEATURE | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL |
|---------|---------|-------|-------|---------|---------|
| Dashboard | ✓ (dynamic) | Unknown | Unknown | ✓ | Unknown |
| Patient creation | Unknown | ✓ (empty state) | Partial | ✓ | Unknown |
| Sara AI chat | Unknown | ✓ | Unknown | ✓ | Unknown |
| Prescription PDF | Unknown | N/A | Unknown | Unknown | Unknown |
| Marketing post | Unknown | ✓ | Unknown | Unknown | Unknown |
| Billing upgrade | N/A | N/A | None | None | N/A |

**Mobile:** Profile page has responsive classes. Dashboard has charts — unknown mobile behavior.

**AI slop risk:** LOW — the UI is custom-built, not generic patterns. The insurance catalog UI, ICD-11 search, exam order categories — these are domain-specific and thoughtful.

**UX critical gap:** `/upgrade` page needs to exist and be compelling. The `PlanGate` links there but `/upgrade` is not in the app directory listing found earlier. This means the upgrade funnel is BROKEN — a FREE doctor clicking "Ver planes" hits a 404.

---

### NOT in scope (deferred)

| Item | Rationale |
|------|-----------|
| WhatsApp Business API integration | Different product scope |
| FHIR R4 API improvements | No user request, high maintenance |
| Multi-country compliance (Chile, Colombia) | After Ecuador PMF |
| Teleconsult video | Different feature |
| Mobile app (React Native) | After 20+ paying users |
| Satisfaction surveys | Not requested |
| Patient portal expansion | After core revenue |

---

### What Already Exists

| Need | Existing code |
|------|---------------|
| Plan gating | `PlanGate.tsx`, `lib/plan.ts`, `isPro()` |
| Billing UI | `/billing/page.tsx` (needs wiring) |
| Stripe package | `stripe` in package.json |
| Email | `resend` in package.json |
| Referral schema | `Referral` model, `referralCode` on Doctor |
| Onboarding wizard | `/onboarding/page.tsx` (3-step) |
| Admin panel | `/admin/*` routes |

---

### Dream State Delta

This plan (if executed) gets us from manual billing to automated billing, from zero monitoring to basic observability. It does NOT fix distribution (how to find new doctors). The 12-month ideal requires a repeatable acquisition loop, which is a human/sales problem, not a code problem.

---

### Error & Rescue Registry (Critical Paths)

| METHOD | WHAT CAN GO WRONG | RESCUED? | USER SEES |
|--------|--------------------|----------|-----------|
| Stripe webhook handler (missing) | Malformed payload | N/A | N/A |
| Sara AI chat | Anthropic timeout/rate limit | NO — GAP | 500 error |
| PDF generation | Puppeteer crash | NO — GAP | Silent failure |
| Marketing OAuth | Token expired | NO — GAP | Silent failure |
| Plan activation | DB update fails | NO — GAP | Doctor still on FREE |

---

### Failure Modes Registry

| CODEPATH | FAILURE MODE | RESCUED? | TEST? | USER SEES | LOGGED? |
|----------|-------------|---------|-------|-----------|---------|
| Sara AI chat | Anthropic timeout | NO | NO | 500 | NO |
| PDF generation | Puppeteer crash | NO | NO | Nothing | NO |
| Stripe webhook | Not wired | N/A | N/A | Never pays | N/A |
| LinkedIn token | Expired token | NO | NO | Posts stop | NO |
| Rate limit | Multi-process bypass | Partial | NO | No limit enforced | NO |

**CRITICAL GAPS: 4** (Sara AI, PDF, LinkedIn token, rate limit)

---

### Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Mode: SELECTIVE EXPANSION | Mechanical | P3 | Existing production product, iteration | SCOPE_EXPANSION |
| 2 | CEO | Approach B (Growth Stack) selected | Mechanical | P3 | Fixes revenue mechanism without over-building | A (too minimal), C (non-code work) |
| 3 | CEO | Deferred: FHIR R4, ARCO improvements, multi-country compliance | Mechanical | P3 | No user value at current stage | Building now |
| 4 | CEO | Flag: /upgrade page may be 404 | Mechanical | P1 | Critical path for revenue — must verify | Ignoring |
| 5 | CEO | Flag: DOMPurify not found — XSS risk in clinical notes | Mechanical | P1 | Security non-negotiable | Deferring |
| 6 | CEO | Flag: prisma db push → migrate debt | Mechanical | P5 | Must fix before team grows | Ignoring |
| 7 | CEO GATE | Premise confirmed: billing is manual, goal = first digital payment + $500 MRR | USER CONFIRMED | — | User confirmed 2026-04-10 | 10-doctors headcount |
| 8 | CEO GATE | GTM angle confirmed: "Sara posts your content while you see patients" | USER CONFIRMED | — | User confirmed 2026-04-10 | Clinical tool as lead |

---

## Phase 2: Design Review — SELECTIVE EXPANSION

**Design binary:** Present but OpenAI API key not configured — text-based review.
**Design system:** Inter font, primary #2563EB, secondary #0D9488, no DESIGN.md.
**Initial rating:** 5.5/10 — good component-level design, missing critical journey design decisions.

---

### Step 0: Design Scope Assessment

**0A. Initial Rating:** 5.5/10
What 10 looks like: every screen has explicit interaction state coverage (loading/empty/error/success), the doctor's daily workflow (check today's patients → open chart → write note → print) takes ≤3 taps, and the upgrade funnel has social proof + comparison table.

**0B. DESIGN.md:** Missing. No formal design system documented. The Tailwind config IS the implicit design system (Inter, primary blue, secondary teal). Recommend creating DESIGN.md before adding new screens.

**0C. Existing Design Leverage (reuse these):**
- `PlanGate.tsx` — clean locked-feature pattern
- `PlanBanner.tsx` — urgency-driven upgrade nudge (well done)
- Bottom mobile tab bar in `DoctorSidebar.tsx` — solid navigation pattern
- Rounded-2xl + border card pattern used consistently

---

### Design Subagent (independent review):

```
═══════════════════════════════════════════════════════════════
CLAUDE SUBAGENT (design — independent review):

1. CRITICAL — Dashboard "Resumen IA" leads with 6-month analytics.
   Wrong default for daily doctor workflow. Doctors need "Hoy"
   (today's patients) as the entry screen, not charts.
   Fix: default to appointment list. Charts → "Reportes" tab.

2. CRITICAL — Upgrade funnel missing social proof, free-tier
   comparison, FAQ. $79/mes with no context = bounce.
   Fix: comparison table + 3-bullet testimonials + FAQ accordion.

3. HIGH — Sara AI chat: no loading skeleton. 1-3s Anthropic
   latency with blank screen = duplicate submissions.
   Fix: streaming skeleton / typing indicator on submit.

4. HIGH — Prescription PDF: silent Puppeteer failure.
   Doctor clicks "Imprimir" → nothing happens.
   Fix: try/catch + "No se pudo generar el PDF. Reintentar →" toast.

5. HIGH — Marketing OAuth: posts stop silently when token expires.
   Fix: detect 401 in autopilot, send Resend email "Tu conexión
   con Instagram expiró."

6. HIGH — Onboarding: 3 steps land on empty analytics dashboard.
   No signal for what to do next. 70% will stall.
   Fix: sticky 3-item post-onboarding checklist on dashboard.

7. HIGH — Mobile: analytics charts unreadable at 390px.
   "Who's next" buried behind chart blob.
   Fix: mobile-default "Hoy" view with appointment list.
═══════════════════════════════════════════════════════════════
```

**Design Litmus Scorecard:**
```
═══════════════════════════════════════════════════════════════
  Dimension                           Score  Issues
  ──────────────────────────────────── ─────── ─────────────────
  1. Information Hierarchy             4/10   Dashboard wrong default
  2. Interaction State Coverage        4/10   Loading/error gaps
  3. User Journey Coherence            6/10   Onboarding falls off cliff
  4. AI Slop Risk                      8/10   Domain-specific, not generic
  5. Design System Alignment           7/10   Consistent but undocumented
  6. Responsive Intention              5/10   Mobile charts problem
  7. Accessibility Basics              6/10   Unknown — not in plan
  ────────────────────────────────────────────────────────────
  Overall:                             5.7/10
═══════════════════════════════════════════════════════════════
```

---

### Design Pass 1: Information Architecture

**Dashboard hierarchy is inverted.**

What the doctor does 10x per day: "Who's next? Open chart. Write note. Print prescription."
What the dashboard shows: 6-month analytics charts with bar charts, line charts, donut charts.

```
CURRENT HIERARCHY (wrong):
  Resumen IA
    ├── Bar chart: appointments by type (last 6 months)
    ├── Line chart: growth trend
    ├── Donut chart: appointment status
    └── Analytics insights (AI-generated summary)

NEEDED HIERARCHY (for daily workflow):
  Hoy — [date]
    ├── [09:00] Juan Pérez — Cardiología → [Ver ficha] [Nueva atención]
    ├── [10:30] María García — Endocrinología → [Ver ficha] [Nueva atención]
    └── [+ Agregar cita] [Ver agenda completa]
  Reportes (separate tab/page)
    └── Current analytics content
```

**Auto-decided: Add "Hoy" view as dashboard default, move analytics to `/analytics` (which already exists!).** The analytics page already exists at `src/app/(doctor)/analytics/page.tsx`. The dashboard just needs to show today's appointments first. (P5 — explicit over clever, minimal change.)

---

### Design Pass 2: Interaction State Coverage

| SCREEN | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL |
|--------|---------|-------|-------|---------|---------|
| Dashboard "Hoy" | Needs skeleton | Needs "Sin citas hoy + Agregar cita" | Unknown | OK | — |
| Sara AI chat | **MISSING** | OK | Unknown | OK | — |
| Prescription PDF | — | — | **SILENT FAILURE** | OK | — |
| Marketing autopilot | Unknown | OK | **SILENT TOKEN EXPIRY** | OK | — |
| Onboarding step save | Has loading | N/A | Has error message | Redirects | — |
| Upgrade page | — | — | — | Redirects to Hotmart | — |

**Critical gaps auto-decided to add to plan:**
1. Sara AI chat: streaming indicator (typing dots) on submit — P1
2. Prescription PDF: error toast with retry — P1
3. Marketing autopilot: Resend email on token expiry — P1

---

### Design Pass 3: User Journey Coherence

**Emotional arc — current:**
```
Register → Onboarding (3 steps) → Dashboard (empty charts) → [STALL]
                                                 ↑
                                    No clear "next action" signal
```

**Emotional arc — desired:**
```
Register → Onboarding (3 steps) → Dashboard (Hoy + checklist) → First patient → First note → First prescription
                                          ↑
                               Sticky 3-item checklist:
                               ✓ Completa tu perfil
                               □ Agrega tu primer paciente
                               □ Conecta Instagram (Sara te ayuda con el marketing)
```

The third checklist item surfaces the marketing differentiator on day 1. This is the "Sara posts for you" hook in action.

---

### Design Pass 4: AI Slop Risk

**Score: 8/10 — LOW RISK.**

The insurance catalog, ICD-11 search, exam order categories, Sara FAB — these are domain-specific, thoughtful, and can't be confused with AI-generated generics. The dashboard analytics section approaches "generic SaaS dashboard" territory but the clinical specificity saves it.

**Slop risk:** The upgrade page cards are generic two-column pricing cards. Low priority but could be more medical-specific.

---

### Design Pass 5: Design System Alignment

**Existing system (from Tailwind config):**
- Font: Inter
- Primary: #2563EB (blue)
- Secondary: #0D9488 (teal)
- Accent: #25D366 (WhatsApp green)
- Gradients: gradient-primary, gradient-hero, gradient-cta
- Shadow: glow (blue glow)

**Gaps:**
- No DESIGN.md — decisions live only in Tailwind config and component patterns
- Inconsistency: PlanGate uses inline SVG icon, other screens use Lucide. Standardize on Lucide.
- Billing page uses `Receipt` icon label but billing is via Hotmart, not in-app. Label confusion.

**Auto-decided: Create DESIGN.md with the above as the documented system.** (P1 — completeness)

---

### Design Pass 6: Responsive Intention

**Mobile bottom tab bar (5 items):** Correct pattern, well-implemented.

**Mobile dashboard problem:** 6-month chart trio renders at ~300px width on mobile. Unreadable. The "Hoy" dashboard fix solves this — appointment list is naturally mobile-friendly.

**Form inputs on mobile:** Patient creation, prescription creation — these have many fields. Unknown if inputs have `inputMode` and `autocomplete` attributes for mobile keyboards. Should audit.

**Auto-decided: Dashboard "Hoy" default fixes the most critical mobile issue.** (P5 — one change, multiple gains)

---

### Design Pass 7: Accessibility Basics

**Not specified in the plan.** Key checks to add:
- Color contrast: primary #2563EB on white passes AA (4.5:1). Teal #0D9488 on white: need to verify.
- Touch targets: bottom tab bar icons — need ≥44px tap targets.
- Keyboard nav: unknown if modals and drawers are focus-trapped.
- Screen readers: `aria-label` on icon-only buttons needed.

**Auto-decided: Add accessibility audit to the plan's definition of done.** (P1 — completeness)

---

### Design ASCII Wireframe: Dashboard "Hoy" View (proposed)

```
┌─────────────────────────────────────────────────────────┐
│  Sara Medical                           Dr. Juan Riofrio │
│  ──────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📋 Para empezar                        [✕]     │   │
│  │  ✅ Completa tu perfil                          │   │
│  │  □  Agrega tu primer paciente                   │   │
│  │  □  Conecta Instagram con Sara                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Hoy — Jueves 10 de abril                               │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 09:00  María García       Seguimiento            │  │
│  │        Cardiología        [Ver ficha] [Atender]  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 10:30  Carlos López       Primera consulta       │  │
│  │        Endocrinología     [Ver ficha] [Atender]  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ + Agregar cita                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [Resumen IA →]  [Últimos pacientes →]                  │
└─────────────────────────────────────────────────────────┘
```

---

### Design Decision Audit (Phase 2)

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 9 | Design | Dashboard default → "Hoy" appointment list | Mechanical | P5 | Analytics exist at /analytics already; daily workflow needs today's list | Keep analytics as default |
| 10 | Design | Post-onboarding checklist (3 items) on dashboard | Mechanical | P1 | Prevents new-doctor stall; surfaces marketing hook on day 1 | No checklist |
| 11 | Design | Sara AI typing indicator on submit | Mechanical | P1 | 1-3s blank = duplicate submissions | None |
| 12 | Design | Prescription PDF error toast + retry | Mechanical | P1 | Silent failure = doctor can't work | None |
| 13 | Design | Marketing token expiry email (Resend) | Mechanical | P1 | Posts stop without notification | None |
| 14 | Design | Create DESIGN.md with documented system | Mechanical | P1 | Decisions live only in Tailwind config | None |

---

## Phase 2 Transition Summary

Phase 2 complete. Design subagent: 7 issues (2 critical, 5 high). No Codex [subagent-only].
Overall design score: 5.7/10 → target 8/10 after fixes.
Key issues: dashboard hierarchy inverted, upgrade funnel weak, 3 silent failure states.
All issues auto-decided using P1/P5. No taste decisions.
Passing to Phase 3 (Eng Review).

---

## Phase 3: Eng Review

### Step 3A: Scope

102 API route files across `src/app/api/`. Production system with PM2, no CI, no tests.
Eng review focus: security, performance, schema, error handling, deploy safety.
Subagent: Claude (independent, no prior context). Codex: not available.

---

### Step 3B: Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        Browser / Mobile                            │
└────────────────────────┬───────────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼───────────────────────────────────────────┐
│              Next.js 14 App Router (PM2, port 3001)                │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Server Components│  │  API Routes       │  │  Middleware      │  │
│  │  (app/ RSC)      │  │  /api/**          │  │  Rate limit      │  │
│  │  Supabase SSR    │  │  Prisma ORM       │  │  (in-memory Map) │  │
│  └──────────────────┘  └────────┬─────────┘  └─────────────────┘  │
│                                 │                                  │
│  ┌──────────────────────────────▼──────────────────────────────┐   │
│  │                     Auth Layer                              │   │
│  │  createClient() → getUser() → getDoctorFromUser(user.id)    │   │
│  │  doctor_id ALWAYS from JWT — never from request body        │   │
│  └──────────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────────┼──────────────────────────────────┘
                                  │
              ┌───────────────────┴───────────────────┐
              │                                       │
┌─────────────▼──────────────┐          ┌─────────────▼──────────────┐
│  Supabase Postgres (prod)  │          │  Supabase Auth (JWT)       │
│  Prisma ORM                │          │  RLS policies (partial)    │
│  prisma db push (no migr.) │          │  service-role: admin.ts    │
│  Soft deletes (LOPDP)      │          └────────────────────────────┘
│  Cascade deletes           │
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│  External Services         │
│  Anthropic API (Sara AI)   │
│  Hotmart (billing links)   │
│  Meta OAuth / LinkedIn     │
│  n8n webhooks (secret OK)  │
│  Resend (emails)           │
└────────────────────────────┘
```

**Data flow (happy path — doctor creates prescription):**
1. Browser POST `/api/prescriptions` with `{ patientId, medications, ... }`
2. Middleware: rate limit check (in-memory, 30/min for prescriptions tier)
3. API route: `createClient()` → `getUser()` → `getDoctorFromUser()` → doctor.id from JWT
4. Prisma: `prescription.create({ doctorId: doctor.id, ... })` — doctorId never from body
5. Prisma: `doctor.update({ rxCount: { increment: 1 } })` in transaction
6. Return `{ prescription }` with PDF generation trigger

---

### Step 3C: Security Review

| Vector | Status | Finding |
|--------|--------|---------|
| IDOR — doctor_id | **SECURE** | All sampled routes (patients, prescriptions, exam-orders, appointments) extract `doctor_id` from JWT via `getDoctorFromUser(user)`. Never from request body. |
| Stored XSS | **MODERATE RISK** | No `isomorphic-dompurify` in dependencies. `SaraChatPanel.tsx` uses custom `renderMarkdown()` with HTML entity escaping + `dangerouslySetInnerHTML`. AI output path: Anthropic SDK → `renderMarkdown()` → display. If Anthropic returns HTML tags, custom escaping may be bypassed. |
| Webhook secrets | **GOOD** | n8n/leads webhook validates `x-webhook-secret` header. No Hotmart webhook exists (billing is manual SQL). |
| Service-role key | **GOOD** | `admin.ts` is server-only, throws if env vars missing, never exposed to client. |
| Rate limiting | **BROKEN AT SCALE** | `middleware.ts` in-memory `Map<string, RateLimitEntry>` — works for single PM2 process but resets on restart and breaks under horizontal scale. Each process has its own counter. |
| SQL injection | **SAFE** | Prisma ORM parameterizes all queries. No raw SQL found in sampled routes. |

**Critical (2):**
1. **Stored XSS via AI output** — AI responses rendered with `dangerouslySetInnerHTML` through custom entity escaping only. DOMPurify missing. Auto-decide: add `isomorphic-dompurify` server-side before any AI content render.
2. **In-memory rate limit** — breaks under PM2 multi-process. Auto-decide: replace with Redis-based rate limit or use Upstash Redis (free tier sufficient).

---

### Step 3D: Performance Review

| Area | Status | Finding |
|------|--------|---------|
| Pagination | **GOOD** | `/api/patients`: `Math.min(50, limit)`, default 20. Prescriptions, exam-orders: same pattern. No unbounded SELECT *. |
| N+1 queries | **MINIMAL** | Patients route uses `Promise.all()` for patients + count in parallel. Patient detail fetches nested appointments (take: 10) + medicalRecords (take: 5) in single Prisma query. |
| Dashboard | **SEQUENTIAL RISK** | Dashboard page (`force-dynamic`) fetches multiple aggregates. Need to verify parallelization via `Promise.all`. |
| Indexes | **EXCELLENT** | All FK columns indexed. Doctor: `slug`, `email`, `referralCode`. Patient: `doctorId`, `name`, `deletedAt`. Appointment: `doctorId`, `patientId`, `doctorId+date`, `status`. |
| Connection pool | **UNKNOWN** | Prisma with Supabase on Vercel/PM2 needs connection pooling. `DATABASE_URL` should use PgBouncer/Supavisor URL. Check env config. |

---

### Step 3E: Schema Review

**Strengths:**
- Cascade deletes properly configured (Doctor→Patient, Patient→MedicalRecord, Patient→Prescription)
- Soft deletes with `deletedAt` + `deletedBy` + `retentionUntil` (LOPDP compliance, 15-year retention)
- Comprehensive FK indexes on all relationship columns
- Composite indexes for common query patterns (`doctorId + date`, `doctorId + name`)

**Risks:**
- `prisma db push` (not `prisma migrate`) — schema changes are not versioned. No migration history. If schema diverges between local and prod, `db push` can silently drop data. **This is the highest-risk deploy pattern for a production system.**
- No `prisma migrate` history means no rollback story if a bad push goes through.

---

### Step 3F: Error Handling Review

**Coverage: ADEQUATE**
- All sampled API routes wrapped in try/catch.
- Return `500` with `{ error: 'message' }` on failure. No stack traces leaked.
- Prescriptions POST intentionally returns `200` on error (n8n retry logic) — acceptable but undocumented.

**Gaps:**
- No structured error codes (`{ error: { code, message } }`). Client can't distinguish "patient not found" from "DB down".
- No Sentry or equivalent — zero production observability. First sign of a bug is a doctor calling.

---

### Step 3G: Test Review

**Status: ZERO coverage**
- No `test/`, `__tests__/`, `*.test.ts`, `*.spec.ts` files found anywhere.
- `package.json`: no test runner configured (no jest, vitest, mocha scripts).
- Zero automated coverage for security, regression, or integration.

**Test Plan (minimum viable):**

```
TIER 1 — Security (run before any deploy that touches auth or data)
  □ test/security/doctor-isolation.test.ts
      - Doctor A cannot GET /api/patients?doctorId=doctorB
      - Doctor A cannot POST /api/prescriptions with patientId from doctorB
      - Doctor A cannot DELETE /api/patients/[id] belonging to doctorB
  □ test/security/rls.test.ts (pgTAP or Prisma test client)
      - Direct DB queries with wrong doctorId are rejected

TIER 2 — Core flows (run on every PR)
  □ test/api/prescriptions.test.ts — create, list, pagination
  □ test/api/patients.test.ts — create, search, soft-delete
  □ test/api/appointments.test.ts — create, today's list

TIER 3 — Integration (run nightly)
  □ test/integration/sara-ai.test.ts — AI response sanitization check
  □ test/integration/billing.test.ts — plan upgrade flow
```

---

### Step 3H: Deploy Safety

| Check | Status | Finding |
|-------|--------|---------|
| CI/CD | **NONE** | No `.github/workflows/`. Zero automated checks pre-merge. |
| Auto-migrations | **SAFE** | `postinstall` runs `prisma generate` only. `db:push` is manual. No auto-migration in deploy. |
| Build gate | **WEAK** | `npm run build` gates on TypeScript compilation. No lint, no test, no type coverage check. |
| PM2 config | **SINGLE PROCESS** | If multi-process PM2 (`cluster` mode), rate limiting breaks silently. |
| Rollback | **MANUAL** | No `prisma migrate` history = no rollback. Schema changes are one-way. |

---

### Eng Decision Audit (Phase 3)

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 15 | Eng | Add `isomorphic-dompurify` to sanitize AI output before dangerouslySetInnerHTML | Mechanical | P1 | AI output rendered with custom entity escaping only — bypass risk via Anthropic HTML output | Leave current escaping |
| 16 | Eng | Add Sentry (free tier) for production error monitoring | Mechanical | P5 | Zero observability = first sign of production bug is a doctor calling | Stay blind |
| 17 | Eng | Add GitHub Actions CI: typecheck + lint on PR | Mechanical | P5 | No automated gate = type errors and lint failures ship to production | Manual-only gates |
| 18 | Eng | Security test: doctor isolation (Tier 1 tests) as first test suite | Mechanical | P1 | IDOR is the highest-risk pattern for multi-doctor system; must be tested before scaling | UI tests first |
| 19 | Eng | Plan migration path from `prisma db push` → `prisma migrate` for schema versioning | Mechanical | P5 | Current pattern has no rollback story; one bad push can silently drop data | Accept current risk |
| 20 | Eng | Rate limiting: replace in-memory Map with Upstash Redis (free tier) | Mechanical | P5 | Current rate limit resets on PM2 restart, breaks under multi-process — security gap | Accept current pattern |

---

### Phase 3 Transition Summary

Phase 3 complete. Subagent: Claude (independent). Codex: not available.
Security: doctor_id from JWT (GOOD), XSS via AI output (MODERATE — DOMPurify gap), rate limit (BROKEN at scale).
Performance: GOOD (pagination enforced, indexes solid). Schema: EXCELLENT (cascade, soft-delete, LOPDP).
Tests: ZERO — critical gap. Deploy: no CI, manual prisma db push, no rollback story.
6 decisions auto-applied (mechanical, P1/P5). No taste decisions.
Passing to Phase 3.5 (DX Review — 102 API routes detected).

---

## Phase 3.5: DX Review

### Step 3.5A: Scope

102 API route files. External integrations: Anthropic, Hotmart, Meta OAuth, LinkedIn, n8n, Resend.
DX review focus: API naming, error quality, documentation, TTHW for new doctor onboarding.

---

### Step 3.5B: API Naming Consistency

```
GOOD — REST conventions followed:
  GET    /api/patients                → list
  GET    /api/patients/[id]           → detail
  POST   /api/patients                → create
  PATCH  /api/patients/[id]           → update
  DELETE /api/patients/[id]           → delete

INCONSISTENT — mixed verbs:
  POST   /api/sara/ask                → verb in path (action-oriented, acceptable for AI)
  POST   /api/marketing/generate      → verb in path (acceptable for generation endpoints)
  GET    /api/admin/doctors           → admin namespace separate from doctor namespace (good)

MISSING — no versioning:
  /api/patients vs /api/v1/patients
  No version prefix. If breaking change needed, no migration path.
```

---

### Step 3.5C: Error Quality

Current pattern: `{ error: "Internal server error" }` (string only).

For external developers or future SDK consumers, this requires string matching to handle errors.
Better: `{ error: { code: "PATIENT_NOT_FOUND", message: "...", statusCode: 404 } }`.

Gap: No error code enum defined anywhere. This is low priority for current scale (doctor using UI), but matters when building the patient portal or mobile app.

---

### Step 3.5D: TTHW (Time To Hello World)

A new developer joining the project today:
```
1. Clone repo                            → OK (git clone)
2. Install deps                          → OK (npm install, prisma generate runs)
3. Configure env vars                    → BLOCKED: .env.example not found. Developer must
                                           ask team what vars to set. ~15 mins of friction.
4. Run migrations                        → BLOCKED: prisma db push needs live Supabase URL
                                           with schema write access. No local dev DB setup.
5. Start dev server                      → npm run dev works once env is set
6. Make first API call                   → OK (docs in code are adequate for reading)
```

**Key TTHW gap:** No `.env.example`. A new developer cannot start without asking for env vars. Medium friction — fixable in 5 minutes.

---

### DX Decision Audit (Phase 3.5)

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 21 | DX | Create `.env.example` with all required vars (no secrets, just keys) | Mechanical | P5 | New developer TTHW blocked without it; 5-minute fix | Accept friction |
| 22 | DX | No API versioning needed at current scale | Mechanical | P3 | 1 consumer (doctor UI). Add versioning when building public API or mobile SDK | Add /api/v1 now |

---

### Phase 3.5 Transition Summary

Phase 3.5 complete. 102 API routes, no versioning, consistent REST naming.
TTHW blocker: missing `.env.example`. Error format: string-only (acceptable at current scale).
2 decisions auto-applied. No taste decisions.
Passing to Phase 4 (Final Approval Gate).

---

## Phase 4: Final Approval Gate

### Taste Decisions (require user input)

None accumulated across Phase 1-3.5. All decisions were mechanical (P1/P5 or P3 pragmatic).

### User Challenges accumulated

None.

### Full Decision Audit (all 22 decisions)

| # | Phase | Decision | Classification |
|---|-------|----------|----------------|
| 1 | CEO | Goal: first digital payment + $500 MRR (not headcount) | **USER CONFIRMED** |
| 2 | CEO | GTM: lead with marketing autopilot as product hook | **USER CONFIRMED** |
| 3 | CEO | Hotmart billing is manual — no webhook currently | Mechanical |
| 4 | CEO | Approach B (Growth Stack): Stripe webhook + Sentry + pricing page + referral | Mechanical |
| 5 | CEO | stripe package exists in package.json but unused — may be vestigial | Mechanical |
| 6 | CEO | Add /pricing page (SEO-indexed, plan comparison) | Mechanical |
| 7 | CEO | Hotmart webhook auto-activation (not Stripe) for LatAm billing | Mechanical |
| 8 | CEO | Onboarding step 3 redirect: → "Hoy" dashboard, not analytics | Mechanical |
| 9 | Design | Dashboard default → "Hoy" appointment list (not analytics) | Mechanical |
| 10 | Design | Post-onboarding checklist (3 items) on dashboard day 1 | Mechanical |
| 11 | Design | Sara AI typing indicator on submit | Mechanical |
| 12 | Design | Prescription PDF error toast + retry | Mechanical |
| 13 | Design | Marketing token expiry email (Resend) | Mechanical |
| 14 | Design | Create DESIGN.md with documented system | Mechanical |
| 15 | Eng | Add `isomorphic-dompurify` for AI output sanitization | Mechanical |
| 16 | Eng | Add Sentry (free tier) | Mechanical |
| 17 | Eng | GitHub Actions CI: typecheck + lint on PR | Mechanical |
| 18 | Eng | Security test suite: doctor isolation as first tests | Mechanical |
| 19 | Eng | Plan migration from `prisma db push` → `prisma migrate` | Mechanical |
| 20 | Eng | Rate limiting: Upstash Redis to replace in-memory Map | Mechanical |
| 21 | DX | Create `.env.example` | Mechanical |
| 22 | DX | No API versioning at current scale | Mechanical |

### Implementation Priority (ranked by business impact)

```
WEEK 1 — Revenue (directly unblocks $500 MRR goal):
  P0: Hotmart webhook → auto plan activation (replaces manual SQL)
  P0: /pricing page (SEO + conversion)
  P0: Dashboard → "Hoy" as default (daily workflow fix)

WEEK 2 — Reliability (keeps doctors trusting the product):
  P1: isomorphic-dompurify (clinical notes XSS — patient data at risk)
  P1: Sentry free tier (first observability)
  P1: Doctor isolation test suite (Tier 1 security)
  P1: .env.example (onboarding new devs)

WEEK 3 — Growth (builds referral loop):
  P2: Post-onboarding checklist on dashboard
  P2: Marketing token expiry email (Resend)
  P2: GitHub Actions CI (lint + typecheck)
  P2: Redis rate limiting (Upstash free tier)

DEFERRED:
  - prisma migrate migration (low urgency, medium risk to change)
  - Structured error codes (matters at mobile SDK scale)
  - Full automated test suite (build Tier 1 first, then expand)
```

### Not in scope (explicitly excluded)

- WhatsApp-native interface (deferred post-Phase 1)
- Mobile app (web is sufficient for current scale)
- FHIR R4 / ARCO compliance (built, not actively used — don't expand)
- Admin panel changes (invisible to doctor, not growth-critical)
- Billing module redesign (Hotmart webhook is the only needed change)

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 2 | complete | 8d update: billing infra done, next = ventas; credits congelados; WA funnel aprobado |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | unavailable | Codex CLI no instalado |
| Design Review | `/plan-design-review` | UI/UX gaps | 2 | complete | 2 críticos: precio inconsistente + sin post-pago state. Score 6.6/10 |
| Eng Review | `/plan-eng-review` | Architecture & tests | 2 | complete | NOWPayments sig bypass (MEDIUM, 1-line fix); nuevo código seguro |
| DX Review | `/plan-devex-review` | DX gaps | 2 | complete | .env.example incompleto para nuevas vars |

**VERDICT (2026-04-18):** COMPLETE — 37 decisions (34 auto-applied, 3 user-confirmed, 1 taste pending). Next action: arreglar 5 bloqueadores demo (2-3h) → 5 demos en vivo → primer pago.

---

## UPDATED REVIEW — 2026-04-18 (Re-autoplan)

**Branch:** main | **Commit:** 10ca0d5 | **Reviewer:** [subagent-only, Codex unavailable]

### Implementation Scorecard (8 days since last review)

| Item | Plan Priority | Status |
|------|--------------|--------|
| Hotmart webhook → auto plan activation | P0 | ✅ DONE |
| /pricing page | P0 | ✅ DONE |
| Dashboard "Hoy" as default | P0 | ✅ DONE |
| isomorphic-dompurify (XSS) | P1 | ✅ DONE |
| Sentry error monitoring | P1 | ✅ DONE |
| Doctor isolation security tests | P1 | ✅ DONE |
| .env.example | P2 | ✅ DONE |
| Upstash Redis rate limiting | P2 | ✅ DONE |
| GitHub Actions CI (typecheck + lint) | P2 | ✅ DONE |
| Token expiry + trial expiry workflows | P2 | ✅ DONE |
| **Credits system (kie.ai)** | NOT IN PLAN | ⚠️ NEW SCOPE |
| **MercadoPago + NOWPayments + Hotmart cards** | NOT IN PLAN | ⚠️ NEW SCOPE |
| **WhatsApp Nexus WA** | NOT IN PLAN | ⚠️ NEW SCOPE |
| **Notification bell** | NOT IN PLAN | ✅ NEW |
| Post-onboarding checklist | P2 | ❓ UNVERIFIED |
| prisma db push → migrate | DEFERRED | ❌ PENDING |

**Execution velocity:** All P0/P1/P2 plan items completed in 8 days + significant new scope.

---

### Phase 1 UPDATE: CEO Review (2026-04-18)

**Mode:** SELECTIVE EXPANSION — same product, new inflection point.

**CLAUDE SUBAGENT (CEO — strategic independence):**
```
════════════════════════════════════════════════════════════════
1. CRITICAL — STOP BUILDING, START SELLING.
   Billing infra is done. Next 8 days: zero new features.
   Run 5 live demos with real doctors, watch them hit the
   paywall, fix whatever breaks in the checkout flow.
   No amount of code closes a sales evidence gap.

2. CRITICAL — 6-MONTH REGRET SCENARIO.
   8 integrations, 4 payment processors, 0 verified self-serve
   paying doctors. The original surgeon still on manual SQL plan.
   The window to validate self-serve in this market is NOW.

3. CRITICAL — COMPETITIVE WINDOW IS 6-9 MONTHS, NOT 12.
   Doctoralia has 3,000+ Ecuador doctors and $80M raised.
   If they see AI marketing traction, they clone it in a sprint.
   Stop building calendar features. Measure whether existing
   ones are used (add analytics events). Then decide.

4. HIGH — CREDITS SYSTEM IS SCOPE CREEP.
   Subscription model has zero confirmed payments. Adding a
   consumption billing model in parallel = confused prospects
   + support nightmare. Freeze until 10 subscription payments
   confirmed.

5. HIGH — WHATSAPP ONBOARDING FUNNEL IS THE REAL GTM MOVE.
   Ecuador doctors live on WhatsApp. Reuse Nexus WA already
   built: doctor texts a number → Sara walks them through signup.
   Converts cold referrals at 3-5x vs. web form. 1 week of work.
════════════════════════════════════════════════════════════════
```

**CEO CONSENSUS TABLE (2026-04-18):**
```
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   WARN    N/A    WARN
  2. Right problem to solve?           WARN    N/A    WARN
  3. Scope calibration correct?        WARN    N/A    WARN [credits]
  4. Alternatives sufficiently explored?WARN   N/A    WARN [WA funnel]
  5. Competitive/market risks covered? WARN    N/A    WARN [6-9mo window]
  6. 6-month trajectory sound?         WARN    N/A    WARN
═══════════════════════════════════════════════════════════════
NOTE: Single-model review [subagent-only]. All WARNs are strategic,
not architectural — the code quality is excellent.
```

**PREMISE GATE CONFIRMED (2026-04-18):**

P_NEW_1 ✅ USER CONFIRMED — "Ventas primero: cero features nuevas, 5 demos en vivo, arreglar lo que falle en checkout."
P_NEW_2 ✅ USER CONFIRMED — "Credits system congelado hasta 10 pagos de suscripción confirmados."
P_NEW_3 ✅ USER CONFIRMED — "WhatsApp onboarding funnel (Nexus WA) = mayor palanca GTM. Construir."

---

---

### Phase 2 UPDATE: Design Review (2026-04-18)

**Focus:** Checkout/upgrade UX para el objetivo "primer pago en 8 días."
**Initial rating:** 6/10 — funnel está conectado, pero tiene dos bloqueadores de conversión críticos.

**CLAUDE SUBAGENT (design — independent review):**
```
════════════════════════════════════════════════════════════════
CRITICAL:
1. PRECIO INCONSISTENTE: /pricing muestra $29/mes,
   /upgrade muestra $24/mes. Un médico que ve ambas páginas
   pierde confianza inmediata. Fix: alinear precios O agregar
   "Precio exclusivo para usuarios registrados" en /upgrade.

2. SIN ESTADO DE ÉXITO POST-PAGO: Hotmart redirige de vuelta
   y el médico llega al dashboard sin confirmación. Si el
   webhook tarda, el médico cree que el pago falló.
   Fix: /upgrade?success=1 con "Activando tu cuenta Pro..."
   + auto-refresh cada 5s hasta que plan === PRO.

HIGH:
3. CTA mensual con estilo ghost (outline), el anual con botón
   lleno. El médico promedio no ve una acción clara.
   Fix: hacer el CTA mensual también sólido (bg-primary).

4. Cero prueba social. Ningún médico real, ninguna foto, ningún
   nombre. Un cirujano de 55 años pagando digital por primera
   vez necesita "Dr. X, Quito, Cirujano: 'Publico sin tocar
   el teléfono.'" Fix: un testimonio real encima del FAQ.

5. Sin badge de seguridad near CTA: "Pago seguro vía Hotmart
   · Soporte inmediato" + ícono candado.

MEDIUM:
6. Sin urgencia (el badge "70% OFF" no tiene deadline).
7. Badge "Mejor oferta" se clipea en pantallas de 375px.
════════════════════════════════════════════════════════════════
```

**Design Litmus Scorecard (2026-04-18):**
```
═══════════════════════════════════════════════════════════════
  Dimension                           Score  Issues
  ──────────────────────────────────── ─────── ─────────────────
  1. Information Hierarchy             7/10   CTA mensual débil
  2. Interaction State Coverage        4/10   Sin post-pago state ← CRITICAL
  3. User Journey Coherence            5/10   Precio inconsistente ← CRITICAL
  4. AI Slop Risk                      9/10   Domain-specific, excelente
  5. Design System Alignment           8/10   Consistente
  6. Responsive Intention              7/10   Badge clip en 375px
  7. Accessibility Basics              6/10   No verificado
  ────────────────────────────────────────────────────────────
  Overall: 6.6/10 → target 8.5/10 (arreglar 2 críticos = +2pts)
═══════════════════════════════════════════════════════════════
```

**Auto-decided (Phase 2 Design):**
| # | Decision | Classification | Principle |
|---|----------|----------------|-----------|
| 27 | Agregar /upgrade?success=1 con spinner + auto-refresh hasta PRO | Mechanical | P1 |
| 28 | Alinear precios /pricing y /upgrade (o explicar descuento in-app) | Mechanical | P5 |
| 29 | CTA mensual → botón sólido bg-primary (no ghost) | Mechanical | P5 |
| 30 | Badge de seguridad debajo de cada CTA | Mechanical | P5 |
| 31 | Agregar urgencia: "Precio de lanzamiento hasta [fecha]" | Mechanical | P3 |
| **32** | **Testimonio real de médico** | **TASTE DECISION** | **P1** |

⚠️ **TASTE DECISION #32:** Testimonio real requiere que el usuario provea una cita de un médico real con foto/nombre/especialidad. No puede ser auto-decidido.

---

---

### Phase 3 UPDATE: Eng Review (2026-04-18)

**Focus:** Nuevo código — payment processors, credits, WhatsApp, file upload.
**Previous gaps CLOSED:** DOMPurify ✅, Sentry ✅, Redis rate limiting ✅, doctor isolation tests ✅, GitHub Actions CI ✅

**Architecture update — nuevos componentes:**
```
/api/webhooks/
  ├── hotmart/      → plan activation (SECURE: signature validation ✅)
  ├── mercadopago/  → credit top-up (LOW: re-fetch from MP API mitigates no-sig ✅)
  ├── nowpayments/  → crypto top-up (MEDIUM: sig bypass if header absent ⚠️)
  └── nexus/        → WhatsApp admin notification

/api/marketing/credits/ → balance + transactions (READ-ONLY, scoped to JWT ✅)
/api/marketing/posts/upload/ → image upload (auth ✅, MIME allowlist ✅, 10MB cap ✅)
```

**Security findings (Phase 3):**

| Vector | Status | Finding |
|--------|--------|---------|
| NOWPayments sig | **MEDIUM** | `if (!sig)` missing — bypass possible without header. Fix: `if (!sig) return 401` |
| MercadoPago sig | Low (mitigated) | Re-fetches from MP API server-side. Acceptable pattern. |
| Credits API | SAFE | Read-only, scoped to JWT doctor. No self-credit possible. |
| File upload | Low | Extension from `file.name` (user-controlled). Cosmetic, not exploitable. |
| WhatsApp | SAFE | Solo admin notifications, no PHI sent to Nexus WA. |
| Hotmart webhook | SECURE | X-Hotmart-Hottok validation + idempotent event handling. |

**Tests (Phase 3):**
- `test/security/doctor-isolation.test.ts` — vitest mocks, Tier 1 IDOR tests. ✅ EXISTS
- Credits system, payment webhooks: ZERO test coverage.

**Auto-decided (Phase 3 Eng):**
| # | Decision | Classification | Principle |
|---|----------|----------------|-----------|
| 33 | NOWPayments: add `if (!sig) return 401` before HMAC check | Mechanical | P1 |
| 34 | File upload: derive ext from MIME map, not filename | Mechanical | P5 |
| 35 | Add tests for credit top-up flows (NOWPayments, MercadoPago) | Mechanical | P1 |

---

### Phase 3.5 UPDATE: DX Review (2026-04-18)

**Focus:** .env.example completeness after new payment/WhatsApp scope.

**TTHW gap:** `.env.example` existe pero está INCOMPLETO.

```
PRESENTE en .env.example:     FALTANTE en .env.example:
HOTMART_PRODUCT_ID_MONTHLY    MERCADOPAGO_ACCESS_TOKEN
HOTMART_PRODUCT_ID_ANNUAL     NOWPAYMENTS_API_KEY
HOTMART_PRODUCT_ID_ENTERPRISE NOWPAYMENTS_IPN_SECRET
HOTMART_HOTTOK                NEXUS_WA_URL
                              NEXUS_WA_TOKEN
                              NEXUS_WA_ADMIN_PHONE
                              KIE_AI_API_KEY (o equivalente)
                              MERCADOPAGO_WEBHOOK_SECRET (si existe)
```

Un desarrollador nuevo puede configurar suscripciones Hotmart pero no puede configurar pagos de créditos, WhatsApp, ni generación de imágenes.

**Auto-decided (Phase 3.5 DX):**
| # | Decision | Classification | Principle |
|---|----------|----------------|-----------|
| 36 | Completar .env.example con todas las vars de pagos, WA y kie.ai | Mechanical | P5 |
| 37 | No API versioning — 1 consumidor (doctor UI), same as before | Mechanical | P3 |

---

---

## Phase 4: Final Approval Gate (2026-04-18)

### Plan Summary
El equipo completó todos los P0/P1/P2 del plan original en 8 días y además construyó un sistema completo de créditos (kie.ai), tres procesadores de pago (Hotmart, MercadoPago, NOWPayments), integración WhatsApp, y notificaciones. El billing funnel está 100% conectado end-to-end. La restricción para $500 MRR ya NO es código — es evidencia de ventas. El siguiente sprint es demos en vivo + funnel WhatsApp.

### Decisions Made: 37 total (34 auto-decided, 3 user-confirmed premises, 1 taste pending)

### Taste Decisions (require your input)

**Choice #32: Testimonio real en /upgrade y /pricing**
I recommend agregar un testimonio de un médico real (foto, nombre, ciudad, especialidad, cita de 2 frases) — más poderoso que 4 stats tiles.

**Pero necesito el contenido de ti:** ¿Tienes un médico (el cirujano fundador u otro) que pueda dar una cita como "Publico en Instagram sin tocar el teléfono"? Una foto y 2 frases convierte más que cualquier feature bullet. Completeness A: 10/10 (real human). B: 6/10 (stats tiles generics).

### Auto-Decided Summary

| Phase | Decisions | Key Items |
|-------|-----------|-----------|
| CEO | 8 (original) + 4 update | Approach B confirmado, creditos congelados, WA funnel aprobado |
| Design | 6 (original) + 6 update | Post-pago state, precio consistente, CTA mensual primario |
| Eng | 6 (original) + 3 update | NOWPayments sig fix, extensión archivo desde MIME |
| DX | 2 (original) + 2 update | .env.example completar, no versioning |

### Review Scores (2026-04-18)

- **CEO:** WARN (estratégico) — ejecución excelente, siguiente restricción es ventas no código
- **CEO voices:** Claude subagent [subagent-only], 5/6 WARNs, ningún CONFIRM (all single-model)
- **Design:** 6.6/10 → target 8.5/10 — 2 críticos: precio inconsistente + sin post-pago state
- **Eng:** GOOD (core), MEDIUM (NOWPayments sig bypass) — 1 fix de 1 línea
- **DX:** 7/10 — .env.example incompleto para nuevas vars de pagos/WA

### Cross-Phase Themes

**Tema 1: "El demo puede fallar en el momento clave"** — flagged en Design (precio inconsistente $29 vs $24 entre /pricing y /upgrade) y Eng (NOWPayments sig bypass). Ambas fases independientemente señalan que el checkout flow tiene gaps que podría romper el primer demo. Señal de alta confianza — arreglar ANTES de cualquier demo en vivo.

**Tema 2: "Cero evidencia de adopción real"** — CEO (ningún médico pagado vía Hotmart) y Design (sin prueba social). Ambas fases detectaron la misma ausencia. La solución no es código — es llamar al cirujano fundador y pedirle que pague en vivo esta semana.

### Implementation Priority (actualizado 2026-04-18)

```
ESTA SEMANA — Fix bloqueadores del demo (2-3 horas de código):
  P0: Alinear precios /pricing ↔ /upgrade (o explicar descuento)
  P0: Agregar /upgrade?success=1 spinner + auto-refresh hasta PRO
  P0: NOWPayments: if (!sig) return 401
  P0: CTA mensual → botón sólido (no ghost)
  P0: Badge seguridad + "Pago vía Hotmart" bajo cada CTA

ESTA SEMANA — Sales (cero código):
  Llamar a 5 médicos conocidos. Hacer demo en vivo. Observar checkout.
  Pedir al cirujano fundador que pague vía Hotmart en vivo.
  Conseguir 1 cita/testimonio real para /upgrade y /pricing.

PRÓXIMA SEMANA — WhatsApp funnel (1 semana, mayor palanca GTM):
  Médico envía WhatsApp → Sara guía registro → account creada
  Reutiliza Nexus WA ya construido

PRÓXIMA SEMANA — DX + Tests:
  Completar .env.example (vars de pagos, WA, kie.ai)
  test/security/nowpayments-sig.test.ts
  test/api/webhooks/hotmart.test.ts

CONGELADO — hasta 10 pagos de suscripción confirmados:
  Credits system (kie.ai) — ya construido, no lanzar marketing todavía
  MercadoPago / NOWPayments billing — ya construido, no promocionar

DEFERRED:
  prisma db push → migrate (pendiente desde plan original)
  Structured error codes (mobile SDK scale)
```

### Deferred to TODOS.md (si existiera)

| Item | Razón |
|------|-------|
| prisma migrate migration path | Baja urgencia, medio riesgo de cambiar |
| Structured error codes | Solo importa al escalar a mobile SDK |
| Full automated test suite (Tier 2/3) | Construir Tier 1 primero |
| WhatsApp calendar integration (más features) | Después de validar conversión del funnel existente |

---

### Updated Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 23 | CEO-UPDATE | All original P0/P1/P2 items: COMPLETE ✅ | Mechanical | — | Verified in codebase | — |
| 24 | CEO-UPDATE | Credits system: FREEZE until 10 subscription payments | USER CONFIRMED | — | Subscription has 0 confirmed payments; 2nd billing model premature | Ship now |
| 25 | CEO-UPDATE | WhatsApp onboarding funnel: BUILD IT | USER CONFIRMED | P6 | Reuses Nexus WA, 3-5x conversion vs. web form, 1 week effort | More calendar features |
| 26 | CEO-UPDATE | Next sprint = sales demos, not features | USER CONFIRMED | — | Billing infra done; constraint is sales evidence, not code | More integrations |
| 27 | Design-UPDATE | /upgrade?success=1 spinner + auto-refresh | Mechanical | P1 | Post-payment blank screen = doctor thinks payment failed | None |
| 28 | Design-UPDATE | Align prices /pricing ↔ /upgrade | Mechanical | P5 | $29 vs $24 = trust killer in live demo | Leave inconsistent |
| 29 | Design-UPDATE | Monthly CTA → solid bg-primary button | Mechanical | P5 | Ghost button = weak CTA, doctor doesn't see the action | Keep ghost |
| 30 | Design-UPDATE | Security badge below each CTA | Mechanical | P5 | LatAm doctor needs reassurance before first digital payment | None |
| 31 | Design-UPDATE | Add urgency: "Precio lanzamiento hasta [fecha]" | Mechanical | P3 | Static badge has no deadline = no action pressure | None |
| 32 | Design-UPDATE | Real doctor testimonial | **TASTE DECISION** | P1 | User must provide real doctor quote/photo | Generic stats |
| 33 | Eng-UPDATE | NOWPayments: if (!sig) return 401 | Mechanical | P1 | Missing-sig bypass allows fake credit injection | Accept risk |
| 34 | Eng-UPDATE | File upload: ext from MIME map not filename | Mechanical | P5 | Cosmetic hardening, defensible pattern | Accept current |
| 35 | Eng-UPDATE | Add NOWPayments + Hotmart webhook tests | Mechanical | P1 | Payment webhook security must be tested | None |
| 36 | DX-UPDATE | Complete .env.example (MP, NOW, Nexus, kie.ai) | Mechanical | P5 | Developer TTHW blocked for payments + WA without it | Accept friction |
| 37 | DX-UPDATE | No API versioning | Mechanical | P3 | 1 consumer (doctor UI) — same as before | /api/v1 now |
