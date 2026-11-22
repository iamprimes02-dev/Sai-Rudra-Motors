// Public API routes for Supabase Postgres.
// TechSpec.md section 6.1.

'use strict';

const express = require('express');
const router = express.Router();
const { stmt } = require('../db');
const { getImageUrl } = require('../lib/uploads');

// GET /api/config - business name and WhatsApp number for the customer site.
router.get('/config', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const sName = await stmt.getSetting('business_name');
  const sWa = await stmt.getSetting('whatsapp_number');
  res.json({
    businessName: sName.value || 'Sai Rudra Motors',
    whatsappNumber: sWa.value || '',
  });
});

// GET /api/suppliers - all suppliers with part counts, sorted by name.
router.get('/suppliers', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const rows = await stmt.listSuppliers();
  // Add logo URL for each supplier
  const suppliersWithLogo = rows.map((s) => {
    const url = s.logo
      ? (s.logo.startsWith('http') ? s.logo : `/logos/${s.logo}`)
      : null;
    return {
      ...s,
      logoUrl: s.logoUrl || url,
      logo_url: s.logo_url || url,
    };
  });
  res.json(suppliersWithLogo);
});

// GET /api/suppliers/:id/parts?vehicle=
router.get('/suppliers/:id/parts', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const supplierId = Number(req.params.id);
  const vehicle = req.query.vehicle ? String(req.query.vehicle) : null;

  const supplier = await stmt.getSupplierById(supplierId);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  // Fetch all parts for this supplier once
  const allParts = await stmt.listPartsBySupplier(supplierId);

  // Distinct vehicles extracted from parts in memory (no duplicate query)
  const seen = new Set();
  const vehicles = [];
  for (const p of allParts) {
    const arr = Array.isArray(p.vehicles) ? p.vehicles : JSON.parse(p.vehicles || '[]');
    for (const v of arr) {
      if (!seen.has(v)) {
        seen.add(v);
        vehicles.push(v);
      }
    }
  }
  vehicles.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent' }));

  // Filter if vehicle query param is given
  let parts = allParts;
  if (vehicle) {
    const vLower = vehicle.toLowerCase();
    parts = allParts.filter((p) => {
      const arr = Array.isArray(p.vehicles) ? p.vehicles : JSON.parse(p.vehicles || '[]');
      return arr.some((v) => v.toLowerCase() === vLower);
    });
  }

  const partsWithUrl = parts.map((p) => {
    let vehiclesArr = [];
    if (Array.isArray(p.vehicles)) {
      vehiclesArr = p.vehicles;
    } else if (typeof p.vehicles === 'string') {
      try {
        vehiclesArr = JSON.parse(p.vehicles);
      } catch {
        vehiclesArr = [];
      }
    }
    const url = getImageUrl(p.image_key);
    return {
      ...p,
      vehicles: vehiclesArr,
      imageUrl: url,
      image_url: url,
    };
  });

  res.json({ supplier, vehicles, parts: partsWithUrl });
});

// POST /api/inquiries - Record customer stock check enquiry
router.post('/inquiries', async (req, res) => {
  const { name, phone, enquiryType, brand, vehicle, part } = req.body || {};
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name is required (at least 2 characters).' });
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
    return res.status(400).json({ error: 'Valid phone number is required.' });
  }
  if (!brand || typeof brand !== 'string' || !brand.trim()) {
    return res.status(400).json({ error: 'Brand is required.' });
  }
  if (!vehicle || typeof vehicle !== 'string' || !vehicle.trim()) {
    return res.status(400).json({ error: 'Vehicle details are required.' });
  }

  const inquiry = await stmt.createInquiry({
    name: name.trim().slice(0, 100),
    phone: phone.trim().slice(0, 25),
    enquiryType: (enquiryType && String(enquiryType).trim().slice(0, 50)) || 'Retail Enquiry',
    brand: brand.trim().slice(0, 80),
    vehicle: vehicle.trim().slice(0, 120),
    part: part ? String(part).trim().slice(0, 150) : null,
  });

  return res.status(201).json({ ok: true, id: inquiry ? inquiry.id : null });
});

module.exports = router;
