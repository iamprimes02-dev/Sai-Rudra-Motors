// Admin API routes for Supabase Postgres.
// TechSpec.md section 6.2.
// All write routes are protected by session + CSRF inside each handler.

'use strict';

const express = require('express');
const path = require('node:path');
const { stmt } = require('../db');
const {
  createSession,
  verifySession,
  buildSessionCookie,
  clearSessionCookie,
  checkAdminPassword,
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginRecord,
  verifyCsrf,
} = require('../lib/auth');
const {
  validateSupplierName,
  validatePartName,
  validateVehicles,
  validateWhatsappNumber,
} = require('../lib/validate');
const {
  parseMultipart,
  validateImageBuffer,
  saveImageFile,
  deleteImageFile,
  getImageUrl,
  multerErrorStatus: multerErrorStatusFallback,
} = require('../lib/uploads');
const crypto = require('node:crypto');

const router = express.Router();
const PRIVATE_DIR = path.join(__dirname, '..', 'private');

// Login attempt tracking for serverless: stored in Supabase login_attempts table.
// We use the stmt methods for persistence.
const SESSION_COOKIE_NAME = 'session';

// --- Login page (no auth needed) ---
router.get('/login', (req, res) => {
  res.sendFile(path.join(PRIVATE_DIR, 'login.html'));
});

// --- Session info (returns CSRF token) ---
router.get('/session', (req, res) => {
  const session = req.session || null;
  const csrfToken = session?.csrf || crypto.randomBytes(24).toString('hex');
  res.json({
    loggedIn: !!session?.admin,
    csrfToken,
  });
});

// --- Login ---
router.post('/login', async (req, res) => {
  const { password } = req.body;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Rate limit check
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many failed login attempts. Try again in 15 minutes.' });
  }

  const ok = await checkAdminPassword(password, process.env.ADMIN_PASSWORD);
  if (!ok) {
    recordLoginFailure(ip);
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  // Success: clear failure record, create session
  clearLoginRecord(ip);
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const signed = createSession(true, csrfToken);

  res.setHeader('Set-Cookie', buildSessionCookie(signed, process.env.NODE_ENV === 'production'));
  return res.status(200).json({ ok: true, csrfToken });
});

// --- Logout ---
router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(200).json({ ok: true });
});

// Middleware: load session from cookie
function loadSession(req, res, next) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/session=([^;]+)/);
  if (match) {
    const session = verifySession(match[1]);
    req.session = session;
  } else {
    req.session = null;
  }
  next();
}

router.use(loadSession);

// Middleware: require admin + CSRF for write routes
async function adminWriteMiddleware(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: 'Admin login required.' });
  }
  if (!verifyCsrf(req.session, req)) {
    return res.status(403).json({ error: 'CSRF token missing or invalid.' });
  }
  next();
}

// GET /api/admin/suppliers
router.get('/suppliers', loadSession, async (req, res) => {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: 'Admin login required.' });
  }
  const rows = await stmt.listSuppliers();
  res.json(rows);
});

// POST /api/admin/suppliers
router.post('/suppliers', adminWriteMiddleware, async (req, res) => {
  const validation = validateSupplierName(req.body.name);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const existing = await stmt.getSupplierByName(validation.value);
  if (existing) {
    return res.status(409).json({ error: 'This supplier already exists.' });
  }

  const supplier = await stmt.createSupplier(validation.value, req.body.logo || null);
  return res.status(201).json({ id: supplier.id, name: supplier.name, logo: supplier.logo });
});

// PATCH /api/admin/suppliers/:id
router.patch('/suppliers/:id', adminWriteMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const validation = validateSupplierName(req.body.name);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const existing = await stmt.getSupplierByName(validation.value);
  if (existing && existing.id !== id) {
    return res.status(409).json({ error: 'This supplier already exists.' });
  }

  const supplier = await stmt.updateSupplier(validation.value, id, req.body.logo || null);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }
  return res.json({ id: supplier.id, name: supplier.name, logo: supplier.logo });
});

// DELETE /api/admin/suppliers/:id
router.delete('/suppliers/:id', adminWriteMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  const supplier = await stmt.getSupplierById(id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  // Delete Supabase Storage images of all parts first
  const parts = await stmt.listPartsBySupplier(id);
  for (const part of parts) {
    if (part.image_key) {
      await deleteImageFile(part.image_key);
    }
  }

  await stmt.deleteSupplier(id);
  return res.json({ ok: true, deletedParts: parts.length });
});

// GET /api/admin/suppliers/:id/parts
router.get('/suppliers/:id/parts', loadSession, async (req, res) => {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: 'Admin login required.' });
  }
  const id = Number(req.params.id);

  const supplier = await stmt.getSupplierById(id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  const parts = await stmt.listPartsBySupplier(id);
  const partsWithUrl = parts.map((p) => ({
    ...p,
    imageUrl: getImageUrl(p.image_key),
  }));

  return res.json({ supplier, parts: partsWithUrl });
});

