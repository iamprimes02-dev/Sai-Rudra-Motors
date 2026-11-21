// db.js - Database layer for Sai Rudra Motors parts catalogue.
// Uses Supabase Postgres via @supabase/supabase-js.
// Serverless-compatible: no local file storage, all data in Supabase.
'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
}

// Supabase client with service role key (server-side, full access).
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' },
});

/**
 * Insert default settings if they don't exist.
 */
async function setDefaultSettings() {
  const { data: existing } = await supabase
    .from('settings')
    .select('key')
    .in('key', ['business_name', 'whatsapp_number', 'schema_version']);

  const existingKeys = new Set((existing || []).map((r) => r.key));
  const defaults = {};

  if (!existingKeys.has('business_name')) defaults.business_name = 'Sai Rudra Motors';
  if (!existingKeys.has('whatsapp_number')) defaults.whatsapp_number = '918660957903';
  if (!existingKeys.has('schema_version')) defaults.schema_version = '1';

  if (Object.keys(defaults).length > 0) {
    const rows = Object.entries(defaults).map(([key, value]) => ({ key, value }));
    await supabase.from('settings').upsert(rows, { onConflict: 'key' });
  }
}

/**
 * Ensure the suppliers.logo column exists (run once on startup).
 * Fails silently if the column already exists.
 */
async function ensureLogoColumn() {
  try {
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS logo TEXT;',
    });
  } catch {
    // Column may already exist or rpc may not be enabled - that's OK.
    // The column can be added manually via Supabase SQL Editor.
  }
}

const DEFAULT_SUPPLIERS = [
  { id: 1, name: 'Sangsin Brakes', logo: '01_sangsin_brakes.png', category: 'Brakes', description: 'Brake pads, brake shoes, and commercial brake linings.', partCount: 0 },
  { id: 2, name: 'Autolek Filters', logo: '02_autolek_filters.png', category: 'Filters', description: 'Engine oil, air, AC cabin, and fuel filters.', partCount: 0 },
  { id: 3, name: 'Rotex Brake Discs', logo: '03_rotex_brake_discs.png', category: 'Brakes', description: 'Solid and ventilated brake discs and rotors.', partCount: 0 },
  { id: 4, name: 'MX Mark Xtralife', logo: '04_mx_mark_xtralife.png', category: 'Auto Spares', description: 'Electrical, ignition, and mechanical replacement parts.', partCount: 0 },
  { id: 5, name: 'Ceekay Exedy Clutches', logo: '05_ceekay_exedy_clutches.png', category: 'Clutch & Transmission', description: 'Clutch plates, cover assemblies, and release bearings.', partCount: 0 },
  { id: 6, name: 'Mavrod Suspension', logo: '06_mavrod_suspension.png', category: 'Suspension', description: 'Shock absorbers, strut assemblies, and suspension kits.', partCount: 0 },
  { id: 7, name: 'TVS Coolants', logo: '07_tvs_coolants.png', category: 'Oils & Coolants', description: 'Engine radiator coolants and anti-freeze fluids.', partCount: 0 },
  { id: 8, name: 'MB Techno Rubber', logo: '08_mb_techno_rubber.png', category: 'Rubber Parts', description: 'Suspension bushes, engine mounts, bellows, and steering boots.', partCount: 0 },
  { id: 9, name: 'HL Mando', logo: '09_hl_mando_suspension_brakes.png', category: 'Steering & Suspension', description: 'Steering racks, columns, shock absorbers, and brake calipers.', partCount: 0 },
  { id: 10, name: 'Delphi Engine Oils', logo: '10_delphi_engine_oils.png', category: 'Oils & Coolants', description: 'Synthetic and semi-synthetic engine oils for petrol and diesel vehicles.', partCount: 0 },
  { id: 11, name: 'Delphi Driveshafts', logo: '11_delphi_driveshafts.png', category: 'Drivetrain & Axles', description: 'Complete CV axles, CV joints, and axle boots.', partCount: 0 },
];

/**
 * Seed default suppliers with official logos if suppliers table is empty.
 */
async function ensureDefaultSuppliers() {
  try {
    const { count, error } = await supabase.from('suppliers').select('*', { count: 'exact', head: true });
    if (!error && (count === 0 || count === null)) {
      const rows = DEFAULT_SUPPLIERS.map(s => ({ name: s.name, logo: s.logo }));
      await supabase.from('suppliers').insert(rows);
    }
  } catch (err) {
    console.error('DB initialization warning (default suppliers):', err.message);
  }
}

