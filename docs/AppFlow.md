# App Flow: Parts Catalogue Website

Version: 0.1
Date: 2026-11-15

## 1. Sitemap

```
PUBLIC (no login)
  /                         Home: business name + supplier cards
  /supplier/:id             Supplier page: vehicle filter + part cards
  [Contact Us]              Opens WhatsApp (from header and every part card)

ADMIN (login required)
  /admin/login              Password form
  /admin                    Dashboard
     ├─ Suppliers panel     list, add, rename, delete
     ├─ Supplier view       parts of one supplier, [Add part]
     ├─ Add / Edit part     image, vehicles, name
     └─ Settings            business name, WhatsApp number
```

## 2. Customer Flow

```
Customer opens site
        │
        ▼
┌───────────────────────┐
│ HOME                  │
│ Header: name, Contact │
│ Supplier cards        │
└──────────┬────────────┘
           │ tap a supplier
           ▼
┌───────────────────────────────┐
│ SUPPLIER PAGE                 │
│ Header + "← All suppliers"    │
│ [Filter by vehicle ▼]         │
│ Part card  │ Part card        │
│ image      │ image            │
│ name       │ name             │
│ vehicles   │ vehicles         │
│ [Contact]  │ [Contact]        │
└──────────┬────────────────────┘
           │ tap [Contact] on a part
           ▼
   WhatsApp opens with message filled in
   Customer presses SEND  →  done
```

### 2.1 Customer states

| State | What the customer sees |
|-------|------------------------|
| No suppliers yet | "Our supplier list is being updated. Please contact us on WhatsApp." plus the header Contact button. |
| Supplier with no parts | "No parts listed for this supplier yet." plus the header Contact button. |
| Vehicle filter with no match | "No parts for this vehicle with this supplier." plus a "Show all" link. |
| WhatsApp number not set | Contact buttons hidden. Notice: "Contact details coming soon." |
| Image fails to load | Grey placeholder box with the part name. |
| Slow network | Skeleton cards while loading. |

### 2.2 Contact Us flow (detail)

1. Customer taps **Contact Us** on a part card.
2. Browser opens `https://wa.me/<number>?text=<message>`.
3. WhatsApp opens (app on phone, or WhatsApp Web on PC) with this message in the box:
   > Hello, I am interested in this part from Sharma Auto Parts.
   > Part: Front brake pad set
   > Vehicles: Maruti Swift 2018-2022, Maruti Dzire 2019-2023
   > Please let me know if it is available. Thank you.
4. Customer presses **Send**. No typing needed.

Header Contact button sends the short general message instead.

## 3. Admin Flow

### 3.1 Login

```
/admin  ──(not logged in)──►  /admin/login
                                  │ enter password
                                  ▼
                       correct? ──no──► "Incorrect password" (after 5 tries: wait 15 min)
                          │yes
                          ▼
                     /admin dashboard
```

### 3.2 Add a supplier

```
Dashboard → [+ Add supplier] → type name → [Save]
   ├─ name empty or too long  → inline error
   ├─ name already exists     → "This supplier already exists"
   └─ saved                   → supplier appears in list
```

### 3.3 Add a part (the most used flow; must be quick)

```
Dashboard → pick supplier → [+ Add part]
        │
        ▼
┌──────────────────────────────────────┐
│ 1. Photo        [ Tap to choose ]    │  ← required
│    (preview shows after choosing)    │
│ 2. Compatible vehicles               │  ← required, at least 1
│    [ type to search...         ]     │
│    (Maruti Swift 2018-2022 ×)        │
│ 3. Part name (optional)              │
│                                      │
│              [ Save part ]           │
└──────────────────────────────────────┘
        │
        ├─ no photo / no vehicle → red message under the field, nothing saved
        ├─ file too big / wrong type → message, nothing saved
        └─ saved → back to supplier's parts list, new card at top, toast "Part added"
```

Typing a vehicle shows suggestions from vehicles already in the system. Picking a suggestion keeps spelling consistent.

### 3.4 Edit a part

```
Supplier parts list → tap a card → Edit form (same as Add, pre-filled)
   ├─ change photo: old photo is replaced and deleted
   └─ [Save] → toast "Saved"
```

### 3.5 Delete a part

```
Tap [Delete] → confirm "Delete this part and its photo?" → [Delete]
   → part removed, photo file removed, toast "Part deleted"
```

### 3.6 Delete a supplier

```
Tap [Delete] on supplier → confirm:
   "Delete Sharma Auto Parts and its 14 parts? This cannot be undone."
   → supplier, parts, and photos removed
```

### 3.7 Settings

```
Dashboard → Settings → business name, WhatsApp number (digits, with country code)
   ├─ invalid number → "Enter digits only, with country code, e.g. 919876543210"
   └─ saved → customer Contact buttons use the new number immediately
```

### 3.8 Logout

Tap **Logout** → session ends → back to login page.

## 4. Screen List (for design and build)

| # | Screen | Who | Key elements |
|---|--------|-----|--------------|
| S1 | Home | Customer | Header (name, Contact), intro line, supplier grid |
| S2 | Supplier | Customer | Back link, supplier name, vehicle filter, part card grid, Contact |
| S3 | Image viewer | Customer | Full-size image, close button |
| S4 | Admin login | Admin | Password field, Login button |
| S5 | Admin dashboard | Admin | Supplier list with counts, [+ Add supplier], Settings link, Logout |
| S6 | Supplier admin | Admin | Supplier name, parts list, [+ Add part], rename/delete |
| S7 | Part form | Admin | Photo picker with preview, vehicle tags, optional name, Save |
| S8 | Settings | Admin | Business name, WhatsApp number, Save |

## 5. Error and Edge Cases

| Case | Behaviour |
|------|-----------|
| Session expires while adding a part | Save returns 401. Form content kept in memory, user sent to login, then can resubmit. |
| Two admins save the same part | Last save wins (single-admin system, so rare). |
| Upload takes long on slow network | Progress indicator on the Save button. Button disabled while sending to avoid double submit. |
| Customer opens an old supplier link after deletion | "This supplier is no longer listed." plus link to home. |
| Vehicle name typed with extra spaces or in lower case | Trimmed and de-duplicated on save. |
| Same part needed from two suppliers | Admin adds it under each supplier (Assumption A2). |

## 6. Navigation Rules

- Customer header is on every customer page and always has Contact Us.
- Admin pages never link to or from the customer site except a "View site" link in the admin header.
- Back button on supplier page returns to home without a full reload where possible.
