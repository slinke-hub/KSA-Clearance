ALTER TYPE "RegulatoryStatus" ADD VALUE IF NOT EXISTS 'UNKNOWN';
ALTER TABLE "invoice_line_items"
  ADD COLUMN "classificationEvidence" JSONB,
  ALTER COLUMN "dutyRate" DROP NOT NULL,
  ALTER COLUMN "dutyRate" DROP DEFAULT,
  ALTER COLUMN "calculatedDutyFee" DROP NOT NULL,
  ALTER COLUMN "calculatedDutyFee" DROP DEFAULT,
  ALTER COLUMN "calculatedVatFee" DROP NOT NULL,
  ALTER COLUMN "calculatedVatFee" DROP DEFAULT;
