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

### QR Codes per Agency (Feb 27, 2026) - NEW
- Each agency now displays 2 QR codes: App Client + App Admin Agence
- QR codes shown in agency profile modal (Super Admin → Agences → QR Codes)
- QR codes also shown in success modal after agency creation
- Client QR → `/a/{slug}` (registration & catalog)
- Admin QR → `/admin-login` (agency mobile app)

### Agency Admin Mobile App (Feb 27, 2026)
- Mobile-optimized interface at `/agency-app` with bottom tab navigation
- 5 tabs: Accueil, Réserver, Réservations, Véhicules, Clients
- Phone Booking Flow: 4-step wizard (Client → Vehicle → Options/Payment → Confirm)
- Quick Client Creation, Client Search, Vehicle Availability
- Payment Options: Cash or Send Payment Link (Stripe via email)

### Admin Interface Separation (Feb 27, 2026)
- Super Admin at `/super-admin`, Agency Admin at `/admin`
- Role-based login redirect

### Previously Completed
- AI Document Verification, Per-Agency Navixy GPS, Excel Client Import
- Base64/JSON Document Upload, Multi-Agency Architecture, Calendar, Auth, Vehicles, Reservations

## Remaining Tasks
- P1: Push Notifications
- P2: Client Import with Photos
- P3: Driver/Agent Application
- P4: Advanced Statistics & Dashboards
- P5: App Store Deployment

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin: admin@test.com / admin123 (LogiRent Lausanne)
- Client: client1@test.com / test1234

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS), OpenAI GPT-5.2 (AI doc verification)
