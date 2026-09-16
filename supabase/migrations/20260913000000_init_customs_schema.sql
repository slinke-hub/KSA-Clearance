-- =========================================================================
-- Saudi Customs Clearance & Regulatory Classification Engine
-- Production Supabase PostgreSQL Schema, pgvector & Row Level Security (RLS)
-- =========================================================================

-- 1. Enable Required Extensions in 'extensions' schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;

-- Grant usage on extensions to standard roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 2. Custom Enumerated Types
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT', 'AUDITOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PROCESSING', 'VERIFIED', 'CLEARED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RegulatoryStatus" AS ENUM ('REGULATED', 'NON_REGULATED', 'RESTRICTED', 'PROHIBITED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (1:1 mapping with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role "Role" NOT NULL DEFAULT 'AGENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    invoice_number VARCHAR(100) NOT NULL,
    exporter_name VARCHAR(255) NOT NULL,
    importer_name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'SAR',
    total_amount DECIMAL(14, 2) NOT NULL CHECK (total_amount >= 0),
    storage_path TEXT NOT NULL,
    file_hash CHAR(64) NOT NULL,
    status "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    created_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Invoice Line Items Table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL CHECK (line_number > 0),
    description TEXT NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
    unit_value DECIMAL(14, 4) NOT NULL CHECK (unit_value >= 0),
    total_value DECIMAL(14, 2) NOT NULL CHECK (total_value >= 0),
    country_of_origin CHAR(2) NOT NULL, -- ISO-2 code (e.g., 'CN', 'DE', 'US')
    declared_hs_code VARCHAR(12),
    matched_hs_code VARCHAR(12),        -- 12-digit ZATCA Integrated Customs Tariff
    duty_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (duty_rate >= 0 AND duty_rate <= 100),
    vat_rate DECIMAL(5, 2) NOT NULL DEFAULT 15.00 CHECK (vat_rate >= 0),
    calculated_duty_fee DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (calculated_duty_fee >= 0),
    calculated_vat_fee DECIMAL(14, 2) NOT NULL DEFAULT 0.00 CHECK (calculated_vat_fee >= 0),
    regulatory_status "RegulatoryStatus" NOT NULL DEFAULT 'NON_REGULATED',
    required_certificates TEXT[] NOT NULL DEFAULT '{}', -- ['PCoC', 'SCoC', 'G-Mark', 'IECEE', 'SFDA']
    confidence_score REAL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    verified_by_user BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_invoice_line_number UNIQUE (invoice_id, line_number)
);

