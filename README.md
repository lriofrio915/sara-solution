# Sara Medical (MedSara) — Plataforma Médica Inteligente

SaaS médico multi-tenant para consultorios privados en LatAm (Ecuador, mercado principal). Combina gestión clínica completa con **Sara**, una asistente médica IA disponible 24/7, y un módulo de marketing con IA para redes sociales.

> **Producción**: [www.consultorio.site](https://www.consultorio.site) — deploy automático en Vercel al hacer push a `main`.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router) + TypeScript + React 19 |
| Estilos | Tailwind CSS 4 |
| Base de datos | PostgreSQL via Supabase |
| ORM | Prisma 5 |
| Autenticación | Supabase Auth (doctores) + OTP (portal de pacientes) |
| IA (Sara) | OpenRouter (DeepSeek Chat v3 por defecto) |
| IA (marketing) | OpenRouter + kie.ai (imágenes/video) + Remotion |
| PDFs | Puppeteer (@sparticuz/chromium) + firma electrónica PAdES (@signpdf, FirmaEC/BCE) |
| Pagos | Hotmart (webhook con activación automática de plan) + Stripe |
| Email | Resend |
| Rate limiting | Upstash Redis |
| Analytics / errores | PostHog |
| Deploy | Vercel |

---

## Módulos

### Núcleo clínico
- **Pacientes**: ficha, historial, controles, gráficas de signos vitales
- **Atenciones**: registro de consultas con CIE-10/ICD-11, diagnósticos, notas
- **Recetas**: numeración automática atómica, PDF firmado electrónicamente
- **Órdenes de examen**: por categoría (hematología, bioquímica, imagen, etc.)
- **Certificados médicos**: emisión y descarga con firma digital
- **Agenda**: citas, recordatorios automáticos (24h/2h antes), recepción
- **Equipo**: asistentes con permisos (incluye permiso de firma)

### Documentos firmados (AM 0009-2017)
Los PDFs de recetas, certificados y órdenes se generan server-side con Puppeteer y se firman con el certificado P12 del médico (FirmaEC/BCE). Código en `src/lib/firma-ec.ts`, `src/lib/pdf-generator.ts` y `/api/documents/[type]/[id]/download`.

### Sara IA
- Chat embebido (FAB) con memorias persistentes por médico
- Chat público por perfil de médico (`/[slug]/chat`) y agendamiento
- Registro de preguntas sin respuesta para mejora continua

### Marketing
- Generación de posts con IA: Instagram, Facebook, TikTok, LinkedIn
- Autopilot (publicación programada), calendario, librería, branding
- OAuth real con Meta y LinkedIn; video studio con Remotion

### Portal del paciente
- `/mi-salud` con acceso por OTP: citas, recetas, exámenes, certificados

### Negocio y compliance
- Admin (super-admin), leads, referidos, analytics, onboarding
- `/pricing` pública; upgrade con Hotmart
- ARCO (exportar/eliminar datos), FHIR R4, consentimientos, cifrado AES-256-GCM de tokens OAuth

---

## Planes

| Plan | Precio | Descripción |
|------|--------|-------------|
| FREE | $0 | Acceso básico (post-trial) |
| TRIAL | — | 21 días con acceso PRO completo, sin tarjeta |
| PRO_MENSUAL | $29/mes | Acceso completo |
| PRO_ANUAL | $249/año | Acceso completo |
| ENTERPRISE | $129/mes | Clínicas: multi-médico (+$20/mes por médico adicional) |

La activación automática ocurre vía webhook de Hotmart (`/api/webhooks/hotmart`).

---

## Desarrollo

### Setup

```bash
git clone git@github.com:lriofrio915/sara-solution.git
cd sara-solution
npm install
cp .env.example .env   # completar credenciales
npm run dev
```

### Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src
npm run test         # vitest (unit + integración + seguridad)
npm run db:studio    # Prisma Studio
npm run db:migrate   # Crear migración nueva (via prisma-safe.sh)
npm run db:deploy    # Aplicar migraciones (via prisma-safe.sh)
npm run db:backup    # Backup manual de la base
```

> ⚠️ **Base de datos**: los comandos destructivos de Prisma están bloqueados por `scripts/prisma-safe.sh`. Leer `CLAUDE.md` antes de tocar el schema — hay reglas obligatorias de backup y un historial de por qué existen.

### Crons (GitHub Actions)

Los workflows en `.github/workflows/` llaman a los endpoints `/api/cron/*` con el header `x-cron-secret`. Incluyen: recordatorios de citas y cumpleaños, recordatorios manuales por WhatsApp, expiración de trials y tokens, publicación programada de posts, encuestas de satisfacción y **backup diario de la base de datos** (2am UTC, descargable desde Actions → Artifacts).

---

## Arquitectura Multi-tenant

Cada médico tiene datos aislados por `doctorId`:
- Todos los modelos clínicos incluyen `doctorId` obligatorio
- Las queries siempre filtran por el `doctorId` de la sesión JWT
- Tests de aislamiento en `test/security/doctor-isolation.test.ts`

## Seguridad

- Supabase Auth (JWT) + middleware con rate limiting (Upstash)
- OTP anti-enumeración y timing-safe en portal de pacientes
- Comparación timing-safe de `CRON_SECRET` en todos los crons
- DOMPurify antes de renderizar contenido clínico
- Vulnerabilidades conocidas/aceptadas documentadas en `CLAUDE.md`

---

*Sara Medical — Transformando la práctica médica con inteligencia artificial*
