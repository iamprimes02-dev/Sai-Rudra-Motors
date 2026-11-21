---
name: Sai Rudra Motors — Precision Depot HUD
description: Authorized wholesale & retail automotive spares distribution system with dual-mode cobalt/obsidian depth, aerodynamic curves, and floating telemetry
colors:
  primary: "#0071E3"
  primary-hover: "#0077ED"
  primary-dark: "#2997FF"
  indigo-accent: "#4F46E5"
  crimson-accent: "#E11D48"
  whatsapp-green: "#25D366"
  whatsapp-hover: "#20BA5A"
  success-green: "#16A34A"
  bg-light: "#EEF3F8"
  bg-dark: "#06080E"
  surface-light: "#FFFFFF"
  surface-dark: "#0E131F"
  surface-subtle-light: "#F0F4F9"
  surface-subtle-dark: "rgba(255, 255, 255, 0.05)"
  text-primary-light: "#0F172A"
  text-primary-dark: "#F5F5F7"
  text-secondary-light: "#475569"
  text-secondary-dark: "#CBD5E1"
  text-muted: "#64748B"
  border-light: "rgba(0, 113, 227, 0.12)"
  border-dark: "rgba(255, 255, 255, 0.08)"
  border-hover: "rgba(0, 113, 227, 0.35)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Space Grotesk', 'Plus Jakarta Sans', sans-serif"
    fontSize: "2.85rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Space Grotesk', 'Plus Jakarta Sans', sans-serif"
    fontSize: "2.1rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Plus Jakarta Sans', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Plus Jakarta Sans', 'Inter', sans-serif"
    fontSize: "0.96rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Plus Jakarta Sans', sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "26px"
  hud: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  xxl: "48px"
components:
  button-whatsapp:
    backgroundColor: "{colors.whatsapp-green}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
  button-whatsapp-hover:
    backgroundColor: "{colors.whatsapp-hover}"
  button-catalogue:
    backgroundColor: "rgba(0, 113, 227, 0.08)"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "7px 12px"
  card-brand:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.xl}"
    padding: "14px 16px"
  widget-hud:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.hud}"
    padding: "28px"
---

# Design System: The Precision Depot HUD

## Overview

The visual design system for Sai Rudra Motors (SRM) embodies **The Precision Depot HUD**—where heavy-duty automotive trade authority intersects with Apple Keynote keynote-stage glassmorphism, floating HUD telemetry, and aerodynamic fluid curves. 

Built for Karnataka's multi-brand workshops, mechanics, fleet operators, and retail parts counters, the interface rejects generic corporate marketing clichés in favor of grounded trade clarity. The system is driven by a dual-engine aesthetic: vibrant Electric Cobalt and Indigo ambient glass in Light Mode, transitioning seamlessly into an immersive Obsidian Space-Black theatre in Dark Mode. Fluid aerodynamic SVG wave ribbons replace conventional boxy dividers, imparting the kinetic motion of high-velocity transit and precision engineering.

### Named Rules
- **The Zero-Price Rule.** No price numerals, currency symbols, or rate tags may appear on any public-facing screen. Commercial terms, tier discounts, and wholesale availability are communicated strictly via authenticated dealer login and direct WhatsApp trade counter dispatch.
- **The Genuine Pedestal Rule.** Every authorized manufacturer brand logo rests on an isolated, immaculate pure-white showcase pedestal with unified contrast, emphasizing authentic factory origins over grey-market duplicates.
- **The Aerodynamic Curve Rule.** Hard straight-edge dividers are forbidden between major sections. Fluid SVG wave ribbons and super-ellipse radii (20px to 28px) govern transitions and card containers.

## Colors

Color is deployed with precision and hierarchy across Light and Dark operating modes.

### Roles & Palettes
- **Primary Accent (`#0071E3` Light / `#2997FF` Dark):** Represents precision engineering and official distributor authority. Used for active navigation links, spotlight cursor sheens, primary catalog CTAs, search focus rings, and section kickers.
- **Electric Indigo (`#4F46E5` / `#6366F1`):** Secondary gradient blend partner for ambient orbs and illuminated hairline card crowns.
- **Crimson Energy (`#E11D48` / `#FF375F`):** Used for the brand crest monogram and high-priority visual accents.
- **WhatsApp Emerald (`#25D366` hover `#20BA5A`):** The primary commercial action color across all counter check buttons and sticky docks.
- **Stock Status Green (`#16A34A` / `#34C759`):** Live verified inventory indicators, sonar radar pulses, and genuine company stock badges.
- **Light Surfaces:** `#EEF3F8` steel canvas base with `#FFFFFF` elevated glassmorphic cards and subtle `#F0F4F9` container fills.
- **Obsidian Dark Surfaces:** Deep `#06080E` theatre canvas with `#0E131F` elevated glass, highlighted by luminous cyan borders (`rgba(41, 151, 255, 0.22)`).

### Category Color Accents
- **Braking:** Crimson tint (`bg: #FFF5F5`, `border: rgba(220, 38, 38, 0.25)`, `color: #DC2626`).
- **Clutch & Axles:** Indigo tint (`bg: #F5F3FF`, `border: rgba(79, 70, 229, 0.25)`, `color: #4F46E5`).
- **Filtration:** Sky Blue tint (`bg: #F0F9FF`, `border: rgba(2, 132, 199, 0.25)`, `color: #0284C7`).
- **Suspension & Steering:** Emerald tint (`bg: #F0FDF4`, `border: rgba(22, 163, 74, 0.25)`, `color: #16A34A`).
- **Oils & Coolants:** Amber tint (`bg: #FFFBEB`, `border: rgba(217, 119, 6, 0.25)`, `color: #D97706`).
- **Rubber Components:** Slate tint (`bg: #F8FAFC`, `border: rgba(71, 85, 105, 0.25)`, `color: #475569`).