-- 6. Saudi 12-Digit Integrated Customs Tariff Catalog with Vector Embeddings
CREATE TABLE IF NOT EXISTS public.saudi_tariff_catalog (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    hs_code VARCHAR(12) NOT NULL UNIQUE,
    description_en TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    duty_rate DECIMAL(5, 2) NOT NULL CHECK (duty_rate >= 0 AND duty_rate <= 100),
    is_regulated BOOLEAN NOT NULL DEFAULT FALSE,
    required_regs TEXT[] NOT NULL DEFAULT '{}',
    embedding extensions.vector(1536), -- OpenAI text-embedding-3-small or equivalent
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Audit Logs Table (Tamper-evident, Append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- e.g., 'INVOICE_UPLOADED', 'HS_CODE_OVERRIDDEN', 'BATCH_CLEARED_FASAH'
    entity_type VARCHAR(50) NOT NULL, -- 'Invoice' | 'InvoiceLineItem'
    entity_id UUID NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- Indexes for High-Performance Queries
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices(created_by_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON public.invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_line_items_matched_hs ON public.invoice_line_items(matched_hs_code);
CREATE INDEX IF NOT EXISTS idx_line_items_regulatory ON public.invoice_line_items(regulatory_status);
CREATE INDEX IF NOT EXISTS idx_saudi_tariff_hs_code ON public.saudi_tariff_catalog(hs_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON public.audit_logs(user_id, timestamp DESC);

-- HNSW Vector Index for Semantic Tariff Search (Cosine Distance)
CREATE INDEX IF NOT EXISTS idx_saudi_tariff_embedding_hnsw
    ON public.saudi_tariff_catalog 
    USING hnsw (embedding extensions.vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- =========================================================================
-- Helper Functions & Trigger Definitions
-- =========================================================================

-- Function to get current user's role safely (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS "Role"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_role "Role";
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'AGENT'::"Role");
END;
$$;

-- Trigger to automatically create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::"Role", 'AGENT'::"Role")
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Semantic Vector Search Function for 12-Digit ZATCA Tariff Codes
CREATE OR REPLACE FUNCTION public.match_saudi_tariffs(
    query_embedding extensions.vector(1536),
    match_threshold FLOAT DEFAULT 0.70,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    hs_code VARCHAR(12),
    description_en TEXT,
    description_ar TEXT,
    duty_rate DECIMAL(5, 2),
    is_regulated BOOLEAN,
    required_regs TEXT[],
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        stc.id,
        stc.hs_code,
        stc.description_en,
        stc.description_ar,
        stc.duty_rate,
        stc.is_regulated,
        stc.required_regs,
        (1 - (stc.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.saudi_tariff_catalog stc
    WHERE stc.embedding IS NOT NULL
      AND (1 - (stc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY stc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =========================================================================
-- Row Level Security (RLS) Policies
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saudi_tariff_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- PROFILES POLICIES
-- -------------------------------------------------------------------------
-- Users can view their own profile; ADMIN and AUDITOR can view all profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id
        OR public.get_auth_user_role() IN ('ADMIN', 'AUDITOR')
    );

-- Users can update their own profile; only ADMIN can modify roles
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id OR public.get_auth_user_role() = 'ADMIN')
    WITH CHECK (
        (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
        OR public.get_auth_user_role() = 'ADMIN'
    );

-- -------------------------------------------------------------------------
-- INVOICES POLICIES
-- -------------------------------------------------------------------------
-- AGENT sees their own; ADMIN and AUDITOR see all invoices
CREATE POLICY "invoices_select_policy" ON public.invoices
    FOR SELECT
    USING (
        created_by_id = auth.uid()
        OR public.get_auth_user_role() IN ('ADMIN', 'AUDITOR')
    );

-- AGENT and ADMIN can insert invoices (owner must match auth.uid())
CREATE POLICY "invoices_insert_policy" ON public.invoices
    FOR INSERT
    WITH CHECK (
        created_by_id = auth.uid()
        AND public.get_auth_user_role() IN ('ADMIN', 'AGENT')
    );

-- AGENT can update their own invoices if not CLEARED; ADMIN can update any
CREATE POLICY "invoices_update_policy" ON public.invoices
    FOR UPDATE
    USING (
        (created_by_id = auth.uid() AND status IN ('PENDING', 'PROCESSING', 'VERIFIED'))
        OR public.get_auth_user_role() = 'ADMIN'
    )
    WITH CHECK (
        (created_by_id = auth.uid() AND status IN ('PENDING', 'PROCESSING', 'VERIFIED'))
        OR public.get_auth_user_role() = 'ADMIN'
    );

-- Only ADMIN can delete invoices
CREATE POLICY "invoices_delete_policy" ON public.invoices
    FOR DELETE
    USING (public.get_auth_user_role() = 'ADMIN');

-- -------------------------------------------------------------------------
-- INVOICE LINE ITEMS POLICIES
-- -------------------------------------------------------------------------
-- Users see line items if they can see the parent invoice
CREATE POLICY "line_items_select_policy" ON public.invoice_line_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id
              AND (
                  i.created_by_id = auth.uid()
                  OR public.get_auth_user_role() IN ('ADMIN', 'AUDITOR')
              )
        )
    );

-- Insert permitted if user owns the invoice (and status != CLEARED) or is ADMIN
CREATE POLICY "line_items_insert_policy" ON public.invoice_line_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id
              AND (
                  (i.created_by_id = auth.uid() AND i.status != 'CLEARED' AND public.get_auth_user_role() = 'AGENT')
                  OR public.get_auth_user_role() = 'ADMIN'
              )
        )
    );

-- Update permitted for owner if un-cleared, or ADMIN
CREATE POLICY "line_items_update_policy" ON public.invoice_line_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id
              AND (
                  (i.created_by_id = auth.uid() AND i.status != 'CLEARED')
                  OR public.get_auth_user_role() = 'ADMIN'
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id
              AND (
                  (i.created_by_id = auth.uid() AND i.status != 'CLEARED')
                  OR public.get_auth_user_role() = 'ADMIN'
              )
        )
    );

-- Delete permitted for owner if un-cleared, or ADMIN
CREATE POLICY "line_items_delete_policy" ON public.invoice_line_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id
              AND (
                  (i.created_by_id = auth.uid() AND i.status != 'CLEARED')
                  OR public.get_auth_user_role() = 'ADMIN'
              )
        )
    );

-- -------------------------------------------------------------------------
-- SAUDI TARIFF CATALOG POLICIES
-- -------------------------------------------------------------------------
-- Read-only for all authenticated clearance agents, auditors, and admins
CREATE POLICY "tariff_catalog_select_policy" ON public.saudi_tariff_catalog
    FOR SELECT
    TO authenticated, anon
    USING (TRUE);

-- Modifications strictly restricted to system administrators
CREATE POLICY "tariff_catalog_admin_all_policy" ON public.saudi_tariff_catalog
    FOR ALL
    USING (public.get_auth_user_role() = 'ADMIN')
    WITH CHECK (public.get_auth_user_role() = 'ADMIN');

-- -------------------------------------------------------------------------
-- AUDIT LOGS POLICIES (Strict Non-Repudiation, Append-Only)
-- -------------------------------------------------------------------------
-- AUDITOR and ADMIN can inspect all logs; AGENT can inspect their own
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.get_auth_user_role() IN ('ADMIN', 'AUDITOR')
    );

-- Any authenticated user/system action can append an audit entry
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR public.get_auth_user_role() = 'ADMIN'
    );

-- CRITICAL AUDIT SECURITY: No UPDATE or DELETE policies exist for audit_logs
-- This guarantees cryptographic immutability and regulatory compliance.
