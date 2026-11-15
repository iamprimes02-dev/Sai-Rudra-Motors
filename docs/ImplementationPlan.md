# Implementation Plan: Parts Catalogue Website

Version: 0.3
Date: 2026-11-15
Stack: Vercel + Express 5 + Supabase Postgres + Supabase Storage (decision D-11).

Read first: `PRD.md`, `TechSpec.md`, `AppFlow.md`, `Design.md`, `Schema.md`, `Rules.md`.
Track progress in `Tracker.md`. Every task ID below maps to a row in Tracker.md.

Status: The existing code (built with OpenCode, Express 5 + Supabase) must be audited first. See Phase 1, T-009.

## Phase 0: Repository Setup

| Task | Description | Acceptance |
|------|-------------|------------|
| T-000 | Initialise git, add `.gitignore` (node_modules, `.env`, `uploads/*`). | `git status` shows no ignored files. |
| T-001 | Add `.env.example` with `ADMIN_PASSWORD`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`, `NODE_ENV` (no values). | File exists, no secrets. |
| T-002 | Save these docs in `docs/`. | All 8 files present (Rules.md section 2). |

## Phase 1: Project Skeleton and Audit

| Task | Description | Acceptance |
|------|-------------|------------|
| T-009 | Audit existing code against these docs. Output PRESENT, MISSING, INCOMPLETE, CONFLICTING, with file and line references. Flag any Cloudflare, D1, R2, Hono, `wrangler.toml`, or price code. | Audit written to Tracker.md "Audit" section. No code changes yet. Owner reviews. |
| T-010 | Create or convert the project to Express 5: `index.js` server entry, `vercel.json` (main `index.js`, `@vercel/node`). Install `express`, `express-session` (removed), `multer` (removed), `bcryptjs` (removed), `@supabase/supabase-js`. | `npm start` runs and logs the port. |
| T-011 | `src/index.js`: Express app with a JSON error handler for `/api/*` and an HTML error page otherwise. | Unknown `/api` route returns 404 JSON. |
| T-012 | Remove obsolete code and dependencies from the Cloudflare stack (`wrangler.toml`, `src/`, `migrations/`, `@cloudflare/vitest-pool-workers`, `hono`, `wrangler`). Only after T-009 is approved. | `package.json` lists only the new stack. |
| T-013 | Scripts in `package.json`: `start`, `dev`, `test`, `smoke` (TechSpec 10). | Each script runs. |
| T-014 | Fail with a generic 500 if `ADMIN_PASSWORD` or `SESSION_SECRET` is missing. Never reveal which one. | Test: missing secret returns 500 and logs the name only. |

## Phase 2: Data Layer

| Task | Description | Acceptance |
|------|-------------|------------|
| T-020 | `db.js`: Supabase client + all Postgres queries as parameterized statements (Schema.md section 4). | Fresh DB and existing DB both work. |
| T-021 | Default settings `business_name`, `whatsapp_number` inserted on startup. | Settings present. |
| T-022 | `lib/validate.js`: supplier name, part name, vehicles array, WhatsApp number. | Unit tests cover valid and invalid input. |
| T-023 | `lib/whatsapp.js`: `buildContactLink(number, message)` and `buildPartMessage(...)`. | Unit test: spaces and line breaks encoded; null number returns null. |
| T-024 | Data access functions for suppliers, parts, settings (using parameterized statements). | Each function covered by an API or unit test. |

## Phase 3: Admin Authentication

| Task | Description | Acceptance |
|------|-------------|------------|
| T-030 | `lib/auth.js`: signed-cookie session create/verify (HMAC-SHA256 with Node `crypto`). Expiry checked. | Tampered cookie rejected; expired cookie rejected. |
| T-031 | `POST /api/admin/login`: constant-time password compare against `ADMIN_PASSWORD`. Sets cookie on success. | Correct password 200 with cookie; wrong 401; response never echoes the password. |
| T-032 | Login rate limit using in-memory Map: 5 failures per IP per 15 minutes. | 6th failed attempt returns 429. Success clears the record. |
| T-033 | `POST /api/admin/logout` clears cookie. `GET /api/admin/session` returns `loggedIn` and `csrfToken`. | Logout clears cookie. |
| T-034 | CSRF check on all write methods under `/api/admin`. | Write without matching `X-CSRF-Token` returns 403. |
| T-035 | Gate `GET /admin`, `private/admin.js`, `private/admin.css`, and all other `/api/admin/*` routes. | Anonymous requests refused or redirected. Test each route. |
| T-036 | Admin login page `private/login.html` and `private/js/admin.js` login logic. | Owner logs in and reaches dashboard. |

## Phase 4: Supplier Management (Admin)

| Task | Description | Acceptance |
|------|-------------|------------|
| T-040 | `GET /api/admin/suppliers`, `POST` (create). | 201 on create; 409 on duplicate name (case-insensitive). |
| T-041 | `PATCH /api/admin/suppliers/:id` (rename). | Rename to an existing name returns 409. |
| T-042 | `DELETE /api/admin/suppliers/:id`: deletes parts and their Supabase Storage images. | Storage objects gone; response counts deleted parts. |
| T-043 | Dashboard UI: supplier list, add, rename, delete with confirm dialog. | Matches S5 and FR-A2 to FR-A4. |

## Phase 5: Part Management and Uploads (Supabase Storage)

| Task | Description | Acceptance |
|------|-------------|------------|
| T-050 | `lib/uploads.js`: read the multipart body, enforce 5 MB, check magic bytes (JPEG, PNG, WebP). Upload to Supabase Storage. | Wrong type returns 415; over 5 MB returns 413. |
| T-051 | `POST /api/admin/suppliers/:id/parts`: write order per TechSpec 7.2. Requires image and 1+ vehicles. | Missing image or vehicles returns 400, nothing written. Failed Postgres write removes the Storage object. |
| T-052 | `GET /api/admin/suppliers/:id/parts`. | Returns that supplier's parts only. |
| T-053 | `PATCH /api/admin/parts/:id`: optional new image (old Storage object deleted after the row is updated), vehicles, name. | Old object gone after replacement. |
| T-054 | `DELETE /api/admin/parts/:id` removes the row and the Storage object. | Both gone. |
| T-055 | `GET /api/admin/vehicles/suggest?q=` with ILIKE escaping (Schema.md 4.4). | `%` and `_` typed by the user do not match everything. |
| T-056 | Decision: image resizing. v1 stores as uploaded (5 MB). Record in Tracker D-04. | Decision recorded. |
| T-057 | `GET /uploads/:id`: streams from Supabase Storage with long cache headers. 404 if missing. | Image loads; second request served from cache. |
| T-058 | Admin supplier view and part form (S6, S7): photo preview, tag input with suggestions, optional name. | Add a part in under 1 minute on a phone (manual check). |

## Phase 6: Customer Site

| Task | Description | Acceptance |
|------|-------------|------------|
| T-060 | `GET /api/config` and `GET /api/suppliers` (public). | Returns no internal fields. |
| T-061 | `GET /api/suppliers/:id/parts?vehicle=`: distinct vehicles and filtered parts. | Filter returns only matches; unknown supplier returns 404. |
| T-062 | Home page `public/index.html` with header and supplier cards (S1). | Empty state text shown when no suppliers. |
| T-063 | Supplier page `public/supplier.html` with filter and part cards (S2). | Filter works without a page reload. |
| T-064 | Image viewer (S3) and 4:3 image boxes with lazy loading. | Full image opens on tap. |
| T-065 | Empty and error states (AppFlow 2.1). | Each state visible in manual test. |
| T-066 | Styles per Design.md. | No horizontal scroll at 360px. |

## Phase 7: Contact Us

| Task | Description | Acceptance |
|------|-------------|------------|
| T-070 | Contact button in header (general message) and on every part card (part message). | Both present on supplier page. |
| T-071 | Link built from `whatsapp_number`. Hidden when number is empty. | No empty `wa.me/` link is ever rendered. |
| T-072 | Message encoded correctly (line breaks, accents, `&`). Manual test on Android and iPhone. | Message appears prefilled on both devices. |
| T-073 | Admin Settings page S8: business name and WhatsApp number with validation (FR-A8). | Invalid number rejected; saved number used immediately. |

## Phase 8: Tests and Smoke Tests

| Task | Description | Acceptance |
|------|-------------|------------|
| T-080 | Unit tests: `validate.js`, `whatsapp.js`, LIKE escaping, session signing. | `npm test` passes. |
| T-081 | API tests (`node:test` + `fetch` against a running server): auth gate, CSRF, supplier and part CRUD, uploads (good and bad files). | `npm test` passes. |
| T-082 | Smoke test `tests/smoke.test.js` against `npm run dev`: log in, add supplier, add part, check public page, check Contact link, check no price text. | `npm run smoke` passes. |
| T-083 | Accessibility: keyboard path, contrast of WhatsApp button, alt text present. | Checklist in Design.md section 8 ticked. |
| T-084 | Responsive check at 360px, 768px, 1280px. | No horizontal scroll; no overlapping elements. |

## Phase 9: Deployment and Handover

| Task | Description | Acceptance |
|------|-------------|------------|
| T-090 | `README.md`: setup, secrets, local run, deploy, backup and restore, how to add a supplier and a part. | A person who has not seen the code can follow it. |
| T-091 | Backup: Supabase DB export and Storage copy (TechSpec 11.1). Restore tested on a copy. | Restore produces the same supplier and part counts. |
| T-092 | Create Supabase project and Storage bucket, set secrets, deploy to Vercel, attach custom domain (Q6). | Site loads over HTTPS; admin login works. Blocked until domain is provided. |
| T-093 | Owner walkthrough: add a supplier and a part, send one enquiry. | Owner confirms it works. |
| T-094 | Verify Vercel Hobby limits and function timeout with a real login and upload (TechSpec 12). Move to Vercel Pro if needed. | Written result in Tracker.md. |

## Definition of Done (per feature)

A feature is complete only when:
1. Code implemented per the relevant doc.
2. `npm test` passes.
3. `npm run smoke` passes (once Phase 8 has started).
4. `Tracker.md` updated: status, date, and any decision made.

## Critical Path

T-000 → T-009 (audit, owner review) → T-010 → T-020 → T-030 → T-031 → T-040 → T-051 → T-061 → T-063 → T-071 → T-082 → T-092.
