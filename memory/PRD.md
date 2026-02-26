# LogiRent - PRD (Product Requirements Document)

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile App (iOS & Android) and Web App
- Admin Web Back-office
- Multi-agency support
- Branding: violet, grey, black. Languages: French/English

## What's Been Implemented

### AI Document Verification (Feb 26, 2026)
- **NEW**: GPT-5.2 Vision verifies uploaded documents (ID card / driver's license)
- Detects fake documents, screenshots, non-documents with confidence score
- Rejects invalid uploads with HTTP 400 and explanation message
- Verification results saved in DB (id_verification, license_verification)
- Frontend shows AI verification feedback after upload

### Navixy GPS Integration (Feb 26, 2026)
- Full integration with Navixy GPS tracking API (login.logitrak.fr)
- 4 backend endpoints (trackers, tracker state, all positions, sync vehicles)
- Admin "Suivi GPS Flotte" page with real-time positions, auto-refresh 30s
- OpenStreetMap embedded map, vehicle sync to DB

### Document Upload Fix (Feb 26, 2026)
- Fixed critical upload bug on web/mobile-web (base64/JSON approach)
- Camera photo option for native app (expo-image-picker base64)
- Fixed logout crash (hooks order), agency admin count bug

### Multi-Agency Architecture (Complete)
- Agency-specific URLs (/a/[slug]) and QR code onboarding
- Vehicle catalogs filtered by client's agency
- QR code generation in admin panel

### Calendar System (Complete)
- Visual availability calendar, reservation times HH:MM
- Mobile-responsive admin calendar, "Aujourd'hui" button

### Core Features (Complete)
- Auth (email/password, role-based: super_admin, admin, client)
- Vehicle CRUD, Reservation system, Stripe payments, Email notifications, Responsive UI

## Remaining Tasks

### P2 - Push Notifications
### P3 - App Store Deployment
### P4 - Driver/Agent Application
### P5 - Advanced Statistics & Dashboards

## Key Integrations
- **GPT-5.2 Vision** (via Emergent LLM Key): Document verification
- **Navixy GPS**: Vehicle tracking (login.logitrak.fr/api-v2)
- **Stripe**: Payments
- **Resend**: Email notifications

## Credentials
- Super Admin: test@example.com / password123
- Client: client1@test.com / test1234
