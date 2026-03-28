# Sara Medical — Claude Code Instructions

## REGLAS CRÍTICAS — NUNCA IGNORAR

### Comandos PROHIBIDOS (requieren confirmación explícita del usuario)
- `prisma db push --force-reset` — BORRA TODOS LOS DATOS. NUNCA ejecutar sin confirmación explícita.
- `prisma migrate reset` — igual de destructivo.
- `DROP TABLE`, `TRUNCATE`, `DELETE FROM` sin WHERE — destructivo.
- `rm -rf` en directorios de datos o `.env`.
- `git push --force` en main.

### Cambios de schema Prisma
- Usar siempre `npx prisma db push` (sin `--force-reset`) para agregar campos/modelos nuevos.
- Si hay conflicto de schema, reportar al usuario y esperar instrucción — NUNCA usar `--force-reset` por cuenta propia.
- Antes de cualquier cambio de schema destructivo (eliminar campo/tabla), hacer backup primero.

### Base de datos
- Antes de cualquier operación que pueda borrar datos, ejecutar primero un backup con pg_dump.
- El script de backup está en: `/var/www/sara-solution/scripts/backup-db.sh`

## Stack técnico
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Prisma ORM + PostgreSQL (Supabase)
- Supabase Auth
- PM2 para producción (puerto 3001)
- Después de cambios: `npm run build && pm2 restart medsara --update-env`

## Flujo de deploy
1. Editar archivos
2. `npm run build` — verificar que compile sin errores
3. `pm2 restart medsara --update-env`
4. `git add ... && git commit && git push origin main`

## Planes
- FREE: acceso básico (post-trial)
- TRIAL: 21 días, acceso PRO completo
- PRO / ENTERPRISE: acceso completo
- Planes disponibles: `FREE`, `TRIAL`, `PRO_MENSUAL`, `PRO_ANUAL`, `ENTERPRISE`
- Para activar Pro Mensual: `UPDATE "Doctor" SET plan = 'PRO_MENSUAL', "trialEndsAt" = NULL WHERE email = '...'`
- Para activar Pro Anual: `UPDATE "Doctor" SET plan = 'PRO_ANUAL', "trialEndsAt" = NULL WHERE email = '...'`
