# Sara Medical — Claude Code Instructions

## REGLAS CRÍTICAS — NUNCA IGNORAR

### 🚨 INCIDENTE 2026-04-11: pérdida total de datos
`prisma db push --force-reset` fue ejecutado en producción durante una sesión de desarrollo.
Resultado: TODOS los registros Doctor, Patient, MedicalRecord, Prescription, etc. fueron borrados permanentemente.
Esta fue una pérdida catastrófica e irrecuperable de datos de médicos reales.

### Comandos ABSOLUTAMENTE PROHIBIDOS — nunca ejecutar, ni con confirmación
- `prisma db push --force-reset` — DESTRUYE TODOS LOS DATOS. BLOQUEADO por `scripts/prisma-safe.sh`.
- `prisma migrate reset` — igual de destructivo.
- `DROP SCHEMA public CASCADE` — equivalente a force-reset.
- `TRUNCATE "Doctor" CASCADE` o cualquier TRUNCATE en producción.
- `DELETE FROM "Doctor"`, `DELETE FROM "Patient"` sin WHERE muy específico.

### Comandos que REQUIEREN backup previo explícito
- Cualquier `ALTER TABLE ... DROP COLUMN`
- `DROP TABLE`
- `DELETE FROM` con WHERE amplio

### Cambios de schema Prisma — proceso obligatorio
1. NUNCA usar `db push` en producción directamente. Usar `npm run db:deploy` (migrate deploy).
2. Para agregar una columna nueva: `npm run db:migrate` (crea migración en `/prisma/migrations/`).
3. Si `prisma db push` dice "already in sync" pero el campo no existe: el problema es la migración, NO ejecutar force-reset. Investigar primero.
4. En caso de conflicto irresoluble: reportar al usuario, crear un backup manual, y ESPERAR instrucción.

### Base de datos — backup obligatorio antes de cualquier cambio de schema
- Backup automático: GitHub Actions corre cada día a las 2am UTC → descargar desde Actions → Artifacts
- Backup manual: `npm run db:backup`
- Restaurar: `npm run db:restore <archivo.sql.gz>`
- Script: `scripts/backup-db.sh` y `scripts/restore-backup.sh`

## Stack técnico
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Prisma ORM + PostgreSQL (Supabase)
- Supabase Auth
- **Deploy en Vercel** — push a `main` dispara deploy automático

## Flujo de deploy
1. Editar archivos
2. `npm run build` — verificar que compile sin errores
3. `git add ... && git commit && git push origin main` → Vercel deploya automáticamente

## Crons (GitHub Actions)
Los crons se configuran en `.github/workflows/`. Cada workflow hace `curl` al endpoint
con `x-cron-secret` header. Secrets requeridos en GitHub → Settings → Secrets:
- `APP_URL` — URL de producción (ej. `https://www.consultorio.site`)
- `CRON_SECRET` — mismo valor que en `.env`

Workflows activos:
- `appointment-reminders.yml` — 8am EC, recordatorios de citas 24h y 2h antes
- `birthday-reminders.yml` — 7am EC, felicitaciones de cumpleaños
- `manual-reminders.yml` — cada 15 min, recordatorios manuales del médico vía WhatsApp
- `trial-expiry.yml` — 6am EC, downgrade TRIAL → FREE
- `token-expiry.yml` — 10am EC, limpieza de tokens expirados
- `publish-scheduled.yml` — cada hora, publicación de posts programados
- `satisfaction-surveys.yml` — encuestas de satisfacción

## Planes
- FREE: acceso básico (post-trial)
- TRIAL: 21 días, acceso PRO completo
- PRO / ENTERPRISE: acceso completo
- Planes disponibles: `FREE`, `TRIAL`, `PRO_MENSUAL`, `PRO_ANUAL`, `ENTERPRISE`
- Para activar Pro Mensual: `UPDATE "Doctor" SET plan = 'PRO_MENSUAL', "trialEndsAt" = NULL WHERE email = '...'`
- Para activar Pro Anual: `UPDATE "Doctor" SET plan = 'PRO_ANUAL', "trialEndsAt" = NULL WHERE email = '...'`

## Reglas de calidad

- SIEMPRE verifica tu trabajo antes de darlo por terminado. Revisa que el código compila, que no hay errores de tipos, y que la lógica tiene sentido.
- Antes de implementar cualquier cambio, investiga el código existente para entender cómo funciona. No asumas — lee el código primero.
- NO implementes nada a menos que estés 100% seguro de que va a funcionar. Si tienes dudas, investiga más o pregúntame antes de proceder.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## gstack (instalado)

Skills disponibles vía `~/.claude/skills/gstack`. Instalar/actualizar:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

## Sistema de memoria

- Antes de terminar cualquier sesión de trabajo, guarda un resumen de lo que hiciste, lo que falta por hacer y cualquier decisión importante en un archivo .md dentro de la carpeta del proyecto (por ejemplo: PROGRESS.md o SESSION_NOTES.md).
- Al iniciar una nueva sesión, busca y lee estos archivos de memoria para entender dónde te quedaste y qué sigue.
- Organiza las notas por secciones: "Completado", "En progreso", "Pendiente" y "Decisiones tomadas".
- Actualiza estos archivos cada vez que completes un bloque significativo de trabajo.