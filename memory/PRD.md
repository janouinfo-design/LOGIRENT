# LogiRent - PRD

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile App (iOS & Android) and Web App
- Agency Admin Mobile App for phone bookings
- Admin Web Back-office with Super Admin and Agency Admin roles
- French/English internationalization, violet/grey/black branding

## Architecture
- **4 Interfaces**: Client App (`/`), Agency Admin Mobile App (`/agency-app`), Super Admin (`/super-admin`), Web Admin (`/admin`)
- **Backend**: FastAPI + MongoDB
- **Frontend**: React Native (Expo Router)
- **Auth**: JWT-based, role-based routing

## What's Been Implemented

### GPS Tracking - Fixed Map Layout (Mar 2, 2026) - NEW
- Map is now always visible and fixed at top of the page (agency-app + admin tracking)
- Clicking a vehicle in the list centers the map on its position with a marker
- Selected vehicle shows "Affiché sur la carte" indicator
- Default view shows Switzerland; zooms to first vehicle with position when available

### Clickable Agency App Dashboard Cards (Feb 28, 2026)
- Four stat cards (Véhicules, Réservations, Clients, CHF Rev.) navigate to respective pages

### Contract System with Digital Signature (Feb 28, 2026)
- Backend: Full contract API: generate, get, list, send, sign, PDF download
- Contract Template: Based on user's DOCX template with 7 sections
- Bilingual: Full FR + EN support for contract content
- Digital Signature: HTML5 canvas-based signature pad for clients (web)
- PDF Generation: Uses reportlab to generate professional multi-page PDF
- Workflow: Admin generates contract -> Sends to client -> Client signs -> PDF available

### Dark/Light Mode Toggle Everywhere (Feb 28, 2026)
- Theme toggle (moon/sun icon) in Admin and Super Admin headers
- All admin/super-admin pages use `useThemeStore()` for dynamic theming

### Email Notifications on Reservation Status Change (Feb 28, 2026)
- Branded HTML email via Resend when status changes
- In-app + email notifications triggered simultaneously

### Advanced Statistics Dashboards (Feb 28, 2026)
- `/api/admin/stats/advanced` endpoint with comprehensive metrics
- 3 Statistics pages: Admin, Agency App, Super Admin with SVG charts

### Previously Completed
- Super Admin Agencies, GPS Tab, Password Display
- Agency Admin Profile Page, Theme System
- GPS Tracking (Navixy), Client Import (ZIP)
- In-App Notifications, QR Codes, Calendar
- AI Document Verification, Multi-Agency Architecture
- Auth, Vehicles, Reservations, Stripe Payments, Resend Email

## Key Files
- Backend: `/app/backend/server.py`
- Agency Tracking: `/app/frontend/app/agency-app/tracking.tsx`
- Admin Tracking: `/app/frontend/app/admin/tracking.tsx`
- Super Admin Tracking: `/app/frontend/app/super-admin/tracking.tsx` (re-exports admin)
- Agency App Home: `/app/frontend/app/agency-app/index.tsx`
- Contract View: `/app/frontend/app/contract/[id].tsx`
- Signature Canvas: `/app/frontend/src/components/SignatureCanvas.tsx`

## Remaining Tasks
- P1: Push Notifications (Firebase) for mobile apps
- P2: Driver/Agent Application
- P3: Refactoring server.py monolith into routers
- P4: App Store Deployment
- Security: password stored in plain text (initial_password field)

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin Geneva: admin-geneva@logirent.ch / LogiRent2024
- Agency Admin Lausanne: admin@test.com / password123
- Client: client1@test.com / test1234

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS), OpenAI GPT-5.2 (AI doc verification), reportlab (PDF generation)

## DB Collections
- users, agencies, vehicles, reservations, notifications, contracts
