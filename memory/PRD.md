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

### Client Import with Photos (Feb 27, 2026) - NEW
- Enhanced import endpoint supports ZIP files (Excel/CSV + photos)
- Photos matched by filename column in Excel or by client name/email
- Import modal in agency admin clients page with format instructions
- Client list now displays profile photos from imports
- Agency admin users query updated to show imported clients (with or without reservations)

### In-App Notifications & Theme Toggle (Feb 27, 2026) - NEW
- Dark/light theme toggle in both client and agency admin apps
- Theme store (Zustand + AsyncStorage) applies colors dynamically to both layouts
- Notification bell with unread badge in both apps
- Notification panel (modal) with mark-as-read, mark-all-as-read
- Backend notification endpoints: GET/PUT notifications, unread-count, read-all
- Removed duplicate notification routes from server.py

### Agency Admin Sticky Header (Feb 27, 2026) - FIXED
- Facebook-style sticky header at TOP of page (was broken, now fixed)
- Header: LogiRent logo, agency name badge, theme toggle, notification bell, logout
- Tab navigation below header: Accueil, Réserver, Réservations, Véhicules, Clients

### QR Codes per Agency (Feb 27, 2026)
- Each agency displays 2 QR codes: App Client + App Admin Agence
- QR codes shown in agency profile modal (Super Admin > Agences > QR Codes)

### Agency Admin Mobile App (Feb 27, 2026)
- Mobile-optimized interface at `/agency-app` with custom tab navigation
- 5 tabs: Accueil, Réserver, Réservations, Véhicules, Clients
- Phone Booking Flow: 4-step wizard
- Quick Client Creation, Client Search, Vehicle Availability
- Payment Options: Cash or Send Payment Link (Stripe via email)

### Admin Interface Separation (Feb 27, 2026)
- Super Admin at `/super-admin`, Agency Admin at `/admin`
- Role-based login redirect

### Previously Completed
- AI Document Verification, Per-Agency Navixy GPS, Excel Client Import
- Base64/JSON Document Upload, Multi-Agency Architecture, Calendar, Auth, Vehicles, Reservations

## Remaining Tasks
- P1: Push Notifications (Firebase)
- P3: Driver/Agent Application
- P4: Advanced Statistics & Dashboards
- P5: App Store Deployment

## Refactoring Needs
- server.py should be split into smaller route modules

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin Geneva: admin-geneva@logirent.ch / LogiRent2024
- Agency Admin Lausanne: admin@test.com / password123
- Client: client1@test.com / test1234

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS), OpenAI GPT-5.2 (AI doc verification)
