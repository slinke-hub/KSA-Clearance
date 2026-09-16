-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "extensions";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT', 'AUDITOR');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PROCESSING', 'VERIFIED', 'CLEARED');

-- CreateEnum
CREATE TYPE "RegulatoryStatus" AS ENUM ('REGULATED', 'NON_REGULATED', 'RESTRICTED', 'PROHIBITED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceNumber" VARCHAR(100) NOT NULL,
    "exporterName" VARCHAR(255) NOT NULL,
    "importerName" VARCHAR(255) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'SAR',
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileHash" CHAR(64) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceId" UUID NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitValue" DECIMAL(14,4) NOT NULL,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "countryOfOrigin" CHAR(2) NOT NULL,
    "declaredHsCode" VARCHAR(12),
    "matchedHsCode" VARCHAR(12),
    "dutyRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "calculatedDutyFee" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "calculatedVatFee" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "regulatoryStatus" "RegulatoryStatus" NOT NULL DEFAULT 'NON_REGULATED',
    "requiredCertificates" TEXT[],
    "confidenceScore" DOUBLE PRECISION,
    "verifiedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saudi_tariff_catalog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hsCode" VARCHAR(12) NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "dutyRate" DECIMAL(5,2) NOT NULL,
    "isRegulated" BOOLEAN NOT NULL DEFAULT false,
    "requiredRegs" TEXT[],
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saudi_tariff_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "details" JSONB,
    "ipAddress" VARCHAR(45),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_createdById_idx" ON "invoices"("createdById");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_line_items_matchedHsCode_idx" ON "invoice_line_items"("matchedHsCode");

-- CreateIndex
CREATE INDEX "invoice_line_items_regulatoryStatus_idx" ON "invoice_line_items"("regulatoryStatus");

-- CreateIndex
CREATE UNIQUE INDEX "saudi_tariff_catalog_hsCode_key" ON "saudi_tariff_catalog"("hsCode");

-- CreateIndex
CREATE INDEX "saudi_tariff_catalog_hsCode_idx" ON "saudi_tariff_catalog"("hsCode");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
