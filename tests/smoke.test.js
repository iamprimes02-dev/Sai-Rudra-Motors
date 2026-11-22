// Smoke test: end-to-end critical path.
// TechSpec.md section 10: `smoke` = `node --test tests/smoke.test.js`.
// PRD section 7: Success criteria 1-4.

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { test, after } = require('node:test');
const assert = require('node:assert');

// --- Use a separate test database via env vars ---
process.env.SUPABASE_URL = process.env.SUPABASE_URL || '';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
process.env.ADMIN_PASSWORD = 'smokepass123';
process.env.SESSION_SECRET = 'smoke-secret-1234567890abcdef';
process.env.NODE_ENV = 'development';
process.env.PORT = '3098';

// Start the server in-process
const app = require(path.join(__dirname, '..', 'index.js'));
const server = http.createServer(app);
server.listen(3098);

after(() => {
  try { server.close(); } catch {}
});

const base = 'http://localhost:3098';
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

function formRequest(method, url, fields, files, headers = {}) {
  return new Promise((resolve, reject) => {
    const boundary = '----SmokeBoundary' + Math.random().toString(36).slice(2);
    const u = new URL(url);
    const parts = [];
    const crlf = Buffer.from('\r\n', 'utf8');

    for (const [key, value] of Object.entries(fields)) {
      parts.push(Buffer.from('--' + boundary + '\r\n', 'utf8'));
      parts.push(Buffer.from('Content-Disposition: form-data; name="' + key + '"\r\n\r\n', 'utf8'));
      parts.push(Buffer.from(String(value), 'utf8'));
      parts.push(crlf);
    }

    for (const [key, filePath] of Object.entries(files)) {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : 'image/webp';
      parts.push(Buffer.from('--' + boundary + '\r\n', 'utf8'));
      parts.push(Buffer.from('Content-Disposition: form-data; name="' + key + '"; filename="upload' + ext + '"\r\n', 'utf8'));
      parts.push(Buffer.from('Content-Type: ' + mime + '\r\n\r\n', 'utf8'));
      parts.push(content);
      parts.push(crlf);
    }

    parts.push(Buffer.from('--' + boundary + '--\r\n', 'utf8'));

    const bodyBuffer = Buffer.concat(parts);
    const opts = {
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': bodyBuffer.length, ...headers },
    };
    if (cookies.length) opts.headers['Cookie'] = cookies.join('; ');

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
    req.write(bodyBuffer);
    req.end();
  });
}

test('smoke: admin login works', async () => {
  const r = await request('POST', base + '/api/admin/login', { password: 'smokepass123' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.ok, true);

  const s = await request('GET', base + '/api/admin/session');
  assert.strictEqual(s.body.loggedIn, true);
  adminCsrf = s.body.csrfToken;
});

test('smoke: add supplier via admin', async () => {
  const r = await request('POST', base + '/api/admin/suppliers', { name: 'Sai Rudra Supplier' }, { 'X-CSRF-Token': adminCsrf });
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  // Clean up
  await request('DELETE', base + '/api/admin/suppliers/' + r.body.id, {}, { 'X-CSRF-Token': adminCsrf });
});

test('smoke: add part via admin with image', async () => {
  const list = await request('GET', base + '/api/admin/suppliers');
  const supplierId = list.body[0].id;

  const imgPath = path.join(__dirname, 'smoke-part.jpg');
  fs.writeFileSync(imgPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

  const r = await formRequest('POST', base + '/api/admin/suppliers/' + supplierId + '/parts', {
    name: 'Smoke Test Part',
    vehicles: JSON.stringify(['Maruti Swift 2018-2022']),
  }, { image: imgPath }, { 'X-CSRF-Token': adminCsrf });
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  fs.unlinkSync(imgPath);

  // Clean up
  if (r.body.id) {
    await request('DELETE', base + '/api/admin/parts/' + r.body.id, {}, { 'X-CSRF-Token': adminCsrf });
  }
});

test('smoke: public page shows no price text', async () => {
  const r = await request('GET', base + '/api/suppliers');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.length >= 1);

  const supplierId = r.body[0].id;
  const p = await request('GET', base + '/api/suppliers/' + supplierId + '/parts');
  assert.strictEqual(p.status, 200);
  assert.ok(p.body.parts.length >= 1);

  // Check no price-related text anywhere in API responses
  const allText = JSON.stringify(r.body) + JSON.stringify(p.body);
  assert.ok(!allText.toLowerCase().includes('price'), 'No price text in API response');
});

test('smoke: config returns business name', async () => {
  const r = await request('GET', base + '/api/config');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.businessName && r.body.businessName.includes('Sai Rudra Motors'));
});

test('smoke: admin pages reject unauthenticated access', async () => {
  await request('POST', base + '/api/admin/logout', {}, { 'X-CSRF-Token': adminCsrf });

  const r = await request('GET', base + '/api/admin/suppliers');
  assert.strictEqual(r.status, 401);
  server.close();
});