## Typography

Typography pairs technical precision with rapid legibility in workshop conditions.

- **Display & Section Titles:** `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Space Grotesk", "Plus Jakarta Sans", sans-serif`. Weight 800, tight tracking (`-0.03em`), line-height 1.1.
- **Card & Component Titles:** Weight 700 to 800, tracking (`-0.01em`), line-height 1.25.
- **Body & Technical Specs:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Plus Jakarta Sans", "Inter", sans-serif`. Weight 400 to 500, size 0.94rem–0.96rem, line-height 1.5.
- **Kickers & Badges:** Uppercase, weight 800, size 0.68rem–0.72rem, wide tracking (`0.06em` to `0.08em`).

### Named Rules
- **The High-Contrast Readability Rule.** Micro-copy (vehicle model tags, part references, stock statuses) must maintain minimum 6:1 contrast against surface backgrounds to ensure readability on grease-stained workshop mobile screens.

## Layout

The spatial model uses an Apple-grade responsive bento grid bounded within a 1240px (1300px on ultra-wide displays) shell.

- **Hero Grid:** 1.3fr to 1fr asymmetric split on desktop (Authority & Search on the left, Floating Trade Counter HUD on the right). Single column stacked on mobile (<992px).
- **Brand Showcase Grid:** 4-column responsive hardware bento (1 col <600px, 2 col 600–879px, 3 col 880–1099px, 4 col 1100px+).
- **Component Scroller:** 7-column pill grid spanning all authorized categories with sticky horizontal scroll capability on mobile.
- **Feature Cards Row:** 4-column trade credibility grid transitioning into 2x2 and single column on small screens.
- **Rhythm & Padding:** 24px vertical rhythm on desktop, 16px on mobile. Section margins are shaped by continuous SVG curve ribbons.

## Elevation & Depth

Depth is achieved through **multi-layered atmospheric luminescence** rather than flat muddy drop shadows.

- **Layer 0 (Canvas):** Radial mesh gradient with drifting blue, indigo, and crimson blurred orbs (`filter: blur(80px)`) overlaid with a masked 28px dot-matrix grid.
- **Layer 1 (Frosted Glass Dock):** Navbar with `backdrop-filter: blur(28px) saturate(190%)` and 1px cobalt boundary.
- **Layer 2 (Resting Cards):** `box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.07)`, 1.5px semi-transparent borders.
- **Layer 3 (Levitating HUD):** Floating Trade Counter with continuous 7-second vertical levitation (`transform: translateY(-7px)`) and pulsating ambient border glow (`box-shadow: 0 28px 58px -10px rgba(0, 113, 227, 0.28)`).
- **Layer 4 (Hover State Physics):** Cards elevate by `-8px` with a scale of `1.02` accompanied by a 25-degree angled specular sheen glare sweep (`@keyframes sheenSweep`).

## Shapes

- **Super-Ellipse Cards:** Brand tiles feature generous `26px` squircle corners; the Trade Counter HUD uses `28px`.
- **Pedestals:** Brand logo platforms feature inset `18px` rounded corners.
- **Pills & Badges:** Full `9999px` capsule radius for category filters, status chips, search bars, and call-to-action buttons.
- **Form Inputs:** `8px` squircle with high-contrast inner border and `3.5px` focus glow ring.
- **Aerodynamic Wave Dividers:** Cubic-bezier SVG curves bridging Hero, Categories, Brands, Features, and Footer.

## Components

### Brand Cards
- **Pedestal:** Pure white `#FFFFFF` platform (`height: 220px`, `border-radius: 18px`) isolating original brand logos.
- **Crown:** Animated 3.5px flowing automotive gradient bar (`@keyframes gradientFlow`).
- **Glint:** Angled specular light beam traversing the card surface on hover.
- **Actions:** Dual pill row featuring "View Catalogue" (cobalt border) and "Ask for Stock" (WhatsApp emerald).

### Trade Counter HUD Card
- **Structure:** Floating glassmorphic terminal with 28px super-ellipse radius, ready-stock emerald breathing badge, and 2-column input rows.
- **Inputs:** High-contrast single-line inputs with smooth focus lift.
- **Action:** Full-width WhatsApp button with continuous glowing drop-shadow.

### Category Navigator Capsules
- **Default:** Elevated glass capsules with category-specific icon tints and 20px rounded corners.
- **Active:** Cobalt-to-indigo gradient background with pulsating box-shadow aura (`@keyframes activePillPulse`).

### Trade Credibility Features
- **Design:** Glassmorphic cards with glowing 48px icon frames. Icons rotate by `6deg` and scale to `1.12` on card hover.

## Do's and Don'ts

### Do:
- **Do** maintain the 100% pure white background for logo pedestals to preserve original manufacturer branding.
- **Do** route all part and stock inquiries to WhatsApp with pre-filled vehicle details and record leads to the CRM counter.
- **Do** keep both Light and Obsidian Dark themes fully styled with authentic automotive contrast.
- **Do** use aerodynamic super-ellipses (20px–28px) and fluid wave dividers between major sections.

### Don't:
- **Don't** display price numbers, currency symbols, or discount percentages anywhere on public screens.
- **Don't** use corporate marketing buzzwords ("Tier-1 Distribution", "Counterfeit Tolerance Zero", "Revolutionary Logistics").
- **Don't** introduce flat straight 1px horizontal border lines to divide major sections.
- **Don't** use generic stock photos or unverified manufacturer logos.
