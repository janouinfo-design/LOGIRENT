# LogiRent - PRD

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile App (iOS & Android) and Web App
- Admin Web Back-office with Super Admin and Agency Admin roles
- French/English internationalization, violet/grey/black branding

## What's Been Implemented

### Admin Interface Separation (Feb 27, 2026)
- Super Admin interface at `/super-admin` (red/dark theme, "SUPER ADMIN" badge)
- Agency Admin interface at `/admin` (purple theme, agency-scoped)
- Role-based login redirect: super_admin → /super-admin, admin → /admin
- Super admin sees global data, agency admin sees only their agency's data
- Route guards prevent cross-access between interfaces

### Navixy Per-Agency Config (Feb 27, 2026)
- Each agency has its own `navixy_api_url` and `navixy_hash` fields
- Editable from Super Admin → Agences → edit → "Configuration Navixy GPS" section
- Tracking page uses agency-specific config, falls back to global .env config

### Excel Client Import (Feb 27, 2026)
- Admin → Utilisateurs → "Importer Excel" button
- Supports .xlsx, .xls, .csv with flexible column mapping
- Default password: LogiRent2024

### AI Document Verification (Feb 26, 2026)
- GPT-5.2 Vision auto-verifies ID cards and driver's licenses
- Rejects fake/invalid documents with explanation

### Navixy GPS Integration (Feb 26, 2026)
- Real-time GPS tracking of fleet vehicles
- Admin "Suivi GPS Flotte" page with OpenStreetMap

### Document Upload Fix (Feb 26, 2026)
- Base64/JSON upload (web + native), camera option, compression

### Previously Completed
- Multi-Agency Architecture, Calendar System, Core Features (Auth, Vehicles, Reservations, Stripe, Email)

## Remaining Tasks (Prioritized Backlog)
- P1: Push Notifications (in-app + push for reservation status changes)
- P2: Client Import with Photos (include photos during Excel import)
- P3: Driver/Agent Application (separate mobile app)
- P4: Advanced Statistics & Dashboards
- P5: App Store Deployment

## Refactoring Needed
- Break down server.py into separate FastAPI routers (auth, admin, navixy, etc.)

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin: admin@test.com / admin123 (LogiRent Lausanne)
- Client: client1@test.com / test1234
- Imported clients: LogiRent2024

## 3rd Party Integrations
- Stripe (Payments)
- Resend (Email)
- Navixy (GPS Tracking) - per-agency
- OpenAI GPT-5.2 via emergentintegrations (AI doc verification)
