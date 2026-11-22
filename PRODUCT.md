# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Multi-brand garage owners, independent automotive technicians, mechanics, fleet managers, and retail auto spare parts counters across Karnataka. They operate under tight turnaround times and require immediate verification of stock availability, genuine OEM/OES components, trade rates, and rapid daily transport dispatch to minimize vehicle downtime.

## Product Purpose
Sai Rudra Motors (SRM) is an authorized wholesale and retail distributor for 11 premier OEM and aftermarket automotive component manufacturers. The platform provides an authoritative digital catalog, vehicle compatibility lookup, and direct counter inquiry desk connecting Karnataka's automotive trade ecosystem directly to authentic depot inventory.

## Positioning
Direct authorized distribution channel with 100% genuine company stock, authentic GST invoicing, daily transport dispatch across Karnataka routes (Hubballi, Bengaluru, Mysuru, Belagavi, etc.), and expert part-matching assistance—eliminating counterfeit risks and grey-market middleman markups.

## Operating Context
Fast-paced multi-brand workshop bays and counter sales desks where technicians need instant part numbers, compatibility checks by vehicle make/model/year, or visual part matching via vehicle RC/sample photos over WhatsApp.

## Capabilities and Constraints
- Direct 11-brand authorized distribution catalog: Sangsin Brakes, Autolek Filters, Rotex Brake Discs, MX Mark Xtralife, Ceekay Exedy Clutches, Mavrod Suspension, TVS Coolants, MB Techno Rubber, HL Mando, Delphi Engine Oils, Delphi Driveshafts.
- Instant search and category filtration across braking, filtration, clutch & transmission, suspension & steering, fluids & lubricants, and molded rubber parts.
- Trade counter WhatsApp inquiry engine with structured vehicle and requirement handoff.
- Server-side CRM inquiry capture recording customer name, phone, enquiry type, brand, and vehicle details into the dealer admin portal.
- Secure dealer administrative portal (`/admin`) for catalog, brand, and lead management.
- BINDING CONSTRAINT: Zero public price display on any screen. Rates and wholesale terms are quoted exclusively via authorized counter interaction and dealer login.

## Brand Commitments
- Business Name: SRM — Sai Rudra Motors
- Subtitle: Authorized Auto Spares Distributors
- Depot Location: M/s. Sai Rudra Motors, #103/A/5, First Floor (Near Nalwaad Hospital) Ward No.3, Gokul Road, Green Garden, Vikas Nagar, Hubballi, Karnataka 580029
- Contact / WhatsApp: Dynamic (via Admin Portal settings)
- Depot Operating Hours: Monday – Saturday, 9:00 AM – 8:00 PM
- Brand Voice: Grounded, practical, trade-focused Indian automotive distributor. Direct and professional without generic marketing buzzwords.

## Evidence on Hand
- 11 verified manufacturer brand logos in `public/logos/`.
- 44 automated test suites covering API endpoints, admin authentication, inquiry persistence, and catalog integrity.
- Full dealer portal implementation in `private/admin.html` and `private/js/admin.js`.
- Existing design authority in `docs/DESIGN.md`.

## Product Principles
1. Genuine Stock & Direct Billing: 100% original manufacturer supply with transparent GST invoicing; zero counterfeit tolerance.
2. Trade-First Counter Workflow: Frictionless WhatsApp inquiry handoff connected to internal CRM leads; no forced checkout barriers.
3. Strict Pricing Integrity: No public prices on any screen; preserve workshop and dealer commercial margins.
4. Rapid Dispatch Reliability: Optimized for daily transport connectivity across all major Karnataka parcel and logistics routes.

## Accessibility & Inclusion
Clean high-contrast responsive interface supporting both Light and Obsidian Dark themes, accessible keyboard navigation, screen-reader labels, and mobile-optimized touch targets for workshop floor environments.
