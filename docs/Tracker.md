# Tracker: Parts Catalogue Website

Last updated: 2026-11-15
Update this file in the same change as the work it describes.

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ Done | Implemented, tested, and tracker updated |
| 🟡 In progress | Being worked on |
| ⬜ Not started | Planned, not begun |
| ⛔ Blocked | Waiting on an owner answer or decision (see Open Questions) |

## Documentation

| ID | Item | Status | Notes |
|----|------|--------|-------|
| DOC-01 | PRD.md | ✅ Done | Draft v0.1. Q1 answered (918660957903), Q2 answered (Sai Rudra Motors). |
| DOC-02 | TechSpec.md | ✅ Done (v0.3) | Rewritten for Vercel + Supabase (D-11 superseded by D-15). |
| DOC-03 | AppFlow.md | ✅ Done | |
| DOC-04 | Design.md | ✅ Done | Colour contrast of WhatsApp green to verify in T-083. |
| DOC-05 | Schema.md | ✅ Done (v0.3) | Supabase Postgres schema. |
| DOC-06 | ImplementationPlan.md | ✅ Done (v0.3) | Vercel + Supabase tasks. |
| DOC-07 | Tracker.md | ✅ Done | This file. |
| DOC-08 | Rules.md | ✅ Done (v0.3) | Stack rules for Vercel + Supabase. |

## Audit at Planning Time (2026-11-15)

| Category | Items |
|----------|-------|
| PRESENT | `package.json` (Express 5, @supabase/supabase-js); `db.js` (Supabase client); `index.js` (Express server); `lib/` (auth, uploads, validate, whatsapp); `routes/` (public, admin); `public/` and `private/` folders; `tests/` (api, smoke, unit); `vercel.json`; `.env.example`; `.gitignore`; `README.md`; `schema.sql`; `node_modules` installed. |
| MISSING | None. |
| INCOMPLETE | None. |
| CONFLICTING | None. |

## Implementation Progress

| Phase | Task IDs | Status | Notes |
|-------|----------|--------|-------|
| 0 Repository setup | T-000 to T-002 | ✅ Done | Git ignore, env example, and documentation initialized. |
| 1 Server skeleton | T-010 to T-014 | ✅ Done | Express 5 server, vercel.json, error handlers, and fail-fast env validation. |
| 2 Data layer | T-020 to T-024 | ✅ Done | Supabase Postgres client, parameterized queries, schema.sql, input validation. |
| 3 Admin auth | T-030 to T-036 | ✅ Done | Signed-cookie sessions (HMAC-SHA256), constant-time password check, rate limiter, CSRF protection. |
| 4 Supplier admin | T-040 to T-043 | ✅ Done | Admin dashboard, supplier list, add/rename/delete supplier, logo dropdown with previews. |
| 5 Parts and uploads | T-050 to T-058 | ✅ Done | Pure binary multipart parser, Supabase Storage uploads, vehicle tagging with suggestions, part CRUD. |
| 6 Customer site | T-060 to T-066 | ✅ Done | Modern responsive catalogue, live brand search, vehicle filter, part cards, image zoom modal. |
| 7 Contact Us | T-070 to T-073 | ✅ Done | Header & card WhatsApp inquiry buttons with pre-filled structured messages, admin settings view. |
| 8 Tests and smoke | T-080 to T-084 | ✅ Done | 27 unit tests passing, all 8 integration API tests passing. |
| 9 Deployment | T-090 to T-094 | 🟡 Ready | Configured for Vercel deployment via vercel.json; pending custom domain selection. |

## Task Log

| Task | Status | Date | Notes |
|------|--------|------|-------|
| T-000 to T-094 | ⬜ Not started | | |

## Open Questions (owner to answer)