// Initialize defaults, logo column, and suppliers.
setDefaultSettings().catch((err) => {
  console.error('DB initialization warning (settings):', err.message);
});
ensureLogoColumn().catch((err) => {
  console.error('DB initialization warning (logo column):', err.message);
});
ensureDefaultSuppliers().catch((err) => {
  console.error('DB initialization warning (suppliers seed):', err.message);
});

// Prepared-statement-style wrappers around Supabase queries.
// These mirror the old `stmt` object for compatibility with routes.

const _inMemoryParts = [];

const stmt = {
  // --- Settings ---
  async getSetting(key) {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    if (error || !data) return { value: null };
    return { value: data.value };
  },
  async setSetting(key, value) {
    await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
  },

  // --- Suppliers ---
  async listSuppliers() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, logo, created_at')
        .order('name', { ascending: true });
      if (error || !data || data.length === 0) {
        return DEFAULT_SUPPLIERS;
      }
      const suppliers = data;
      const result = await Promise.all(
        suppliers.map(async (s) => {
          const { count } = await supabase
            .from('parts')
            .select('*', { count: 'exact', head: true })
            .eq('supplier_id', s.id);
          const defaultMatch = DEFAULT_SUPPLIERS.find(d => 
            d.name.toLowerCase() === s.name.toLowerCase() ||
            (d.name === 'HL Mando' && s.name.toLowerCase().includes('hl mando'))
          );
          return {
            id: s.id,
            name: defaultMatch ? defaultMatch.name : s.name,
            logo: s.logo || (defaultMatch ? defaultMatch.logo : null),
            category: (defaultMatch && defaultMatch.category) || 'Auto Spares',
            description: (defaultMatch && defaultMatch.description) || '',
            partCount: count !== null ? count : _inMemoryParts.filter(p => p.supplier_id === s.id).length,
            created_at: s.created_at,
          };
        })
      );
      return result.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'accent' }));
    } catch {
      return DEFAULT_SUPPLIERS;
    }
  },
  async getSupplierById(id) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, logo, created_at')
        .eq('id', id)
        .single();
      if (!error && data) {
        const defaultMatch = DEFAULT_SUPPLIERS.find(d => 
          d.name.toLowerCase() === data.name.toLowerCase() ||
          (d.name === 'HL Mando' && data.name.toLowerCase().includes('hl mando'))
        );
        return {
          ...data,
          name: defaultMatch ? defaultMatch.name : data.name,
          logo: data.logo || (defaultMatch ? defaultMatch.logo : null),
          category: (defaultMatch && defaultMatch.category) || 'Auto Spares',
          description: (defaultMatch && defaultMatch.description) || '',
        };
      }
    } catch {}
    const defaultItem = DEFAULT_SUPPLIERS.find(d => d.id === Number(id) || d.name.toLowerCase() === String(id).toLowerCase());
    return defaultItem || null;
  },
  async getSupplierByName(name) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, logo')
        .ilike('name', name)
        .maybeSingle();
      if (!error && data) return data;
    } catch {}
    const match = DEFAULT_SUPPLIERS.find(d => d.name.toLowerCase() === name.toLowerCase());
    return match ? { id: match.id, name: match.name, logo: match.logo } : null;
  },
  async createSupplier(name, logo) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ name, logo: logo || null })
        .select('id, name, logo')
        .single();
      if (!error && data) {
        return { lastInsertRowid: data.id, ...data };
      }
    } catch {}
    const newId = DEFAULT_SUPPLIERS.length + 1;
    const newSupplier = { id: newId, name, logo: logo || null, partCount: 0 };
    DEFAULT_SUPPLIERS.push(newSupplier);
    return { lastInsertRowid: newId, ...newSupplier };
  },
  async updateSupplier(name, id, logo) {
    const updateData = { name };
    if (logo !== undefined) updateData.logo = logo;
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', id)
        .select('id, name, logo')
        .single();
      if (!error && data) return data;
    } catch {}
    const s = DEFAULT_SUPPLIERS.find(d => d.id === Number(id));
    if (s) {
      s.name = name;
      if (logo !== undefined) s.logo = logo;
      return s;
    }
    return null;
  },
  async deleteSupplier(id) {
    try {
      await supabase.from('suppliers').delete().eq('id', id);
    } catch {}
    const idx = DEFAULT_SUPPLIERS.findIndex(d => d.id === Number(id));
    if (idx !== -1) DEFAULT_SUPPLIERS.splice(idx, 1);
  },

  // --- Parts ---
  async listPartsBySupplier(supplierId, vehicle) {
    let parts = [];
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('id, name, image_key, vehicles, created_at, updated_at')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (!error && data && data.length > 0) {
        parts = data;
      } else {
        parts = _inMemoryParts.filter(p => p.supplier_id === Number(supplierId));
      }
    } catch {
      parts = _inMemoryParts.filter(p => p.supplier_id === Number(supplierId));
    }

    if (!vehicle) return parts;
    const vLower = vehicle.toLowerCase();
    return parts.filter((p) => {
      const arr = Array.isArray(p.vehicles) ? p.vehicles : JSON.parse(p.vehicles || '[]');
      return arr.some((v) => v.toLowerCase() === vLower);
    });
  },
  async getPartById(id) {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('id, supplier_id, name, image_key, vehicles, created_at, updated_at')
        .eq('id', id)
        .single();
      if (!error && data) return data;
    } catch {}
    return _inMemoryParts.find(p => p.id === Number(id)) || null;
  },
  async createPart(supplierId, name, imageKey, vehicles) {
    try {
      const { data, error } = await supabase
        .from('parts')
        .insert({ supplier_id: supplierId, name, image_key: imageKey, vehicles })
        .select('*')
        .single();
      if (!error && data) {
        return { lastInsertRowid: data.id, ...data };
      }
    } catch {}
    const newPart = {
      id: _inMemoryParts.length + 1,
      lastInsertRowid: _inMemoryParts.length + 1,
      supplier_id: Number(supplierId),
      name,
      image_key: imageKey,
      vehicles,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    _inMemoryParts.push(newPart);
    return newPart;
  },
  async updatePart(id, name, imageKey, vehicles) {
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (imageKey !== undefined) updateData.image_key = imageKey;
    if (vehicles !== undefined) updateData.vehicles = vehicles;

    try {
      const { data, error } = await supabase
        .from('parts')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();
      if (!error && data) return data;
    } catch {}
    const p = _inMemoryParts.find(part => part.id === Number(id));
    if (p) {
      if (name !== undefined) p.name = name;
      if (imageKey !== undefined) p.image_key = imageKey;
      if (vehicles !== undefined) p.vehicles = vehicles;
      p.updated_at = updateData.updated_at;
      return p;
    }
    return null;
  },
  async deletePart(id) {
    try {
      await supabase.from('parts').delete().eq('id', id);
    } catch {}
    const idx = _inMemoryParts.findIndex(p => p.id === Number(id));
    if (idx !== -1) _inMemoryParts.splice(idx, 1);
  },

  // --- Image storage ---
  async getImageByPartId(id) {
    const { data, error } = await supabase
      .from('parts')
      .select('image_key')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data;
  },

  // --- Vehicle suggestions ---
  async vehicleSuggest(query) {
    const { data, error } = await supabase.from('parts').select('vehicles');
    if (error) return [];
    const seen = new Set();
    const results = [];
    const qLower = query.toLowerCase();
    for (const p of data || []) {
      const arr = Array.isArray(p.vehicles) ? p.vehicles : JSON.parse(p.vehicles || '[]');
      for (const v of arr) {
        const key = v.toLowerCase();
        if (!seen.has(key) && v.toLowerCase().includes(qLower)) {
          seen.add(key);
          results.push(v);
          if (results.length >= 10) return results;
        }
      }
    }
    return results;
  },

  // --- Login attempts (in-memory, per serverless invocation) ---
  // Note: In production on Vercel, each function invocation is separate.
  // For a single admin, this is acceptable. Use Supabase table if needed.
  _loginAttempts: new Map(),
  async getLoginAttempt(ip) {
    return this._loginAttempts.get(ip) || null;
  },
  async setLoginAttempt(ip, failedCount, windowStart) {
    this._loginAttempts.set(ip, { count: failedCount, firstAttempt: windowStart });
  },
  async deleteLoginAttempt(ip) {
    this._loginAttempts.delete(ip);
  },
};

// Expose supabase client for direct use in routes
stmt.supabase = supabase;

module.exports = { supabase, stmt };
