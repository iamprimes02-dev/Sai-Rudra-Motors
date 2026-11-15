# PRD: Automotive Parts Catalogue Website

Version: 0.1 (draft for owner review)
Date: 2026-11-15
Status: Planning. No implementation yet.

## 1. Summary

A website for a small automotive parts dealer who works with about 7 suppliers (more may be added later).

- Customers (no login) see the list of suppliers, open a supplier, and browse the parts that supplier sells, each with its image and the vehicles it fits. **No prices are shown anywhere.**
- Customers press a **Contact Us** button. It opens WhatsApp with a pre-written enquiry message. The customer only presses **Send**.
- The shop owner (admin) logs in through a separate admin area. To add a part, the owner uploads one image and selects the compatible vehicles. Nothing else is required.

## 2. Goals

| ID | Goal | Measure of success |
|----|------|--------------------|
| G1 | Customers find the parts list quickly on a phone | Supplier to parts list in 2 taps or fewer |
| G2 | Owner adds a part in about one minute | Add-part form has only image (required), vehicles (required), name (optional) |
| G3 | Enquiry in two taps | Contact Us then WhatsApp Send, with no typing |
| G4 | New suppliers need no code changes | Admin can add a supplier from the admin screen |

## 3. Non-Goals (v1)

- No prices, price fields, discounts, or "price on request" text.
- No cart, checkout, orders, or payments.
- No customer accounts or sign-up.
- No stock or inventory counts.
- No in-site chat. WhatsApp is the only contact channel.
- No Docker, Telegram bot, or AI features. These were not requested.

## 4. Users

- **Customer:** car owner or mechanic. Mostly on a mobile phone. Not technical. Needs big images, big buttons, and simple wording.
- **Admin (shop owner):** non-technical. Uses a phone or PC. Adds suppliers and parts.
- **Maintainer:** a developer or AI coding agent who extends the site later. Relies on the docs in `/docs`.

## 5. Functional Requirements

### 5.1 Customer Side (public, no login)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-C1 | Home page shows the business name, a short intro line, and a card for every supplier (name and number of parts). | Must |
| FR-C2 | Supplier page shows that supplier's parts as cards. Each card has the image, part name (if set), and compatible vehicles. | Must |
| FR-C3 | On a supplier page, the customer can filter parts by vehicle (dropdown or search box). Only parts that fit the chosen vehicle are shown. | Should |
| FR-C4 | Search across all suppliers by vehicle. | Could (v2) |
| FR-C5 | No prices appear on any customer page. The database has no price field. | Must |
| FR-C6 | **Contact Us** button in the page header, and a **Contact Us** button on every part card. Pressing it opens WhatsApp with a pre-filled message. | Must |
| FR-C7 | Pre-filled message names the supplier, the part (name or part number), and the compatible vehicles, then asks for availability. The customer does not type anything. | Must |
| FR-C8 | Tapping a part image opens it full size. | Should |
| FR-C9 | Empty states are handled: no suppliers yet, or a supplier with no parts. | Must |
| FR-C10 | Works well on phones and desktops. | Must |

### 5.2 Admin Side (separate login)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-A1 | Admin login page at `/admin/login`, with one admin password. Logout button. | Must |
| FR-A2 | Admin dashboard lists all suppliers with their part counts. | Must |
| FR-A3 | Add supplier by name. Names must be unique (case-insensitive). | Must |
| FR-A4 | Rename or delete a supplier. Deleting asks for confirmation and removes that supplier's parts and their image files. | Must |
| FR-A5 | Add a part to a chosen supplier. Required: image and at least one compatible vehicle. Optional: part name. | Must |
| FR-A6 | Vehicle entry is a tag input. Typing shows previously used vehicles, so the same vehicle is spelled the same way every time. | Must |
| FR-A7 | Edit a part (replace image, change vehicles or name). Delete a part (removes its image file). | Must |
| FR-A8 | Business settings: business name and WhatsApp number used for the Contact Us button. | Must |
| FR-A9 | Admin pages and admin API calls are unreachable without login. Customer pages never show admin controls. | Must |
| FR-A10 | Bulk add (multiple images at once, each then tagged). | Could (v2) |

## 6. Non-Functional Requirements

- **Mobile first.** Designed for a 360px-wide phone first, then scaled up.
- **Speed.** Images up to 5 MB are accepted. The server should resize or compress them (see TechSpec). Target: first page usable in under 3 seconds on a typical 4G connection.
- **Security.**
  - Admin password comes from the `ADMIN_PASSWORD` environment variable and is stored as a bcrypt hash.
  - Session cookies are `httpOnly` and `sameSite=lax`. Use `secure` in production.
  - Admin write requests need a CSRF token.
  - Uploads are checked by type and size. Only JPG, PNG, and WebP are accepted.
  - All user-entered text is escaped before display.
  - Login attempts are rate-limited.
- **Data safety.** Cloudflare D1 database (SQLite) plus the Cloudflare R2 image bucket. The owner must be able to export both (see TechSpec.md section 11).
- **Accessibility.** Text contrast meets WCAG AA. Every image has alt text. Buttons have labels that make sense without the image.
- **Browsers.** Latest two versions of Chrome, Safari, Edge, and Android Chrome.
- **Language.** English for v1 (open question Q3).

## 7. Success Criteria

1. Owner adds a new supplier and a part with one image and two vehicles, without help, in under 2 minutes.
2. Smoke test confirms no price text on any customer page.
3. The Contact Us link opens WhatsApp with the message already filled in, on both Android and iPhone.
4. Admin pages return an error or redirect when opened without login.

## 8. Assumptions

- A1: There is one admin account.
- A2: A part belongs to exactly one supplier. If the same part comes from two suppliers, it is added twice.
- A3: Vehicles are entered as text (for example `Maruti Swift 2018-2022`). The site does not use an external vehicle database in v1.
- A4: The admin can see all suppliers and parts. Customers can see all suppliers.
- A5: A part has one image.

## 9. Open Questions (owner to answer)

| ID | Question | Why it matters |
|----|----------|----------------|
| Q1 | What is the business WhatsApp number (with country code, e.g. 91XXXXXXXXXX)? | Required for Contact Us. |
| Q2 | Business name, logo, address, phone, and opening hours? | Header and footer content. |
| Q3 | English only, or also Kannada or Hindi? | Affects UI text and layout. |
| Q4 | Should customers search by vehicle across all suppliers in v1 (FR-C4)? | Changes the home page design. |
| Q5 | Rough volume: parts per supplier, total images? | Affects image handling and paging. |
| Q6 | Where will it be hosted (owner's machine, a VPS, or a cloud host) and which domain? | Affects session storage and deployment steps. |
| Q7 | Are supplier names OK to show publicly? | Assumed yes, because the owner asked to show suppliers. |
| Q8 | Should part cards show a supplier logo? | Optional design element. |
