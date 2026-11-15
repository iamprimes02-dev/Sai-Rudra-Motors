# Schema: Parts Catalogue Website

Version: 0.3
Date: 2026-11-15
Database: Supabase Postgres. Image storage: Supabase Storage. Only the object key is stored in the database.

## 1. Schema

Run this in the Supabase SQL Editor (https://app.supabase.com/project/_/sql):

```sql
-- Enable pgcrypto for secure random functions (optional)
-- create extension if not exists pgcrypto;

-- Settings table: admin_hash, business_name, whatsapp_number, schema_version
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Case-insensitive unique index on supplier name
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name_lower
  ON suppliers(LOWER(name));

-- Parts table (image_key stores the Supabase Storage path)
CREATE TABLE IF NOT EXISTS parts (
  id          SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name        TEXT,
  image_key   TEXT NOT NULL,
  vehicles    TEXT NOT NULL DEFAULT '[]',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parts_supplier ON parts(supplier_id);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('business_name', 'My Auto Parts'),
  ('whatsapp_number', ''),
  ('schema_version', '1')
ON CONFLICT (key) DO NOTHING;
```

## 2. Settings Keys

| Key | Type | Example | Notes |
|-----|------|---------|-------|
| `admin_hash` | string | (not used in v0.3) | Admin password is the `ADMIN_PASSWORD` secret, not a database row. |
| `business_name` | string | `Sharma Auto Parts` | Shown in the customer header. |
| `whatsapp_number` | string | `919876543210` | Digits only, 8 to 15 digits, with country code. Empty string means not set. |
| `schema_version` | string | `1` | Migration marker. |

## 3. Field Rules

### 3.1 suppliers
- `name`: required. Trimmed, 2 to 60 characters. Unique case-insensitively (enforced by unique index on `LOWER(name)`).

### 3.2 parts
- `supplier_id`: required. Must exist. Cascade delete removes rows. Supabase Storage objects must be deleted in code (see TechSpec 7.5).
- `name`: optional. Trimmed, 1 to 120 characters. Stored as `NULL` when empty.
- `image_key`: required. Supabase Storage key, `part-images/<uuid>.<ext>`. Served at `/uploads/<part-id>`.
- `vehicles`: required. JSON array of strings, 1 to 20 items, each 2 to 80 characters after trimming, case-insensitive duplicates removed.
  - Example: `["Maruti Swift 2018-2022", "Maruti Dzire 2019-2023"]`
- `created_at`, `updated_at`: UTC text from `CURRENT_TIMESTAMP`. Display in IST in the admin UI.

There is no price column. Do not add one.

## 4. Queries Used by the API

All queries use parameterized statements via `@supabase/supabase-js`. No string concatenation of user input.

### 4.1 Supplier list with part counts
```sql
SELECT s.id, s.name, COUNT(p.id) AS partCount
FROM suppliers s
LEFT JOIN parts p ON p.supplier_id = s.id
GROUP BY s.id
ORDER BY s.name;
```

### 4.2 Parts for a supplier, with optional vehicle filter
```sql
SELECT p.id, p.name, p.image_key, p.vehicles
FROM parts p
WHERE p.supplier_id = $1
  AND ($2 IS NULL OR $2 = '' OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(p.vehicles::jsonb) v
        WHERE v = $2
      ))
ORDER BY p.created_at DESC, p.id DESC;
```
Bind `$1` = supplier id, `$2` = vehicle string or `NULL`.

### 4.3 Distinct vehicles for one supplier (filter dropdown)
```sql
SELECT DISTINCT v.value AS vehicle
FROM parts p, jsonb_array_elements_text(p.vehicles::jsonb) v
WHERE p.supplier_id = $1
ORDER BY vehicle;
```
`DISTINCT` is case-sensitive. Normalise casing in code (keep first spelling) before returning.

### 4.4 Vehicle suggestions (admin)
```sql
SELECT DISTINCT v.value AS vehicle
FROM parts p, jsonb_array_elements_text(p.vehicles::jsonb) v
WHERE v.value ILIKE $1
ORDER BY vehicle
LIMIT 10;
```
Bind `$1` = `%` + escaped query + `%`. Escape `%`, `_`, and `\` in the user input first.

## 5. Future Option (not in v1)

If vehicle search across all suppliers (Q4) is needed, normalise vehicles into their own tables:

```sql
CREATE TABLE vehicles (
  id    SERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE
);
CREATE TABLE part_vehicles (
  part_id    INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  PRIMARY KEY (part_id, vehicle_id)
);
```

## 6. Backup

- Database: Use Supabase dashboard to export, or `pg_dump` against the Supabase connection string.
- Images: Copy the Supabase Storage `part-images` bucket via Supabase dashboard or API.
- Keep backups outside the repository.
