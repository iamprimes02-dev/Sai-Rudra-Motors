# Design: Parts Catalogue Website

Version: 0.1
Date: 2026-11-15

## 1. Design Principles

1. **Parts first.** The image and the vehicle list are the main content. Nothing decorative competes with them.
2. **Big and simple.** Large tap targets (minimum 44 by 44 px). Short labels. No hover-only actions.
3. **One clear action per card.** Each part card has one primary action: Contact.
4. **Trustworthy, not flashy.** Clean, dense-enough grid, neutral colours. Feels like a proper dealer, not a template.
5. **Admin is for speed.** The add-part form is a single screen with three fields.

## 2. Colour Tokens

Define these as CSS custom properties on `:root` in `public/css/styles.css` and `private/css/admin.css`. Do not hard-code hex values in components.

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg` | `#F6F6F4` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, form panels |
| `--color-text` | `#1C1F24` | Body text (contrast 16:1 on surface) |
| `--color-text-muted` | `#5B616B` | Secondary text (contrast 6:1 on surface) |
| `--color-border` | `#E2E2DE` | Card and input borders |
| `--color-primary` | `#1F3A5F` | Header, links, filter focus ring |
| `--color-primary-text` | `#FFFFFF` | Text on primary |
| `--color-whatsapp` | `#1EA855` | Contact buttons only (WhatsApp brand-adjacent green; text on it is white, contrast 3.2:1 for large bold labels, so use 16px bold minimum) |
| `--color-danger` | `#B42318` | Delete buttons, error text |
| `--color-success` | `#067647` | Toast, "Saved" |
| `--color-focus` | `#2563EB` | Keyboard focus outline (2px) |

Dark mode is not in v1.

## 3. Typography

- Font stack: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. No web font downloads.
- Base size: 16px on mobile. Never below 14px for any text.
- Scale (rem): 0.875 (meta), 1 (body), 1.125 (card title), 1.5 (section heading), 2 (page title).
- Line height: 1.5 body, 1.2 headings.
- Part names: bold, 1.0625rem. Vehicles: regular, muted, 0.9375rem.

## 4. Spacing and Layout

- Spacing scale (px): 4, 8, 12, 16, 24, 32. Use only these.
- Page gutter: 16px on mobile, 24px at 768px and up, max content width 1120px, centred.
- Breakpoints (min-width):
  - 0: 1 column for supplier cards and part cards is **2 columns** for part cards (see below).
  - 480px: part grid 2 columns.
  - 768px: part grid 3 columns, supplier grid 2 columns.
  - 1024px: part grid 4 columns, supplier grid 3 columns.
- Part grid on 360px phones: 2 columns, gap 12px. Card min width 150px.

## 5. Components

### 5.1 Header (customer)
- Height 64px. Background `--color-primary`. Left: business name (white, bold). Right: **Contact Us** button.
- Sticky to top on scroll. Compact on small screens (name may truncate with ellipsis).

### 5.2 Supplier card (home)
- Surface card, 12px radius, 1px border, padding 16px.
- Supplier name (card title). Below: "12 parts" in muted text.
- Whole card is one tap target, with a right chevron.
- Hover/focus: border becomes `--color-primary`.

### 5.3 Part card
- Surface card, 12px radius, 1px border. Overflow hidden.
- Image box: aspect ratio 4:3, background `#FFFFFF`, `object-fit: contain`, padding 8px. Tap to open full size (S3).
- Body padding 12px:
  - Part name (bold). If none: "Part #123" in muted text.
  - Vehicles: wrapped list of small chips (max 2 visible, then "+3 more", which expands). Chip: 1px border, 12px radius, 13px text, background `#F6F6F4`.
- Footer: full-width **Contact** button (`--color-whatsapp`, white text, 44px tall, 8px radius, icon optional).

### 5.4 Vehicle filter (supplier page)
- Sticky under the header on mobile (height 48px).
- Single `<select>` labelled "Filter by vehicle", first option "All vehicles". Full width on mobile, 320px max on desktop.
- Count line beside it: "Showing 6 of 14 parts".

