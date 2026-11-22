-- Sai Rudra Motors - Supabase Postgres Schema
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Settings table: business_name, whatsapp_number, schema_version
CREATE TABLE IF NOT EXISTS public.settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 2. Suppliers table (Brands distributed by Sai Rudra Motors)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  logo        TEXT,
  description TEXT,
  category    TEXT DEFAULT 'Auto Spares',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure description and category columns exist on existing installations
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS category TEXT;

-- Case-insensitive unique index on supplier name
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name_lower
  ON public.suppliers(LOWER(name));

-- 3. Parts table (Parts catalogue)
CREATE TABLE IF NOT EXISTS public.parts (
  id          SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name        TEXT,
  image_key   TEXT NOT NULL,
  vehicles    TEXT NOT NULL DEFAULT '[]',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parts_supplier ON public.parts(supplier_id);

-- 4. Initial default business settings
INSERT INTO public.settings (key, value) VALUES
  ('business_name', 'Sai Rudra Motors'),
  ('whatsapp_number', '918660957903'),
  ('schema_version', '1')
ON CONFLICT (key) DO NOTHING;

-- 5. Seed the 11 official suppliers with their logos
INSERT INTO public.suppliers (name, logo) VALUES
  ('Sangsin Brakes', '01_sangsin_brakes.png'),
  ('Autolek Filters', '02_autolek_filters.png'),
  ('Rotex Brake Discs', '03_rotex_brake_discs.png'),
  ('MX Mark Xtralife', '04_mx_mark_xtralife.png'),
  ('Ceekay Exedy Clutches', '05_ceekay_exedy_clutches.png'),
  ('Mavrod Suspension', '06_mavrod_suspension.png'),
  ('TVS Coolants', '07_tvs_coolants.png'),
  ('MB Techno Rubber', '08_mb_techno_rubber.png'),
  ('HL Mando', '09_hl_mando_suspension_brakes.png'),
  ('Delphi Engine Oils', '10_delphi_engine_oils.png'),
  ('Delphi Driveshafts', '11_delphi_driveshafts.png')
ON CONFLICT (name) DO NOTHING;

-- 6. Inquiries table (Customer leads from Stock Check & Price form)
CREATE TABLE IF NOT EXISTS public.inquiries (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  enquiry_type TEXT NOT NULL DEFAULT 'Retail Enquiry',
  brand        TEXT NOT NULL,
  vehicle      TEXT NOT NULL,
  part         TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

-- 7. Supabase Storage Bucket for Part Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('part-images', 'part-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view settings" ON public.settings;
CREATE POLICY "Public can view settings" ON public.settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view suppliers" ON public.suppliers;
CREATE POLICY "Public can view suppliers" ON public.suppliers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view parts" ON public.parts;
CREATE POLICY "Public can view parts" ON public.parts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can create inquiries" ON public.inquiries;
CREATE POLICY "Public can create inquiries" ON public.inquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view part images" ON storage.objects;
CREATE POLICY "Public can view part images" ON storage.objects FOR SELECT USING (bucket_id = 'part-images');

