-- Add type discriminator to ExamOrder — a single attention produces up to two orders
-- (laboratory and imaging). Without this column both sets of exams lived in one row
-- and the printed laboratory order included imaging items.
-- Additive only: no data is dropped or rewritten. Existing rows default to 'LAB' and
-- are reclassified afterwards by scripts/backfill-exam-order-type.ts.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamOrderType') THEN
    CREATE TYPE "ExamOrderType" AS ENUM ('LAB', 'IMAGING');
  END IF;
END
$$;

ALTER TABLE "ExamOrder"
  ADD COLUMN IF NOT EXISTS "type" "ExamOrderType" NOT NULL DEFAULT 'LAB';

CREATE INDEX IF NOT EXISTS "ExamOrder_attentionId_type_idx"
  ON "ExamOrder"("attentionId", "type");
