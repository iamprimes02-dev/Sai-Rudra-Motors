// index.js - Server entry point for Sai Rudra Motors parts catalogue.
// Express 5, Supabase Postgres, signed-cookie sessions.
// CommonJS. Deployed on Vercel via @vercel/node.
'use strict';

const express = require('express');
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
// Capture raw body for multipart/form-data requests with strict max size guard (5 MB).
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

app.use((req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    const cl = Number(req.headers['content-length']);
    if (cl && cl > MAX_UPLOAD_SIZE) {
      return res.status(413).json({ error: 'File too large. Maximum size is 5 MB.' });
    }
    const chunks = [];
    let bytesReceived = 0;
    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
      if (bytesReceived > MAX_UPLOAD_SIZE) {
        req.destroy();
        return res.status(413).json({ error: 'File too large. Maximum size is 5 MB.' });
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!res.headersSent) {
        req.rawBody = Buffer.concat(chunks);
        next();
      }
    });
    req.on('error', (err) => {
      if (!res.headersSent) {
        next(err);
      }
    });
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Sessions (signed cookie, serverless-compatible) ---
app.use((req, res, next) => {
  req.session = null;
  const sessionToken = req.cookies.session;
  if (sessionToken) {
    const session = verifySession(sessionToken);
    if (session) {
      req.session = session;
    }
  }

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
  const sessionToken = req.cookies.session;
  const session = sessionToken ? verifySession(sessionToken) : null;
  if (!session || !session.admin) {
    return res.redirect('/admin/login');
  }
  res.sendFile(path.join(PRIVATE_DIR, 'admin.html'));
});

// Serve admin static assets (CSS, JS) under /admin
app.use('/admin', (req, res, next) => {
  const sessionToken = req.cookies.session;
  const session = sessionToken ? verifySession(sessionToken) : null;
  const isAdmin = !!(session && session.admin);

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