### 5.5 Buttons
| Type | Look |
|------|------|
| Primary (admin save, login) | `--color-primary` background, white text, 44px tall |
| Secondary | White background, `--color-primary` border and text |
| Contact | `--color-whatsapp` background, white bold text |
| Danger | White background, `--color-danger` border and text. Confirmation required. |
| Text link | `--color-primary`, underlined on hover and focus |

Disabled state: 50% opacity, `cursor: not-allowed`, still readable.

### 5.6 Forms (admin)
- Labels above inputs, always visible (no placeholder-as-label).
- Inputs: 44px tall, 16px font (prevents iOS zoom), 1px border, 8px radius. Focus ring `--color-focus`.
- Error text under the field in `--color-danger`, with an icon and the words, not colour alone.

### 5.7 Image picker (admin, part form)
- Large dashed box, 4:3, with "Tap to choose a photo" and "JPG, PNG or WebP, up to 5 MB".
- After choosing: preview fills the box, with a "Change photo" button below.
- On mobile, opens the camera or gallery.

### 5.8 Vehicle tag input (admin)
- Box with existing tags as chips (each with an × button, 44px tap target).
- Input inside the box. Dropdown of suggestions directly below, max 10, tap to pick.
- Hint text: "Type a vehicle and press Enter. Example: Maruti Swift 2018-2022".

### 5.9 Toasts and dialogs
- Toast: bottom centre, auto-dismiss after 3 seconds, `--color-success` or `--color-danger`. Also has text, not colour only.
- Confirm dialog: centred modal, focus trapped, Escape closes, first button is Cancel.

### 5.10 Empty states
- Simple line of text, a muted icon, and one action (for admin: "Add your first supplier").

## 6. Images

- Part images always shown in the 4:3 box, so the grid stays aligned even with mixed photo shapes.
- Lazy loading below the fold.
- Alt text: "{Part name} for {Supplier}" or "Part #123 from {Supplier}".

## 7. Copy and Tone

- Plain, polite English. Short sentences. No jargon.
- Customer buttons: "Contact Us", "Contact", "View parts", "Back to suppliers".
- Admin buttons: "Add supplier", "Add part", "Save part", "Delete", "Logout".
- Do not use the word "price" anywhere on the site.

## 8. Accessibility

- Keyboard: every action reachable with Tab, visible focus ring, Enter/Space activate buttons.
- Semantic HTML: `<header>`, `<main>`, `<nav>`, `<section>`, real `<button>` and `<a>` elements.
- Contrast: all text meets WCAG AA (4.5:1 for normal text, 3:1 for large text). Check the WhatsApp button text with a contrast tool before release; if it fails, darken `--color-whatsapp` to `#178A44`.
- Motion: no autoplaying animation. Respect `prefers-reduced-motion`.

## 9. Reference Wireframe (phone, 360px)

```
┌────────────────────────────┐
│ Sharma Auto Parts [Contact]│  header (64px, dark blue)
├────────────────────────────┤
│ Parts from our suppliers.  │  intro line
│ Choose a supplier below.   │
│                            │
│ ┌────────────────────────┐ │
│ │ Supplier A         >   │ │  supplier card
│ │ 14 parts               │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Supplier B         >   │ │
│ │ 6 parts                │ │
│ └────────────────────────┘ │
└────────────────────────────┘

SUPPLIER PAGE (360px)
┌────────────────────────────┐
│ ‹ Back    Supplier A       │
├────────────────────────────┤  sticky
│ Filter by vehicle [All ▼]  │
│ Showing 14 of 14 parts     │
│ ┌──────────┐ ┌──────────┐  │
│ │  [img]   │ │  [img]   │  │  part cards, 2 columns
│ │ Brake pad│ │ Filter   │  │
│ │ Swift ✕2 │ │ Dzire    │  │
│ │[Contact] │ │[Contact] │  │
│ └──────────┘ └──────────┘  │
└────────────────────────────┘
```

## 10. Admin Look

- Simple top bar: site name "Admin", links "Suppliers", "Settings", "View site", "Logout".
- Content width 960px max. Single column on phones.
- Tables are replaced by cards on phones. On desktop, supplier list may be a table with Name, Parts, Actions columns.
- Admin uses the same colour tokens. Danger actions are always on the right side of a card, separated by a border.
