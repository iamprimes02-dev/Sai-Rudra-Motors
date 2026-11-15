# Technical Specification: Parts Catalogue Website

Version: 0.3
Date: 2026-11-15
Hosting: Vercel (Hobby plan). Database: Supabase Postgres. Image storage: Supabase Storage.
This version replaces the Cloudflare Workers stack (v0.2) with Vercel + Supabase per owner decision.

## 1. Stack (locked)

| Layer | Choice | Notes |
|-------|--------|-------|
| Hosting and runtime | Vercel (Node.js 22.13+) | Serverless functions. `npm run dev` uses `node --watch`. |
| Web framework | Express 5 (`express@^5.3.0`) | Already in `package.json`. |
| Sessions | Signed cookie (HMAC-SHA256 via Node `crypto`) | No server memory. Works on Vercel serverless. |
| Admin password | Plain secret `ADMIN_PASSWORD`, compared in constant time | Single admin. No hashing, no CPU cost on login. See section 5. |
| Database | Supabase Postgres | Accessed via `@supabase/supabase-js` with service role key. |
| Image storage | Supabase Storage | Accessed via Supabase Storage API. Bucket: `part-images`. |
| Frontend | Plain HTML, CSS, vanilla JavaScript in `public/` (customer) and `private/` (admin) | No build step, no framework. |
| Tests | `node:test` (built in) and `fetch` against a running server | No extra test framework needed in v1. |
| Module style | CommonJS (`require`) | Do not mix in ESM. |

Not part of this project: Docker, Telegram, NVIDIA NIM, AI features, Cloudflare Workers, D1, R2, Hono, Express-session in-memory store, bcrypt, `node:sqlite`, `multer`.

## 2. Repository Layout (target)

```
parts-site/
  index.js                 # server entry point (package.json "main" points here)
  package.json
  .env.example             # local secrets template (no real values)
  .gitignore
  vercel.json              # Vercel deployment config
  db.js                    # Supabase client + prepared statement wrappers
  lib/
    auth.js                # session guard (signed cookie), login, CSRF check
    uploads.js             # Supabase Storage put/get/delete, magic-byte checks
    validate.js            # input validation helpers (names, vehicles)
    whatsapp.js            # builds wa.me links and message text
  routes/
    public.js              # GET /api/suppliers, /api/suppliers/:id/parts, /api/config, /uploads/:id
    admin.js               # /api/admin/* (suppliers, parts, vehicles, settings, login, logout)
  public/                  # customer site (static, served by Vercel)
    index.html
    supplier.html
    css/styles.css
    js/app.js
    js/supplier.js
  private/                 # admin site (served only after login by index.js)
    login.html
    admin.html
    js/admin.js
    css/admin.css
  uploads/                 # local fallback for dev only; production uses Supabase Storage
  tests/
    api.test.js            # node:test API tests
    smoke.test.js          # end-to-end smoke tests
  docs/                    # these documents
```

Customer pages live in `public/`, served as static assets by Vercel. Admin pages live in `private/` and are only returned by `index.js` after the admin check passes.

## 3. Configuration

### 3.1 `vercel.json` (non-secret)

```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }],
  "env": {
    "ADMIN_PASSWORD": "@admin_password",
    "SESSION_SECRET": "@session_secret",
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "NODE_ENV": "production"
  }
}
```

### 3.2 Secrets (never in files or git)

| Name | Set with | Purpose |
|------|----------|---------|
| `ADMIN_PASSWORD` | Vercel env vars / `.env` | Admin login password. |
| `SESSION_SECRET` | Vercel env vars / `.env` | 64 random characters. Signs session cookies. |
| `SUPABASE_URL` | Vercel env vars / `.env` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env vars / `.env` | Supabase service role key (server-side only). |

Local development: copy `.env.example` to `.env` and fill in values. `.env` is git-ignored.

## 4. Data Model

See `Schema.md`. Summary:
- `settings(key, value)`: admin_hash, business_name, whatsapp_number, schema_version
- `suppliers(id, name, created_at)`
- `parts(id, supplier_id, name, image_key, vehicles JSON, created_at, updated_at)`

Images are stored in Supabase Storage under keys like `part-images/<uuid>.jpg`. The database stores only the key.

## 5. Authentication and Sessions