// POST /api/admin/suppliers/:id/parts (multipart)
router.post('/suppliers/:id/parts', adminWriteMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  const supplier = await stmt.getSupplierById(id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  if (!req.rawBody) {
    return res.status(400).json({ error: 'No request body.' });
  }

  let { fields, files } = await parseMultipart({
    headers: req.headers,
    rawBody: req.rawBody,
  });
  const file = files.image;
  if (!file) {
    return res.status(400).json({ error: 'Image is required.' });
  }

  if (file.size > 5 * 1024 * 1024) {
    return res.status(413).json({ error: 'File too large.' });
  }

  const ext = validateImageBuffer(file.data);
  if (!ext) {
    return res.status(415).json({ error: 'Only JPG, PNG, or WebP images are accepted.' });
  }

  const nameValidation = validatePartName(fields.name);
  if (!nameValidation.ok) {
    return res.status(400).json({ error: nameValidation.error });
  }

  const vehiclesValidation = validateVehicles(fields.vehicles);
  if (!vehiclesValidation.ok) {
    return res.status(400).json({ error: vehiclesValidation.error });
  }

  // Write order: put to Supabase Storage first, then Postgres row
  let imageKey = null;
  try {
    imageKey = await saveImageFile(file.data, ext);
    const part = await stmt.createPart(
      id,
      nameValidation.value,
      imageKey,
      vehiclesValidation.value
    );
    return res.status(201).json({ id: part.id, ...part, imageUrl: getImageUrl(part.image_key) });
  } catch (err) {
    // If Postgres write fails, delete the Storage object to avoid orphans
    if (imageKey) {
      await deleteImageFile(imageKey);
    }
    return res.status(500).json({ error: 'Failed to save part.' });
  }
});

// PATCH /api/admin/parts/:id (multipart)
router.patch('/parts/:id', adminWriteMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  const part = await stmt.getPartById(id);
  if (!part) {
    return res.status(404).json({ error: 'Part not found.' });
  }

  if (!req.rawBody) {
    return res.status(400).json({ error: 'No request body.' });
  }

  let { fields, files } = await parseMultipart({
    headers: req.headers,
    rawBody: req.rawBody,
  });

  let newImageKey = part.image_key;
  const file = files.image;
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large.' });
    }
    const ext = validateImageBuffer(file.data);
    if (!ext) {
      return res.status(415).json({ error: 'Only JPG, PNG, or WebP images are accepted.' });
    }
    newImageKey = await saveImageFile(file.data, ext);
  }

  const nameValidation = validatePartName(fields.name);
  if (!nameValidation.ok) {
    if (newImageKey !== part.image_key) {
      await deleteImageFile(newImageKey);
    }
    return res.status(400).json({ error: nameValidation.error });
  }

  let vehiclesJson = part.vehicles;
  if (fields.vehicles !== undefined) {
    const vehiclesValidation = validateVehicles(fields.vehicles);
    if (!vehiclesValidation.ok) {
      if (newImageKey !== part.image_key) {
        await deleteImageFile(newImageKey);
      }
      return res.status(400).json({ error: vehiclesValidation.error });
    }
    vehiclesJson = vehiclesValidation.value;
  }

  // Write order: put new Storage object first, then update Postgres row, then delete old Storage object
  const oldImageKey = part.image_key;
  try {
    const updated = await stmt.updatePart(id, nameValidation.value, newImageKey, vehiclesJson);
    if (oldImageKey && oldImageKey !== newImageKey) {
      await deleteImageFile(oldImageKey);
    }
    return res.json({ id: updated.id, ...updated, imageUrl: getImageUrl(updated.image_key) });
  } catch (err) {
    if (newImageKey !== oldImageKey) {
      await deleteImageFile(newImageKey);
    }
    return res.status(500).json({ error: 'Failed to update part.' });
  }
});

// DELETE /api/admin/parts/:id
router.delete('/parts/:id', adminWriteMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  const part = await stmt.getPartById(id);
  if (!part) {
    return res.status(404).json({ error: 'Part not found.' });
  }

  if (part.image_key) {
    await deleteImageFile(part.image_key);
  }
  await stmt.deletePart(id);
  return res.json({ ok: true });
});

// GET /api/admin/vehicles/suggest?q=
router.get('/vehicles/suggest', loadSession, async (req, res) => {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: 'Admin login required.' });
  }
  const q = req.query.q || '';
  const suggestions = await stmt.vehicleSuggest(q);
  return res.json(suggestions.map((r) => r.vehicle));
});

// GET /api/admin/settings
router.get('/settings', loadSession, async (req, res) => {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: 'Admin login required.' });
  }
  const sName = await stmt.getSetting('business_name');
  const sWa = await stmt.getSetting('whatsapp_number');
  return res.json({
    businessName: sName.value || 'Sai Rudra Motors',
    whatsappNumber: sWa.value || '918660957903',
  });
});

// PUT /api/admin/settings
router.put('/settings', adminWriteMiddleware, async (req, res) => {
  const businessNameValidation = validateSupplierName(req.body.businessName);
  if (!businessNameValidation.ok) {
    return res.status(400).json({ error: businessNameValidation.error });
  }

  const whatsappValidation = validateWhatsappNumber(req.body.whatsappNumber);
  if (!whatsappValidation.ok) {
    return res.status(400).json({ error: whatsappValidation.error });
  }

  await stmt.setSetting('business_name', businessNameValidation.value);
  await stmt.setSetting('whatsapp_number', whatsappValidation.value);

  return res.json({
    businessName: businessNameValidation.value,
    whatsappNumber: whatsappValidation.value,
  });
});

// --- Multer error handler for admin routes ---
router.use((err, req, res, next) => {
  if (err) {
    let status = 500;
    if (err.message === 'UNSUPPORTED_TYPE') status = 415;
    if (err.code === 'LIMIT_FILE_SIZE') status = 413;
    return res.status(status).json({ error: err.message || 'Upload failed.' });
  }
  next();
});

module.exports = router;
