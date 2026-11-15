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
  assert.strictEqual(r.body.businessName, 'Sai Rudra Motors');
  assert.strictEqual(r.body.whatsappNumber, '918660957903');
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

test('POST /api/admin/logout', async () => {
  const s = await request('GET', base + '/api/admin/session');
  adminCsrf = s.body.csrfToken;
  const r = await request('POST', base + '/api/admin/logout', {}, { 'X-CSRF-Token': adminCsrf });
  assert.strictEqual(r.status, 200);
  const r2 = await request('GET', base + '/api/admin/session');
  assert.strictEqual(r2.body.loggedIn, false);
  server.close();
});
