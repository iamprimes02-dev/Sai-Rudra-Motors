// API tests using node:test and fetch against a running server.
// TechSpec.md section 10: `test` = `node --test tests/`.
// Rules.md section 7: Tests use a separate test DB via env vars.

'use strict';

const http = require('node:http');
const path = require('node:path');
const { test, after } = require('node:test');
const assert = require('node:assert');

// --- Use a separate test database via env vars ---
process.env.SUPABASE_URL = process.env.SUPABASE_URL || '';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
process.env.ADMIN_PASSWORD = 'testpass123';
process.env.SESSION_SECRET = 'test-secret-1234567890abcdef';
process.env.NODE_ENV = 'development';
process.env.PORT = '3099';

// Start the server in-process by requiring index.js
const app = require(path.join(__dirname, '..', 'index.js'));
const server = http.createServer(app);
server.listen(3099);

after(() => {
  try { server.close(); } catch {}
});

const base = 'http://localhost:3099';
let cookies = [];
let adminCsrf = null;

function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (cookies.length) reqHeaders['Cookie'] = cookies.join('; ');
    const opts = { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: reqHeaders };
    if (body && !(body instanceof FormData)) opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    const req = http.request(opts, (res) => {
      const sc = res.headers['set-cookie'];
      if (sc) {
        const arr = Array.isArray(sc) ? sc : [sc];
        for (const c of arr) {
          const cookie = c.split(';')[0];
          if (cookie) {
            const name = cookie.split('=')[0];
            cookies = cookies.filter((c2) => !c2.startsWith(name + '='));
            cookies.push(cookie);
          }
        }
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed, raw });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('GET /api/config returns business config', async () => {
  const r = await request('GET', base + '/api/config');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.businessName && typeof r.body.businessName === 'string');
  assert.ok(r.body.whatsappNumber && /^\d{10,15}$/.test(r.body.whatsappNumber));
});

test('GET /api/suppliers returns list of authorized suppliers', async () => {
  const r = await request('GET', base + '/api/suppliers');
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body) && r.body.length >= 11);
  assert.ok(r.body.some((s) => s.name === 'Sangsin Brakes' && s.logoUrl));
});

test('GET /api/suppliers/99999/parts returns 404 for unknown supplier', async () => {
  const r = await request('GET', base + '/api/suppliers/99999/parts');
  assert.strictEqual(r.status, 404);
});

test('POST /api/admin/login wrong password returns 401', async () => {
  const r = await request('POST', base + '/api/admin/login', { password: 'wrong' });
  assert.strictEqual(r.status, 401);
});

test('POST /api/admin/login correct password returns 200', async () => {
  const r = await request('POST', base + '/api/admin/login', { password: 'testpass123' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.ok, true);
});

test('GET /api/admin/session shows logged in after login', async () => {
  const r = await request('GET', base + '/api/admin/session');
  assert.strictEqual(r.body.loggedIn, true);
  adminCsrf = r.body.csrfToken;
  assert.ok(adminCsrf);
});

test('POST /api/admin/suppliers without CSRF returns 403', async () => {
  const r = await request('POST', base + '/api/admin/suppliers', { name: 'NoCsrf' });
  assert.strictEqual(r.status, 403);
});

test('GET /api/admin/vehicles/suggest returns string suggestions', async () => {
  const r = await request('GET', base + '/api/admin/vehicles/suggest?q=');
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body));
  // Every item must be a non-null string, not null/undefined
  r.body.forEach((item) => {
    assert.strictEqual(typeof item, 'string');
    assert.notStrictEqual(item, null);
  });
});

