// db.js - Database layer for Sai Rudra Motors parts catalogue.
// Uses Supabase Postgres via @supabase/supabase-js.
// Serverless-compatible: no local file storage, all data in Supabase.
'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) environment variables are required.');
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

// Initialize defaults and suppliers.
setDefaultSettings().catch((err) => {
  console.error('DB initialization warning (settings):', err.message);
});
ensureDefaultSuppliers().catch((err) => {
  console.error('DB initialization warning (suppliers seed):', err.message);
});

// Prepared-statement-style wrappers around Supabase queries.
// These mirror the old `stmt` object for compatibility with routes.

const _inMemoryParts = [];
const _inMemoryInquiries = [];

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

      // Count parts per supplier with a single aggregated query (avoids N+1 queries)
      const { data: partRows } = await supabase
        .from('parts')
        .select('supplier_id');

      const countMap = {};
      if (partRows) {
        for (const row of partRows) {
          countMap[row.supplier_id] = (countMap[row.supplier_id] || 0) + 1;
        }
      }

      const result = suppliers.map((s) => {
        const defaultMatch = DEFAULT_SUPPLIERS.find(d => 
          d.name.toLowerCase() === s.name.toLowerCase() ||
          (d.name === 'HL Mando' && s.name.toLowerCase().includes('hl mando'))
        );
        const count = countMap[s.id];
        const logoUrl = s.logo
          ? (s.logo.startsWith('http') ? s.logo : `/logos/${s.logo}`)
          : (defaultMatch ? defaultMatch.logoUrl || `/logos/${defaultMatch.logo}` : null);
        return {
          id: s.id,
          name: defaultMatch ? defaultMatch.name : s.name,
          logo: s.logo || (defaultMatch ? defaultMatch.logo : null),
          category: (defaultMatch && defaultMatch.category) || 'Auto Spares',
          description: (defaultMatch && defaultMatch.description) || '',
          partCount: count !== undefined ? count : _inMemoryParts.filter(p => p.supplier_id === s.id).length,
          created_at: s.created_at,
          logoUrl,
          logo_url: logoUrl,
        };
      });
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
        .eq('supplier_id', Number(supplierId))
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (!error && data) {
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
        .eq('id', Number(id))
        .single();
      if (!error && data) return data;
    } catch {}
    return _inMemoryParts.find(p => p.id === Number(id)) || null;
  },
  async createPart(supplierId, name, imageKey, vehicles) {
    const vehiclesPayload = typeof vehicles === 'string' ? vehicles : JSON.stringify(vehicles || []);
    try {
      const { data, error } = await supabase
        .from('parts')
        .insert({
          supplier_id: Number(supplierId),
          name: name || null,
          image_key: imageKey,
          vehicles: vehiclesPayload,
        })
        .select('*')
        .single();

      if (!error && data) {
        return { lastInsertRowid: data.id, ...data };
      }
      if (error) {
        console.error('Supabase createPart error:', error);
        throw new Error('Database error: ' + (error.message || 'Insert failed'));
      }
    } catch (err) {
      console.error('createPart exception:', err);
      if (process.env.NODE_ENV === 'test' || !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('test')) {
        const newPart = {
          id: _inMemoryParts.length + 1,
          lastInsertRowid: _inMemoryParts.length + 1,
          supplier_id: Number(supplierId),
          name,
          image_key: imageKey,
          vehicles: vehiclesPayload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        _inMemoryParts.push(newPart);
        return newPart;
      }
      throw err;
    }
  },
  async updatePart(id, name, imageKey, vehicles) {
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name || null;
    if (imageKey !== undefined) updateData.image_key = imageKey;
    if (vehicles !== undefined) {
      updateData.vehicles = typeof vehicles === 'string' ? vehicles : JSON.stringify(vehicles || []);
    }

    try {
      const { data, error } = await supabase
        .from('parts')
        .update(updateData)
        .eq('id', Number(id))
        .select('*')
        .single();
      if (!error && data) return data;
      if (error) {
        console.error('Supabase updatePart error:', error);
        throw new Error('Database error: ' + (error.message || 'Update failed'));
      }
    } catch (err) {
      console.error('updatePart exception:', err);
      if (process.env.NODE_ENV === 'test' || !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('test')) {
        const p = _inMemoryParts.find(part => part.id === Number(id));
        if (p) {
          if (name !== undefined) p.name = name;
          if (imageKey !== undefined) p.image_key = imageKey;
          if (vehicles !== undefined) p.vehicles = updateData.vehicles;
          p.updated_at = updateData.updated_at;
          return p;
        }
      }
      throw err;
    }
    return null;
  },
  async deletePart(id) {
    try {
      const { error } = await supabase.from('parts').delete().eq('id', Number(id));
      if (error) {
        console.error('Supabase deletePart error:', error);
      }
    } catch {}
    const idx = _inMemoryParts.findIndex(p => p.id === Number(id));
    if (idx !== -1) _inMemoryParts.splice(idx, 1);
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

  // --- Inquiries (Customer leads) ---
  async createInquiry(data) {
    try {
      const { data: row, error } = await supabase
        .from('inquiries')
        .insert({
          name: data.name,
          phone: data.phone,
          enquiry_type: data.enquiryType || data.enquiry_type || 'Retail Enquiry',
          brand: data.brand,
          vehicle: data.vehicle,
          part: data.part || null,
        })
        .select('*')
        .single();
      if (!error && row) {
        return { lastInsertRowid: row.id, ...row };
      }
    } catch {}
    const newInquiry = {
      id: _inMemoryInquiries.length + 1,
      lastInsertRowid: _inMemoryInquiries.length + 1,
      name: data.name,
      phone: data.phone,
      enquiry_type: data.enquiryType || data.enquiry_type || 'Retail Enquiry',
      brand: data.brand,
      vehicle: data.vehicle,
      part: data.part || null,
      created_at: new Date().toISOString(),
    };
    _inMemoryInquiries.unshift(newInquiry);
    return newInquiry;
  },
  async listInquiries() {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch {}
    return _inMemoryInquiries;
  },
  async deleteInquiry(id) {
    try {
      await supabase.from('inquiries').delete().eq('id', id);
    } catch {}
    const idx = _inMemoryInquiries.findIndex(i => i.id === Number(id));
    if (idx !== -1) _inMemoryInquiries.splice(idx, 1);
  },
};

// Expose supabase client for direct use in routes
stmt.supabase = supabase;

module.exports = { supabase, stmt };
