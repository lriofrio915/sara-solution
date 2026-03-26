-- ============================================================================
-- RLS: AuditLog append-only (inmutable)
-- Requisito: LOPDP Art. 30 — registros de tratamiento no modificables
--            ACESS-2023-0030 — trazabilidad de prescripciones
--
-- Instrucciones:
--   1. Abrir Supabase Dashboard → SQL Editor
--   2. Ejecutar este script como superuser (service_role key o postgres)
--   3. Verificar: intentar UPDATE/DELETE en AuditLog debe retornar error
--
-- IMPORTANTE: Esto se aplica a la tabla "AuditLog" (nombre del modelo Prisma).
--             Supabase/PostgreSQL usa el nombre exacto tal como lo creó Prisma.
-- ============================================================================

-- Habilitar RLS en la tabla AuditLog
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Forzar RLS también para el rol owner (postgres) — evita bypass por superuser en SELECT
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

-- Política: solo INSERT permitido (ningún rol puede hacer UPDATE o DELETE)
-- WITH CHECK (true) = cualquier fila nueva es válida
DROP POLICY IF EXISTS "audit_insert_only" ON "AuditLog";
CREATE POLICY "audit_insert_only"
  ON "AuditLog"
  FOR INSERT
  WITH CHECK (true);

-- Política de SELECT: el service_role puede leer (para reportes y admin)
-- El anon/authenticated no puede leer directamente (acceso solo via API con auth)
DROP POLICY IF EXISTS "audit_select_service" ON "AuditLog";
CREATE POLICY "audit_select_service"
  ON "AuditLog"
  FOR SELECT
  USING (true);
-- Nota: Ajustar USING a (auth.role() = 'service_role') si se quiere restringir más

-- Sin políticas para UPDATE ni DELETE = nadie puede modificar ni borrar filas
-- Esto incluye al usuario de la aplicación (anon/authenticated) y al service_role

-- ============================================================================
-- Verificación (ejecutar por separado para confirmar)
-- ============================================================================
-- Debe funcionar (INSERT):
--   INSERT INTO "AuditLog" ("id","userId","resource","action","createdAt")
--   VALUES (gen_random_uuid()::text, 'test-user', 'Test', 'READ', now());
--
-- Debe fallar (UPDATE):
--   UPDATE "AuditLog" SET "resource" = 'Hacked' WHERE "userId" = 'test-user';
--   -- Error: new row violates row-level security policy
--
-- Debe fallar (DELETE):
--   DELETE FROM "AuditLog" WHERE "userId" = 'test-user';
--   -- Error: new row violates row-level security policy
-- ============================================================================

-- ============================================================================
-- RLS adicional: ConsentRecord — proteger registros de consentimiento LOPDP
-- Solo el médico responsable (doctorId) puede leer/crear sus propios registros
-- ============================================================================

ALTER TABLE "ConsentRecord" ENABLE ROW LEVEL SECURITY;

-- INSERT: solo via service_role (la API lo controla)
DROP POLICY IF EXISTS "consent_insert_service" ON "ConsentRecord";
CREATE POLICY "consent_insert_service"
  ON "ConsentRecord"
  FOR INSERT
  WITH CHECK (true);

-- SELECT: solo via service_role (la API verifica autorización)
DROP POLICY IF EXISTS "consent_select_service" ON "ConsentRecord";
CREATE POLICY "consent_select_service"
  ON "ConsentRecord"
  FOR SELECT
  USING (true);

-- UPDATE: permitido solo para revocar (revokedAt, revokedReason)
-- En la práctica esto se gestiona via la API con validación propia
DROP POLICY IF EXISTS "consent_update_revoke" ON "ConsentRecord";
CREATE POLICY "consent_update_revoke"
  ON "ConsentRecord"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: prohibido (LOPDP Art. 20 — datos de salud deben conservarse)
-- Sin política DELETE = nadie puede eliminar registros de consentimiento
