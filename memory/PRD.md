# LogiRent - PRD (Product Requirements Document)

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile App (iOS & Android) and Web App
- Admin Web Back-office
- Multi-agency support
- Branding: violet, grey, black. Languages: French/English

## What's Been Implemented

### Document Upload Fix (Feb 26, 2026)
- **FIXED**: Critical document upload bug on web/mobile-web platforms
  - Root cause: Blob URL roundtrip + manual Content-Type header breaking FormData boundary
  - Solution: base64/JSON upload endpoints bypass proxy size limits
  - Both ID card and license uploads working on web AND native
- **FIXED**: Agency admin count now includes super_admin in stats
- **FIXED**: Logout crash (hooks rendered conditionally) resolved
- **ADDED**: Camera photo option for native app (expo-image-picker with base64: true)

### Navixy GPS Integration (Feb 26, 2026)
- **NEW**: Full integration with Navixy GPS tracking API (login.logitrak.fr)
- Backend: 4 endpoints (trackers list, tracker state, all positions, sync vehicles)
- Frontend: Admin "Suivi GPS Flotte" page with real-time positions
- 26 trackers connected, auto-refresh every 30s, OpenStreetMap embedded
- Vehicle sync to import Navixy trackers into LogiRent database

### Multi-Agency Architecture (Complete)
- Agency-specific URLs (/a/[slug]) and QR code onboarding
- Vehicle catalogs filtered by client's agency
- QR code generation in admin panel
- Super-admin can manage all agencies

### Calendar System (Complete)
- Visual availability calendar on booking page (occupied/free/past days)
- Reservation times (HH:MM) on client and admin calendars
- Mobile-responsive admin calendar
- "Aujourd'hui" button and direct booking from free days

### Core Features (Complete)
- Auth (email/password, role-based: super_admin, admin, client)
- Vehicle CRUD with photos
- Reservation system with status management
- Stripe payment integration
- Email notifications via Resend
- Responsive UI (mobile/web)

## Remaining Tasks

### P2 - Push Notifications
- Implement real push notifications for reservation status and alerts

### P3 - App Store Deployment
- Prepare and submit builds to Google Play Store and Apple App Store

### P4 - Driver/Agent Application
- Build separate application for drivers/agents

### P5 - Advanced Statistics & Dashboards
- Revenue dashboards, fleet utilization, advanced analytics

## Architecture
```
/app
├── backend/
│   └── server.py          # FastAPI with Navixy integration
├── frontend/
│   ├── app/
│   │   ├── (tabs)/        # Client pages (index, profile, reservations)
│   │   ├── admin/         # Admin pages (index, vehicles, reservations, users, payments, agencies, tracking)
│   │   ├── a/[slug].tsx   # Agency landing pages
│   │   └── scan-qr.tsx    # QR scanner
│   └── src/store/
│       ├── authStore.ts   # Auth + document upload (base64)
│       └── vehicleStore.ts
```

## Key Integrations
- **Navixy GPS**: API URL: login.logitrak.fr/api-v2, hash auth
- **Stripe**: Payment processing
- **Resend**: Email notifications
- **expo-image-picker**: Camera + gallery for document upload
- **react-qr-code / expo-barcode-scanner**: QR code flow

## Credentials
- Super Admin: test@example.com / password123
- Client: client1@test.com / test1234