test('admin supplier CRUD and settings workflow', async () => {
  // Create supplier
  const createRes = await request('POST', base + '/api/admin/suppliers', {
    name: 'Test Brand OEM',
    logo: null,
    description: 'Genuine brake pads and discs',
    category: 'Brakes',
  }, { 'X-CSRF-Token': adminCsrf });
  assert.strictEqual(createRes.status, 201);
  const supplierId = createRes.body.id;
  assert.ok(supplierId);
  assert.strictEqual(createRes.body.description, 'Genuine brake pads and discs');
  assert.strictEqual(createRes.body.category, 'Brakes');

  // Patch supplier
  const patchRes = await request('PATCH', base + `/api/admin/suppliers/${supplierId}`, {
    name: 'Test Brand Updated',
    description: 'Updated brake components',
    category: 'Braking Systems',
  }, { 'X-CSRF-Token': adminCsrf });
  assert.strictEqual(patchRes.status, 200);
  assert.strictEqual(patchRes.body.name, 'Test Brand Updated');
  assert.strictEqual(patchRes.body.description, 'Updated brake components');
  assert.strictEqual(patchRes.body.category, 'Braking Systems');

  // Get current settings to restore accurately
  const getSettingsRes = await request('GET', base + '/api/admin/settings', {}, { 'X-CSRF-Token': adminCsrf });
  const origName = getSettingsRes.body.businessName || 'Sai Rudra Motors';
  const origWa = getSettingsRes.body.whatsappNumber || '918660957903';

  // Update settings with 10-digit number directly (no country code)
  const putSettings10Res = await request('PUT', base + '/api/admin/settings', { businessName: 'Sai Rudra Motors Test', whatsappNumber: '9876543210' }, { 'X-CSRF-Token': adminCsrf });
  assert.strictEqual(putSettings10Res.status, 200);
  assert.strictEqual(putSettings10Res.body.whatsappNumber, '919876543210');

  // Restore settings to original
  await request('PUT', base + '/api/admin/settings', { businessName: origName, whatsappNumber: origWa }, { 'X-CSRF-Token': adminCsrf });

  // Delete supplier
  const delRes = await request('DELETE', base + `/api/admin/suppliers/${supplierId}`, {}, { 'X-CSRF-Token': adminCsrf });
  assert.strictEqual(delRes.status, 200);
  assert.strictEqual(delRes.body.ok, true);
});

test('customer inquiry submission and admin lead workflow', async () => {
  // Public inquiry submission
  const leadRes = await request('POST', base + '/api/inquiries', {
    name: 'Prakash Auto Garage',
    phone: '9876543210',
    enquiryType: 'Wholesale Enquiry',
    brand: 'Sangsin Brakes',
    vehicle: 'Swift 2019',
    part: 'Front Brake Pads',
  });
  assert.strictEqual(leadRes.status, 201);
  assert.strictEqual(leadRes.body.ok, true);
  const leadId = leadRes.body.id;
  assert.ok(leadId);

  // Admin listing inquiries
  const adminLeadsRes = await request('GET', base + '/api/admin/inquiries');
  assert.strictEqual(adminLeadsRes.status, 200);
  assert.ok(Array.isArray(adminLeadsRes.body));
  const found = adminLeadsRes.body.find(l => l.id === leadId);
  assert.ok(found);
  assert.strictEqual(found.name, 'Prakash Auto Garage');
  assert.strictEqual(found.enquiry_type, 'Wholesale Enquiry');

  // Admin deleting inquiry
  const delLeadRes = await request('DELETE', base + `/api/admin/inquiries/${leadId}`, {}, { 'X-CSRF-Token': adminCsrf });
  assert.strictEqual(delLeadRes.status, 200);
  assert.strictEqual(delLeadRes.body.ok, true);
});

test('POST /api/admin/logout', async () => {
  const s = await request('GET', base + '/api/admin/session');
  adminCsrf = s.body.csrfToken;
  const r = await request('POST', base + '/api/admin/logout', {}, { 'X-CSRF-Token': adminCsrf });
  assert.strictEqual(r.status, 200);
  const r2 = await request('GET', base + '/api/admin/session');
  assert.strictEqual(r2.body.loggedIn, false);
  server.close();
});
