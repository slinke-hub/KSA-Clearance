-- =========================================================================
-- Migration: Apply RLS Policies and pgvector Hooks
-- File: supabase/migrations/20260913000001_apply_rls_and_pgvector_hooks.sql
-- =========================================================================

-- 1. Enable pgvector in the extensions schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 2. Automatic profile creation on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, "fullName", role, "createdAt", "updatedAt")
  VALUES (
    NEW.id::TEXT, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    COALESCE((NEW.raw_user_meta_data->>'role')::"Role", 'AGENT'::"Role"), 
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET "fullName" = EXCLUDED."fullName",
      "updatedAt" = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Helper to check user role safely without recursive RLS evaluation
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = (SELECT auth.uid()::TEXT);
$$;

-- 4. Enable Row Level Security (RLS) on all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saudi_tariff_catalog ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 5. Profiles Policies
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile; Admins/Auditors read all" ON public.profiles;
CREATE POLICY "Users can read own profile; Admins/Auditors read all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid()::TEXT)
    OR public.get_auth_role() IN ('ADMIN', 'AUDITOR')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()::TEXT) OR public.get_auth_role() = 'ADMIN')
  WITH CHECK (
    (id = (SELECT auth.uid()::TEXT) AND role = (SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()::TEXT)))
    OR public.get_auth_role() = 'ADMIN'
  );

-- -------------------------------------------------------------------------
-- 6. Invoices Policies (Principle of Least Privilege)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view accessible invoices" ON public.invoices;
CREATE POLICY "Users can view accessible invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    "createdById" = (SELECT auth.uid()::TEXT)
    OR public.get_auth_role() IN ('ADMIN', 'AUDITOR')
  );

DROP POLICY IF EXISTS "Agents and Admins can create invoices" ON public.invoices;
CREATE POLICY "Agents and Admins can create invoices"
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ("createdById" = (SELECT auth.uid()::TEXT) AND public.get_auth_role() IN ('AGENT', 'ADMIN'))
    OR public.get_auth_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "Agents can update own pending invoices; Admins can update any" ON public.invoices;
CREATE POLICY "Agents can update own pending invoices; Admins can update any"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    ("createdById" = (SELECT auth.uid()::TEXT) AND status IN ('PENDING', 'PROCESSING'))
    OR public.get_auth_role() = 'ADMIN'
  )
  WITH CHECK (
    ("createdById" = (SELECT auth.uid()::TEXT) AND status IN ('PENDING', 'PROCESSING'))
    OR public.get_auth_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "Only Admins can delete invoices" ON public.invoices;
CREATE POLICY "Only Admins can delete invoices"
  ON public.invoices
  FOR DELETE
  TO authenticated
  USING (public.get_auth_role() = 'ADMIN');

-- -------------------------------------------------------------------------
-- 7. Line Items Policies
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view accessible line items" ON public.invoice_line_items;
CREATE POLICY "Users can view accessible line items"
  ON public.invoice_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE public.invoices.id = invoice_line_items."invoiceId"
        AND (
          public.invoices."createdById" = (SELECT auth.uid()::TEXT)
          OR public.get_auth_role() IN ('ADMIN', 'AUDITOR')
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert line items into accessible invoices" ON public.invoice_line_items;
CREATE POLICY "Users can insert line items into accessible invoices"
  ON public.invoice_line_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE public.invoices.id = invoice_line_items."invoiceId"
        AND (
          (public.invoices."createdById" = (SELECT auth.uid()::TEXT) AND public.get_auth_role() IN ('AGENT', 'ADMIN'))
          OR public.get_auth_role() = 'ADMIN'
        )
    )
  );

DROP POLICY IF EXISTS "Users can update line items of editable invoices" ON public.invoice_line_items;
CREATE POLICY "Users can update line items of editable invoices"
  ON public.invoice_line_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE public.invoices.id = invoice_line_items."invoiceId"
        AND (
          (public.invoices."createdById" = (SELECT auth.uid()::TEXT) AND public.invoices.status IN ('PENDING', 'PROCESSING'))
          OR public.get_auth_role() = 'ADMIN'
        )
    )
  );

DROP POLICY IF EXISTS "Only Admins can delete line items" ON public.invoice_line_items;
CREATE POLICY "Only Admins can delete line items"
  ON public.invoice_line_items
  FOR DELETE
  TO authenticated
  USING (public.get_auth_role() = 'ADMIN');

-- -------------------------------------------------------------------------
-- 8. Saudi Tariff Catalog Policies & HNSW Vector Index
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tariff catalog is readable by authenticated users" ON public.saudi_tariff_catalog;
CREATE POLICY "Tariff catalog is readable by authenticated users"
  ON public.saudi_tariff_catalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only Admins can manage tariff catalog" ON public.saudi_tariff_catalog;
CREATE POLICY "Only Admins can manage tariff catalog"
  ON public.saudi_tariff_catalog
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'ADMIN')
  WITH CHECK (public.get_auth_role() = 'ADMIN');

CREATE INDEX IF NOT EXISTS idx_saudi_tariff_embedding_hnsw
  ON public.saudi_tariff_catalog 
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- -------------------------------------------------------------------------
-- 9. Audit Logs Policies (Tamper-Evident & Append-Only)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can append audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can append audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ("userId" = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "Admins and Auditors can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins and Auditors can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.get_auth_role() IN ('ADMIN', 'AUDITOR'));

REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;
