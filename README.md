# Sai Rudra Motors - Automotive Parts Catalogue

An automotive spare parts catalogue and inquiry platform designed for **Sai Rudra Motors Distributors**. Customers can browse parts across 11+ leading automotive brands (Sangsin, Rotex, Delphi, HL Mando, Ceekay Exedy, etc.), filter by vehicle model, and instantly enquire about availability via pre-filled WhatsApp messages. The business owner manages suppliers, inventory, photos, and compatible vehicle tags through a secure admin portal.

---

## 🚀 Key Features

### 👤 Customer Experience (Public)
- **Brand Showcase**: Visual catalogue of authorized brands and suppliers with official brand logos.
- **Instant Search**: Real-time search across suppliers, categories, and part types on the homepage.
- **Vehicle Filtering & Search**: Filter parts by vehicle model (dropdown) or keyword search on supplier pages.
- **Expandable Vehicles**: Clean chips with `+X more` interactive toggle to see all compatible cars.
- **Direct WhatsApp Inquiries**: One-click WhatsApp button generating structured inquiries with brand, part, and vehicle details.
- **High-Resolution Photo Viewer**: Tap any part image to view enlarged in a full-screen modal with escape key and tap-to-close.
- **Strictly No Prices**: Focuses on availability and relationship-based wholesale/retail dealer pricing as per business requirements.

### 🛡️ Admin Portal (`/admin`)
- **Secure Authentication**: HMAC-SHA256 signed-cookie sessions with constant-time password comparison and rate-limiting.
- **Brand Management**: Add, rename, or delete suppliers with logo selection from available assets.
- **Part Uploads & Storage**: Upload part images (JPEG, PNG, WebP up to 5 MB) stored directly in Supabase Storage.
- **Vehicle Tagging**: Fast vehicle tagging with autocomplete suggestions based on previously entered vehicles.
- **Business Settings**: Update business name and contact WhatsApp number dynamically.

---

## 🛠️ Technology Stack

- **Runtime & Server**: Node.js & Express 5 (CommonJS).
- **Hosting**: Vercel (`@vercel/node`).
- **Database**: Supabase Postgres.
- **Image Storage**: Supabase Storage (`part-images` bucket).
- **Authentication**: Signed HTTP-only cookies (Node `crypto.createHmac`, no memory session stores).
- **Testing**: Built-in `node:test` runner.

---

## 📦 Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file from `.env.example`:
```env
PORT=3000
NODE_ENV=development
ADMIN_PASSWORD=your_secure_admin_password
SESSION_SECRET=your_32_char_random_secret_string
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Database Schema Setup
Run the SQL queries in [`schema.sql`](./schema.sql) in your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):
- Creates `settings`, `suppliers`, and `parts` tables.
- Seeds default business settings.
- Seeds the 11 official suppliers with their logos.

The Supabase Storage bucket `part-images` is automatically used for uploaded part images.

### 4. Run the Application
```bash
# Start development server with file watch
npm run dev

# Or start standard production server
npm start
```

Access the site:
- Customer Portal: `http://localhost:3000/`
- Admin Dashboard: `http://localhost:3000/admin`
- Admin Login: `http://localhost:3000/admin/login`

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run smoke tests
npm run smoke
```

---

## 📁 Project Structure

```
├── db.js                     # Supabase database queries and client
├── index.js                  # Express 5 server entry point
├── schema.sql                # Supabase Postgres schema and initial seeds
├── lib/
│   ├── auth.js               # Signed cookies, HMAC session & CSRF verification
│   ├── uploads.js            # Binary multipart parser & Supabase Storage handling
│   ├── validate.js           # Server-side input validation
│   └── whatsapp.js           # WhatsApp URL & message generation
├── routes/
│   ├── public.js             # Public catalogue API endpoints (/api/config, /api/suppliers)
│   └── admin.js              # Admin protected endpoints (/api/admin/*)
├── public/                   # Public customer assets
│   ├── css/styles.css        # Responsive customer stylesheet
│   ├── js/app.js             # Customer logic, search, image viewer
│   ├── js/supplier.js        # Supplier parts grid & vehicle filtering
│   ├── index.html            # Customer homepage
│   ├── supplier.html         # Supplier parts catalogue page
│   └── logos/                # Official brand logos
├── private/                  # Protected admin templates
│   ├── admin.html            # Admin dashboard
│   ├── login.html            # Admin login screen
│   ├── css/admin.css         # Admin stylesheet
│   └── js/admin.js           # Admin UI interactions
└── tests/
    ├── unit.test.js          # Unit tests (validation, auth, multipart, uploads)
    ├── api.test.js           # API route integration tests
    └── smoke.test.js         # End-to-end critical path tests
```