| ID | Question | Status | Answer |
|----|----------|--------|--------|
| Q1 | WhatsApp business number with country code | ✅ Answered | 918660957903 |
| Q2 | Business name, logo, address, phone, hours | ✅ Answered | Sai Rudra Motors |
| Q3 | Language: English only or also Kannada or Hindi | ⬜ Open | Assumed English |
| Q4 | Vehicle search across all suppliers in v1 | ⬜ Open | Assumed no (v2) |
| Q5 | Expected parts and image volume | ⬜ Open | Assumed under 500 parts, 5 MB limit |
| Q6 | Hosting target and domain | ✅ Answered | Vercel. Still need the domain name. Blocks T-092. |
| Q7 | Supplier names public | ⬜ Open | Assumed yes |
| Q8 | Supplier logo on part cards | ⬜ Open | Assumed no |

## Decisions Log

| ID | Decision | Date | Reason |
|----|----------|------|--------|
| D-01 | Exclude Docker, Telegram, NVIDIA NIM, browsing from scope | 2026-11-15 | Not requested by owner. Skill template default. |
| D-02 | Signed-cookie sessions (no server memory) | 2026-11-15 | Required by serverless. |
| D-03 | Keep vehicles as JSON array in `parts.vehicles` for v1 | 2026-11-15 | Simpler. Migrate to normalised tables only if Q4 is yes. |
| D-04 | Image resizing: pending | | Decide in T-056 after Q5. |
| D-05 | Plain HTML, CSS, vanilla JS, no framework or build step | 2026-11-15 | Easy for a non-developer to maintain. |
| D-06 | Admin password via `ADMIN_PASSWORD` env, compared in constant time | 2026-11-15 | Single admin. Avoids CPU cost on login. |
| D-07 | Contact Us uses `wa.me` link with prefilled text; no WhatsApp Business API | 2026-11-15 | No server or API cost; customer presses Send. |
| D-08 | Part name optional; image and at least one vehicle required | 2026-11-15 | Owner asked for only image and vehicles. |
| D-09 | Hosting: Vercel + Supabase (Postgres + Storage) | 2026-11-15 | Owner chose Vercel + Supabase after Cloudflare comparison. |
| D-10 | Admin password is the `ADMIN_PASSWORD` secret, compared in constant time. No bcrypt hash in the database. | 2026-11-15 | Supersedes D-06. |
| D-11 | Hosting: Cloudflare Workers with Hono, D1, R2 | 2026-11-15 | **SUPERSEDED by D-15.** Owner reverted to Vercel + Supabase. |
| D-12 | Verify Workers free-plan CPU time | 2026-11-15 | **SUPERSEDED by D-15.** No longer applies. |
| D-13 | Test stack: Vitest with Workers pool | 2026-11-15 | **SUPERSEDED by D-15.** Using node:test instead. |
| D-14 | Admin password via bcrypt hash | 2026-11-15 | **SUPERSEDED by D-10.** |
| D-15 | Hosting and data: Vercel + Express 5 + Supabase Postgres + Supabase Storage | 2026-11-15 | Owner reverted from Cloudflare to Vercel + Supabase. Simpler deployment, no subdomain registration needed. |
| D-16 | Customer live search on homepage and supplier pages | 2026-11-15 | Enhances parts and brand discovery across suppliers. |
| D-17 | Binary Buffer multipart parser in `lib/uploads.js` | 2026-11-15 | Prevents binary image corruption by eliminating utf-8 string conversions. |
| D-18 | Automatic supplier seeding with official brand logos | 2026-11-15 | Populates 11 official suppliers with their logos from `public/logos/`. |

## Known Issues

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| KI-01 | Old `package.json` `main` pointed to `index.js` (Express). Still valid. | Low | Resolved |
| KI-02 | No git repository. No history to roll back to. | Medium | Fixed by T-000 |
| KI-03 | Vercel Hobby is for personal/hobby use. For business use, Vercel Pro may be needed. | Medium | Open (T-094) |
| KI-04 | Supabase free tier: 500 MB database, 1 GB storage. May need paid plan for larger volume. | Medium | Open (T-094) |
