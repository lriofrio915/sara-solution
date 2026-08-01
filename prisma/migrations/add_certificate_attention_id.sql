-- Add attentionId FK to MedicalCertificate — links certificates created from a medical attention back to the attention record
ALTER TABLE "MedicalCertificate" ADD COLUMN IF NOT EXISTS "attentionId" TEXT;
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT IF NOT EXISTS "MedicalCertificate_attentionId_fkey"
  FOREIGN KEY ("attentionId") REFERENCES "Attention"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "MedicalCertificate_attentionId_idx" ON "MedicalCertificate"("attentionId");

-- Backfill opcional: vincula certificados existentes con la atención del mismo
-- paciente y la misma fecha/hora exacta (solo cuando hay una única coincidencia).
UPDATE "MedicalCertificate" mc
SET "attentionId" = a.id
FROM "Attention" a
WHERE mc."attentionId" IS NULL
  AND a."patientId" = mc."patientId"
  AND a."doctorId"  = mc."doctorId"
  AND a."datetime"  = mc."date"
  AND (SELECT COUNT(*) FROM "Attention" a2
        WHERE a2."patientId" = mc."patientId"
          AND a2."doctorId"  = mc."doctorId"
          AND a2."datetime"  = mc."date") = 1;
