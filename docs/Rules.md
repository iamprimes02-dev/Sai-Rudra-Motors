# Rules: Parts Catalogue Website

Version: 0.3
Date: 2026-11-15
Applies to: every human developer and every AI coding agent working in this repository.

## 1. Read Order (before any change)

1. `PRD.md`: what and why.
2. `TechSpec.md`: how, and the locked stack (Vercel + Supabase).
3. `Schema.md`: data (Supabase Postgres).
4. `AppFlow.md`: screens and flows.
5. `Design.md`: look and components.
6. `ImplementationPlan.md`: task IDs and acceptance criteria.
7. `Tracker.md`: current status and decisions.
8. `Rules.md`: this file.

If a task conflicts with a document, stop and ask the owner. Do not guess.

## 2. Required Documents

The project is implementation-ready only when all of these exist in `docs/`:
`PRD.md`, `TechSpec.md`, `AppFlow.md`, `Design.md`, `Schema.md`, `ImplementationPlan.md`, `Tracker.md`, `Rules.md`.

If any is missing or out of date with the code, update the document before writing code.

## 3. Scope Rules

- Build only what the PRD and ImplementationPlan describe. Do not add features "for later" unless listed as Could or v2.
- **Never show prices.** No price field, no price text, no "contact for price" wording. Smoke test T-082 checks this.
- Customers never log in. Customers never see admin controls.
- Admin is a single account, with the password in the `ADMIN_PASSWORD` secret. Do not add roles, sign-up, or password reset in v1.
- Contact is WhatsApp only, through a prefilled `wa.me` link. Do not add in-site chat, email forms, or the WhatsApp Business API.
- No Docker, Telegram, NVIDIA NIM, or AI features. Excluded by decision D-01.
- No Cloudflare Workers, D1, R2, Hono, or Wrangler. Excluded by decision D-15.

## 4. Stack Rules (no stack drift)

- Hosting: Vercel (Hobby plan). Database: Supabase Postgres. Image storage: Supabase Storage. (decision D-15).
- Framework: Express 5 for routing.
- Modules: CommonJS (`require`). Do not use ES modules `import`/`export`.
- Database access: Supabase Postgres via `@supabase/supabase-js`, with parameterized statements only.
- Storage: Supabase Storage via `@supabase/supabase-js`. No local `uploads/` folder in production (local fallback for dev only).
- Sessions: signed cookie (HMAC-SHA256 via Node `crypto`). No in-memory sessions and no `express-session`.
- Password hashing: none. The admin password is a secret compared in constant time (TechSpec section 5).
- Frontend: plain HTML, CSS, vanilla JS. No React, Vue, Tailwind, or build tools in v1.
- Adding an npm package needs a decision entry in `Tracker.md` first. Prefer built-in Node APIs and Web APIs.

## 5. Coding Rules

- Use parameterized statements via `@supabase/supabase-js` for every query that takes input. No string concatenation of user data into SQL.
- Escape all output. Use `textContent` in the browser. Never `innerHTML` with user-entered text.
- Validate input on the server. Client validation is only for convenience.
- Trim and collapse whitespace on names and vehicles (Schema.md section 3).
- Check uploads by magic bytes, not by extension or client MIME type. Store objects under random keys.
- Follow the upload write order in TechSpec 7.2: validate, put to Supabase Storage, write the row, then clean up on failure.
- When a part or supplier is deleted, delete its Supabase Storage objects. Never leave orphan objects.
- Every admin write is protected by session check and CSRF token.
- Keep functions small. Validation in `lib/validate.js`, WhatsApp logic in `lib/whatsapp.js`, upload logic in `lib/uploads.js`, database queries in `db.js`.
- Comments explain why, not what. Keep them short.
- No secrets in code or git. `ADMIN_PASSWORD`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` come from environment only (`.env` locally, Vercel env vars in production).
- Do not log passwords, session IDs, or CSRF tokens.
- Watch function timeout per request. Avoid slow loops, and avoid password hashing on the request path (TechSpec section 12).

## 6. Data Safety Rules

- Never run destructive commands against the production Supabase database or Storage bucket while testing. Use a separate test database (set `DB_PATH` env var or use a separate Supabase project).
- Never commit `.env`, `uploads/*`, `node_modules/`, or `.vercel/`. Check `.gitignore` before every commit.
- Before any migration on production, export the database (TechSpec 11.1).
- Ask the owner before any change that deletes real data.

## 7. Testing Rules

- Every feature has at least one automated test (unit or API).
- Tests must not touch the production database or bucket.
- Unit and API tests run with `npm test` (`node:test`).
- Smoke test (`npm run smoke`) must pass before a feature is Done once Phase 8 has started.
- Manual checks needed for the Contact Us link on a real Android and iPhone (T-072) and the 360px layout (T-084). Record the date and device in Tracker.md.

## 8. Definition of Done

A feature is complete only when all are true:
1. Code implemented following these rules and the relevant doc.
2. `npm test` passes.
3. `npm run smoke` passes (once Phase 8 has started).
4. `Tracker.md` updated: task status, date, and any decision or known issue.
5. Any doc that changed is updated in the same change.

## 9. Tracker Rules

- Update `Tracker.md` in the same change as the work.
- Status values: Done, In progress, Not started, Blocked. Use the symbols in Tracker.md.
- Record every new decision in the Decisions Log with a new `D-` number. Never renumber. Superseded decisions stay in the log, marked as superseded.
- Record every bug or limitation in Known Issues with a new `KI-` number.
- Blocked items must name the owner question they wait on.

## 10. Owner Communication Rules

- Owner is not a developer. Explain outcomes in plain English.
- Ask owner questions in one batch, using the Open Questions table in Tracker.md.
- Do not make decisions that change scope, cost, or hosting without asking.

## 11. Git Rules

- Work on a branch per phase (for example `phase-3-admin-auth`).
- Small commits. Each commit message says what changed and which task ID it covers, e.g. `T-031: admin login with signed cookie`.
- Do not force-push to main. Do not rewrite history after the owner has the code.

## 12. Glossary

| Term | Meaning |
|------|---------|
| Supplier | A company that supplies parts to the dealer. Shown publicly by name. |
| Part | One item with one image, one or more compatible vehicles, and an optional name. Belongs to exactly one supplier. |
| Vehicle | A text label such as `Maruti Swift 2018-2022`. Free text, de-duplicated. |
| Enquiry | A customer pressing Contact Us, which opens WhatsApp with a prefilled message. |
| Admin | The single shop owner account. |
| Supabase Postgres | Managed PostgreSQL database used for all application data. |
| Supabase Storage | Object storage used for part images. |
| Vercel | Serverless hosting platform for the Express app. |
