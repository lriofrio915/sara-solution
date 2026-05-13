-- Add clinicLogo and website fields to Doctor model
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "clinicLogo" TEXT;
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "website" TEXT;