- Single admin account. Login: `POST /api/admin/login` with `{ password }`.
- Password check: compare the submitted password with `ADMIN_PASSWORD` using a constant-time comparison (HMAC both values with a random key, then compare the digests).
- On success: set a cookie `session` containing a signed payload `{ admin: true, exp, csrf }`.
  - Format: `base64url(payload).base64url(HMAC-SHA256(SESSION_SECRET, payload))`.
  - Verify the signature with `crypto.createHmac` before trusting the payload. Reject if expired.
- Cookie flags: `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`, `Max-Age` 8 hours.
- Logout: `POST /api/admin/logout` clears the cookie.
- Login rate limit: 5 failed attempts per IP per 15 minutes, stored in-memory (acceptable for single admin on Vercel Hobby). Return 429 when exceeded. Clear the record on success.
- CSRF: the `csrf` value inside the signed cookie is returned by `GET /api/admin/session`. Every `POST`, `PUT`, `PATCH`, `DELETE` under `/api/admin` must send header `X-CSRF-Token` matching it. Reject with 403 otherwise.
- Why no password hash: a single admin with a long random password does not need a slow hash, and a slow hash would exceed Vercel Hobby's function timeout/CPU limits.

## 6. API

All JSON. Errors use `{ "error": "message" }` with the right HTTP status.

### 6.1 Public

| Method | Path | Response |
|--------|------|----------|
| GET | `/` | `public/index.html` |
| GET | `/supplier/:id` | `public/supplier.html` |
| GET | `/api/config` | `{ "businessName": "...", "whatsappNumber": "91XXXXXXXXXX" }` (`null` until set) |
| GET | `/api/suppliers` | `[ { "id", "name", "partCount" } ]` sorted by name |
| GET | `/api/suppliers/:id/parts?vehicle=` | `{ "supplier": {id,name}, "vehicles": ["..."], "parts": [ { "id","name","image_key","vehicles" } ] }`. `image_key` is the Supabase Storage path. Frontend builds URL via `/uploads/<id>`. |
| GET | `/uploads/:id` | Image from Supabase Storage proxied through the Worker. Cache-Control: `public, max-age=31536000, immutable`. |

### 6.2 Admin (session required)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/admin/login` | | `private/login.html` |
| GET | `/admin` | | `private/admin.html`. Redirects to `/admin/login` if not logged in. |
| GET | `/api/admin/session` | | `{ "loggedIn": bool, "csrfToken": "..." }` |
| POST | `/api/admin/login` | `{ password }` | `{ ok: true }`, 401, or 429 |
| POST | `/api/admin/logout` | | `{ ok: true }` |
| GET | `/api/admin/suppliers` | | Public list plus `createdAt` |
| POST | `/api/admin/suppliers` | `{ name }` | 201 `{ id, name }`. 409 if name exists. |
| PATCH | `/api/admin/suppliers/:id` | `{ name }` | `{ id, name }` |
| DELETE | `/api/admin/suppliers/:id` | | `{ ok: true, deletedParts: n }`. Deletes Supabase Storage images. |
| GET | `/api/admin/suppliers/:id/parts` | | Parts for that supplier |
| POST | `/api/admin/suppliers/:id/parts` | multipart: `image` (file), `vehicles` (JSON array string), `name` (optional) | 201 `{ id, ... }` |
| PATCH | `/api/admin/parts/:id` | multipart, all optional: `image`, `vehicles`, `name` | `{ id, ... }`. New image replaces the old Supabase Storage object. |
| DELETE | `/api/admin/parts/:id` | | `{ ok: true }`. Deletes the Supabase Storage object. |
| GET | `/api/admin/vehicles/suggest?q=` | | Up to 10 matching vehicle strings |
| GET | `/api/admin/settings` | | `{ businessName, whatsappNumber }` |
| PUT | `/api/admin/settings` | `{ businessName, whatsappNumber }` | Same object. Number: digits only, 8 to 15 digits. |

## 7. Uploads (Supabase Storage)

### 7.1 Rules
- Accepted types: JPEG, PNG, WebP. Checked by magic bytes (`FF D8 FF`, `89 50 4E 47`, `RIFF....WEBP`), not by extension or client MIME type.
- Max size: 5 MB, checked before reading the whole body.
- Key format: `part-images/<uuid>.<ext>`. The original filename is never used.
- Written via Supabase Storage `upload()`.

