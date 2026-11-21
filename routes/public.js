// Public API routes for Supabase Postgres.
// TechSpec.md section 6.1.

'use strict';

const express = require('express');
const router = express.Router();
const { stmt } = require('../db');
const { getImageUrl } = require('../lib/uploads');

// GET /api/config - business name and WhatsApp number for the customer site.
router.get('/config', async (req, res) => {
  const sName = await stmt.getSetting('business_name');
  const sWa = await stmt.getSetting('whatsapp_number');
  res.json({
    businessName: sName.value || 'Sai Rudra Motors',
    whatsappNumber: sWa.value || '918660957903',
  });
});

// GET /api/suppliers - all suppliers with part counts, sorted by name.
router.get('/suppliers', async (req, res) => {
  const rows = await stmt.listSuppliers();
  // Add logo URL for each supplier
  const suppliersWithLogo = rows.map((s) => ({
    ...s,
    logoUrl: s.logo ? '/logos/' + s.logo : null,
  }));
  res.json(suppliersWithLogo);
});

// GET /api/suppliers/:id/parts?vehicle=
router.get('/suppliers/:id/parts', async (req, res) => {
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

  const partsWithUrl = parts.map((p) => ({
    ...p,
    imageUrl: getImageUrl(p.image_key),
  }));

  res.json({ supplier, vehicles, parts: partsWithUrl });
});

module.exports = router;
