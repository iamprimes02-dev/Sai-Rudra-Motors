// Authentication and session guards for serverless (Vercel) deployment.
// Sessions are stored as signed cookies (HMAC-SHA256 via Node crypto).
// No in-memory store — works across serverless invocations.
// TechSpec.md section 5.
// Rules.md section 5: Put auth logic in lib/auth.js.

'use strict';

const crypto = require('node:crypto');

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required.');
}

const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Create a signed session cookie payload.
 * Format: base64url(payload).base64url(HMAC-SHA256(SESSION_SECRET, base64url(payload)))
 */
function createSession(admin, csrfToken) {
  const payload = {
    admin: !!admin,
    exp: Date.now() + SESSION_MAX_AGE_MS,
    csrf: csrfToken || crypto.randomBytes(24).toString('hex'),
  };
  const payloadStr = JSON.stringify(payload);
  const payloadEncoded = Buffer.from(payloadStr, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payloadEncoded);
  const signature = hmac.digest('base64url');
  return payloadEncoded + '.' + signature;
}

/**
 * Verify and parse a signed session cookie. Returns null if invalid/expired.
 */
function verifySession(signed) {
  if (!signed || typeof signed !== 'string') return null;

  const dot = signed.lastIndexOf('.');
  if (dot <= 0) return null;

  const payloadPart = signed.slice(0, dot);
  const sigPart = signed.slice(dot + 1);

  // Recompute signature
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payloadPart);
  const expectedSig = hmac.digest('base64url');

  // Constant-time comparison
  const sigBuf = Buffer.from(sigPart, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  // Check expiry
  if (!payload.exp || Date.now() > payload.exp) return null;

  return payload;
}

/**
 * Build the Set-Cookie header value.
 */
function buildSessionCookie(signedValue, isProd) {
  return `${SESSION_COOKIE_NAME}=${signedValue}; HttpOnly; ${isProd ? 'Secure' : ''}; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_MS / 1000}`;
}

/**
 * Build the cookie clearing header for logout.
 */
function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

/**
 * Constant-time admin password check using native crypto.timingSafeEqual.
 */
function checkAdminPassword(submitted, adminPassword) {
  if (!submitted || !adminPassword) return false;
  const hashA = crypto.createHash('sha256').update(String(submitted)).digest();
  const hashB = crypto.createHash('sha256').update(String(adminPassword)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Login rate limit using in-memory Map.
 * Returns { allowed: boolean, remaining: number }.
 */
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map();

function checkLoginRateLimit(ip) {
  const now = Date.now();
  let record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > LOGIN_WINDOW_MS) {
    record = { count: 0, firstAttempt: now };
    loginAttempts.set(ip, record);
  }
  if (loginAttempts.size > 500) {
    for (const [key, val] of loginAttempts.entries()) {
      if (now - val.firstAttempt > LOGIN_WINDOW_MS) {
        loginAttempts.delete(key);
      }
    }
  }
  if (record.count >= LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS - record.count - 1 };
}

function recordLoginFailure(ip) {
  const now = Date.now();
  let record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > LOGIN_WINDOW_MS) {
    record = { count: 1, firstAttempt: now };
    loginAttempts.set(ip, record);
  } else {
    record.count += 1;
  }
}

function clearLoginRecord(ip) {
  loginAttempts.delete(ip);
}

/**
 * Extract CSRF token from request header or body.
 */
function getCsrfToken(request) {
  if (!request) return null;
  const h = request.headers;
  let token = null;
  if (h) {
    if (typeof h.get === 'function') {
      try { token = h.get('x-csrf-token'); } catch {}
    }
    if (!token && h['x-csrf-token']) {
      token = h['x-csrf-token'];
    }
  }
  if (!token && typeof request.header === 'function') {
    try { token = request.header('X-CSRF-Token'); } catch {}
  }
  if (!token && request.body && request.body.csrfToken) {
    token = request.body.csrfToken;
  }
  return token || null;
}

/**
 * Verify CSRF token matches the session's csrf value.
 */
function verifyCsrf(session, request) {
  const token = getCsrfToken(request);
  if (!token || !session || token !== session.csrf) return false;
  return true;
}

module.exports = {
  createSession,
  verifySession,
  buildSessionCookie,
  clearSessionCookie,
  checkAdminPassword,
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginRecord,
  getCsrfToken,
  verifyCsrf,
  SESSION_COOKIE_NAME,
};
