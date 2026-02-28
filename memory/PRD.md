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

### Contract System with Digital Signature (Feb 28, 2026) - NEW
- **Backend**: Full contract API: generate, get, list, send, sign, PDF download
- **Contract Template**: Based on user's DOCX template with 7 sections: Tenant Info, Vehicle, Price, Deposit, Insurance, Debt Acknowledgment, Jurisdiction + General Conditions + Vehicle Inspection + Final Statement
- **Bilingual**: Full FR + EN support for contract content
- **Digital Signature**: HTML5 canvas-based signature pad for clients (web)
- **PDF Generation**: Uses reportlab to generate professional multi-page PDF with signature
- **Workflow**: Admin generates contract → Sends to client → Client signs → PDF available
- **Client Access**: "Voir le contrat" button on client's reservation cards
- **Admin Access**: "Contrat" button on admin reservation cards with generate/view/send/download options
- **MongoDB**: `contracts` collection with status flow: draft → sent → signed

### Dark/Light Mode Toggle Everywhere (Feb 28, 2026)
- Theme toggle (moon/sun icon) in Admin and Super Admin headers
- All admin/super-admin pages use `useThemeStore()` for dynamic theming
- Agency-app and client app maintained existing theme support

### Email Notifications on Reservation Status Change (Feb 28, 2026)
- Branded HTML email via Resend when status changes (confirmed/active/completed/cancelled)
- In-app + email notifications triggered simultaneously

### Advanced Statistics Dashboards - P3 (Feb 28, 2026)
- `/api/admin/stats/advanced` endpoint with comprehensive metrics
- 3 Statistics pages: Admin, Agency App, Super Admin with SVG charts

### Previously Completed
- Super Admin Agencies, GPS Tab, Password Display
- Agency Admin Profile Page, Theme System
- GPS Tracking (Navixy), Client Import (ZIP)
- In-App Notifications, QR Codes, Calendar
- AI Document Verification, Multi-Agency Architecture
- Auth, Vehicles, Reservations, Stripe Payments, Resend Email

## Key Files - Contract System
- Backend: `/app/backend/server.py` (Contract endpoints at end of file)
- Contract View: `/app/frontend/app/contract/[id].tsx`
- Signature Canvas: `/app/frontend/src/components/SignatureCanvas.tsx`
- Admin Reservations: `/app/frontend/app/admin/reservations.tsx` (Contrat button)

## Remaining Tasks
- P1: Push Notifications (Firebase) for mobile apps
- P2: Driver/Agent Application
- P4: App Store Deployment

## Refactoring Needs
- `server.py` monolith (3500+ lines) → split into routers
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
