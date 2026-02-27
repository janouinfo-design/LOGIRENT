# LogiRent - PRD

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile App (iOS & Android) and Web App
- Agency Admin Mobile App for phone bookings
- Admin Web Back-office with Super Admin and Agency Admin roles
- French/English internationalization, violet/grey/black branding

## Architecture
- **3 Interfaces**: Client App (`/`), Agency Admin Mobile App (`/agency-app`), Super Admin (`/super-admin`), Web Admin (`/admin`)
- **Backend**: FastAPI + MongoDB
- **Frontend**: React Native (Expo Router)
- **Auth**: JWT-based, role-based routing

## What's Been Implemented

### Agency Admin Mobile App (Feb 27, 2026) - NEW
- Mobile-optimized interface at `/agency-app` with bottom tab navigation
- **5 tabs**: Accueil, Réserver, Réservations, Véhicules, Clients
- **Phone Booking Flow**: 4-step wizard (Client → Vehicle → Options/Payment → Confirm)
- **Quick Client Creation**: Create new clients during phone calls (name, phone, email)
- **Client Search**: Real-time search by name, email, or phone
- **Vehicle Availability**: Date-based search for available vehicles
- **Payment Options**: Cash (pay at pickup) or Send Payment Link (Stripe checkout link via email)
- **Backend Endpoints**: /api/admin/quick-client, /api/admin/search-clients, /api/admin/available-vehicles, /api/admin/create-reservation-for-client, /api/admin/reservations/{id}/send-payment-link
- Client nav bar hidden for admin users

### Admin Interface Separation (Feb 27, 2026)
- Super Admin at `/super-admin` (red/dark theme, global data)
- Agency Admin web at `/admin` (purple theme, agency-scoped)
- Role-based login redirect

### Previously Completed
- AI Document Verification (GPT-5.2 Vision)
- Per-Agency Navixy GPS Integration
- Excel Client Import
- Base64/JSON Document Upload
- Multi-Agency Architecture, Calendar, Auth, Vehicles, Reservations

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
- Test Client: jean@test.com (Jean Dupont)

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS), OpenAI GPT-5.2 (AI doc verification)
