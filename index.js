// index.js - Server entry point for Sai Rudra Motors parts catalogue.
// Express 5, Supabase Postgres, signed-cookie sessions.
// CommonJS. Deployed on Vercel via @vercel/node.
'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require('node:path');
const fs = require('node:fs');

// --- Load .env if present (simple parser, no extra dependency) ---
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  }
}
loadEnv();

// --- Fail fast if required secrets are missing ---
if (!process.env.ADMIN_PASSWORD) {
  console.error('FATAL: ADMIN_PASSWORD environment variable is required.');
  process.exit(1);
}
if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is required.');
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

// --- Require db.js (initialises Supabase client, settings) ---
require('./db');

const {
  createSession,
  verifySession,
  buildSessionCookie,
  clearSessionCookie,
} = require('./lib/auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PRIVATE_DIR = path.join(__dirname, 'private');

// --- Simple cookie parser (no extra dependency) ---
function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = {};
  cookieHeader.split(';').forEach((pair) => {
    const eq = pair.indexOf('=');
    if (eq > 0) {
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      cookies[name] = value;
    }
  });
  return cookies;
}

app.use((req, res, next) => {
  req.cookies = parseCookies(req);
  next();
});

// --- Body parsing ---
// Capture raw body for multipart/form-data requests (needed for file uploads).
// bodyParser skips multipart requests.
app.use((req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      req.rawBody = Buffer.concat(chunks);
      next();
    });
  } else {
    next();
  }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Sessions (signed cookie, serverless-compatible) ---
app.use((req, res, next) => {
  req.session = null;

  const cookie = req.headers.cookie || '';
  const match = cookie.match(/session=([^;]+)/);
  if (match) {
    const session = verifySession(match[1]);
    if (session) {
      req.session = session;
    }
  }

  // Save session on response (for login which creates a new session)
  const originalJson = res.json;
  res.json = function (body) {
    // If this is a login response with a Set-Cookie header, the cookie was already set
    return originalJson.call(this, body);
  };

  next();
});

// --- API routes (public) ---
app.use('/api', publicRoutes);

// --- API routes (admin, auth+CSRF protected inside the route module) ---
app.use('/api/admin', adminRoutes);

// --- HTML pages (public) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/supplier/:id', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'supplier.html'));
});

// --- Admin HTML ---
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(PRIVATE_DIR, 'login.html'));
});

app.get('/admin', (req, res) => {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/session=([^;]+)/);
  let isAdmin = false;
  if (match) {
    const session = verifySession(match[1]);
    isAdmin = session && session.admin;
  }
  if (!isAdmin) {
    return res.redirect('/admin/login');
  }
  res.sendFile(path.join(PRIVATE_DIR, 'admin.html'));
});

// Serve admin static assets (CSS, JS) under /admin
app.use('/admin', (req, res, next) => {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/session=([^;]+)/);
  let isAdmin = false;
  if (match) {
    const session = verifySession(match[1]);
    isAdmin = session && session.admin;
  }

  const url = req.url;
  if (url.endsWith('admin.js') || url.endsWith('admin.css')) {
    if (!isAdmin) {
      return res.status(401).json({ error: 'Admin login required.' });
    }
  }

  const filePath = path.join(PRIVATE_DIR, url.replace('/admin/', ''));
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('Asset not found.');
    }
  });
});

// Serve customer static assets (CSS, JS)
app.use(express.static(PUBLIC_DIR));

// Note: images are proxied through /uploads/:id from Supabase Storage (see routes/public.js)

// --- 404 ---
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  res.status(404).send('<h1>404 Not Found</h1>');
});

// --- Error handler ---
app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  if (req.path.startsWith('/api/')) {
    const status = err.status || 500;
    res.status(status).json({ error: isProd ? 'Server error.' : err.message });
    return;
  }
  res.status(500).send('<h1>500 Server Error</h1>');
});

// Only start listening when run directly, not when required by tests or Vercel.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Sai Rudra Motors parts catalogue listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
