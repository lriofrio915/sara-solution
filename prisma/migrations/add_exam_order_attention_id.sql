-- Add attentionId FK to ExamOrder — links exam orders created from a medical attention back to the attention record
ALTER TABLE "ExamOrder" ADD COLUMN IF NOT EXISTS "attentionId" TEXT;
ALTER TABLE "ExamOrder" ADD CONSTRAINT IF NOT EXISTS "ExamOrder_attentionId_fkey"
  FOREIGN KEY ("attentionId") REFERENCES "Attention"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ExamOrder_attentionId_idx" ON "ExamOrder"("attentionId");
