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

  const parts = await stmt.listPartsBySupplier(supplierId, vehicle);
  const partsWithUrl = parts.map((p) => ({
    ...p,
    imageUrl: getImageUrl(p.image_key),
  }));

  // Distinct vehicles for filter dropdown
  const { data: allParts } = await stmt.supabase
    .from('parts')
    .select('vehicles')
    .eq('supplier_id', supplierId);

  const seen = new Set();
  const vehicles = [];
  for (const p of allParts || []) {
    const arr = Array.isArray(p.vehicles) ? p.vehicles : JSON.parse(p.vehicles || '[]');
    for (const v of arr) {
      if (!seen.has(v)) {
        seen.add(v);
        vehicles.push(v);
      }
    }
  }
  vehicles.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent' }));

  res.json({ supplier, vehicles, parts: partsWithUrl });
});

// GET /uploads/:id - serve image from Supabase Storage proxied through the server
router.get('/uploads/:id', async (req, res) => {
  const partId = Number(req.params.id);
  const imageData = await stmt.getImageByPartId(partId);
  if (!imageData || !imageData.image_key) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  // image_key is a Supabase Storage path like 'part-images/<uuid>.jpg'
  // Fetch from Supabase Storage and stream to client
  const { data, error } = await stmt.supabase.storage.from('part-images').download(imageData.image_key);
  if (error || !data) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType = data.type || 'application/octet-stream';
  res.set('Content-Type', contentType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(buffer);
});

module.exports = router;