### 7.2 Write order (avoid orphans)
1. Validate the upload.
2. Put the object in Supabase Storage.
3. Insert or update the Postgres row.
4. If step 3 fails, delete the Supabase Storage object. If step 3 succeeds and an old image exists, delete the old Supabase Storage object.

### 7.3 Vehicles
- Array of strings. 1 to 20 items.
- Each trimmed, whitespace collapsed, 2 to 80 characters.
- Case-insensitive duplicates removed; first spelling kept.

### 7.4 Image size
- v1: store as uploaded, 5 MB max. No resizing.

### 7.5 Cleanup
- Deleting a part deletes its Supabase Storage object.
- Deleting a supplier deletes the Supabase Storage objects of all its parts, then deletes the rows.

## 8. Frontend Behaviour

### 8.1 Customer
- Plain HTML, `fetch` to `/api/*`.
- All text set with `textContent`. Never `innerHTML` with user data.
- Vehicle filter is a `<select>` filled from `vehicles` in the parts response. Filtering happens in the browser.
- Images: `loading="lazy"`, 4:3 box, `object-fit: contain`.

### 8.2 Contact Us
- Built by `lib/whatsapp.js` (server, for tests) and mirrored in `public/js/app.js`.
- URL: `https://wa.me/<number>?text=<encodeURIComponent(message)>`.
- If `whatsappNumber` is null, Contact buttons are hidden and a notice is shown.
- Message template (v1, fixed):

```
Hello, I am interested in this part from {SUPPLIER}.
Part: {PART_NAME_OR_REF}
Vehicles: {VEHICLES}
Please let me know if it is available. Thank you.
```

- `PART_NAME_OR_REF`: part name if set, else `Part #{id}`.
- Header Contact message: `Hello, I would like to enquire about parts.`

### 8.3 Admin
- Login form posts JSON. CSRF token kept in page memory, not localStorage.
- Add-part form: image (preview), vehicles (tag input with suggestions), part name (optional), supplier (pre-selected).
- Delete actions show a confirm dialog listing what will be deleted.

## 9. Error Handling and Logging

- Express error handler: JSON for `/api/*`, plain HTML page otherwise.
- Status codes: 400 validation, 401 not logged in, 403 CSRF, 404 not found, 409 name conflict, 413 too large, 415 wrong file type, 429 rate limited.
- Log admin write actions with `console.log` (action, id, time). Never log passwords, cookies, or CSRF tokens. Vercel logs are viewable in the dashboard.
- Production shows no stack traces.

## 10. Scripts

| Script | Command |
|--------|---------|
| `start` | `node index.js` |
| `dev` | `node --watch index.js` |
| `test` | `node --test tests/` |
| `smoke` | `node --test tests/smoke.test.js` |

## 11. Backup and Deployment

### 11.1 Backup
- Database: Use Supabase dashboard to export, or `pg_dump` against the Supabase connection string. Run weekly at minimum.
- Images: Copy the Supabase Storage `part-images` bucket via Supabase dashboard or API.
- Store backups outside the repo.

### 11.2 Deployment steps (first time)
1. Create a Supabase project at https://app.supabase.com
2. Run the schema SQL from `Schema.md` in the Supabase SQL Editor
3. Create a Storage bucket named `part-images` (public)
4. Create a Vercel project connected to this git repo
5. Set env vars in Vercel: `ADMIN_PASSWORD`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`
6. Deploy on Vercel
7. Attach custom domain (Q6) in Vercel dashboard, or use the `.vercel.app` domain

## 12. Plan and Limits to Verify

Verify these against Vercel and Supabase current pricing pages before go-live:
- **Vercel Hobby:** Serverless function timeout (10s), memory (1024 MB), bandwidth (100 GB/mo). Image uploads and login should stay well under.
- **Supabase free tier:** 500 MB database, 1 GB storage, 2 GB bandwidth. Confirm they cover about 500 parts and 5 MB images.
- **Commercial use:** Supabase free tier allows commercial use. Vercel Hobby is for personal/hobby use; for business use, Vercel Pro may be needed.

## 13. Non-Functional Targets

- Customer JavaScript under 50 KB, no third-party scripts.
- No external CDN dependencies, so the site works without third-party hosts.
- System font stack only.
- Images served with long-lived cache headers (keys never change).
