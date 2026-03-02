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

### Contract Actions in Agency App (Mar 2, 2026) - NEW
- Added CONTRAT section to reservation action modal with 3 options:
  - "Voir / Générer le contrat" - views existing or generates new, then navigates to contract page
  - "Envoyer le contrat au client" - sends contract by email via PUT /api/contracts/{id}/send
  - "Télécharger le PDF" - downloads contract PDF
- Uses GET /api/contracts/by-reservation/{reservation_id} to find contract by reservation

### Filter Chips Fix + Bigger Nav Menu (Mar 2, 2026)
- Fixed reservation filter chips with inline styles (Metro CI cache workaround)
- Enlarged navigation menu: icons 24px, text 13px

### Edit Client Profiles from Agency Admin (Mar 2, 2026)
- Click on any client card to open edit modal (Name, Email, Phone, Address, Rating, Notes)

### GPS Tracking - Fixed Map Layout (Mar 2, 2026)
- Map always visible and fixed at top, clicking vehicle centers map

### Contract System with Digital Signature (Feb 28, 2026)
- Full contract API, bilingual, digital signature, PDF generation

### Dark/Light Mode Toggle Everywhere (Feb 28, 2026)
### Email Notifications (Feb 28, 2026)
### Advanced Statistics Dashboards (Feb 28, 2026)
### Previously Completed
- Super Admin, GPS (Navixy), Client Import, Notifications, QR Codes, Calendar, AI Doc Verification, Multi-Agency, Auth, Vehicles, Reservations, Stripe

## Remaining Tasks
- P1: Push Notifications (Firebase)
- P2: Driver/Agent Application
- P3: Refactoring server.py monolith into routers
- P4: App Store Deployment
- Security: password hashing for agencies

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin Geneva: admin-geneva@logirent.ch / LogiRent2024
- Client: client1@test.com / test1234

## 3rd Party Integrations
- Stripe, Resend, Navixy, OpenAI GPT-5.2, reportlab

## DB Collections
- users, agencies, vehicles, reservations, notifications, contracts
