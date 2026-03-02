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

### Filter Chips Fix + Bigger Nav Menu (Mar 2, 2026) - NEW
- Fixed reservation filter chips (Toutes, En attente, Espèces, Confirmées, Actives, Terminées, Annulées) - now visible with proper colors and theme support
- Enlarged navigation menu: icons 24px, text 13px (was 20px/11px)
- Used inline styles to avoid Metro CI cache issues with StyleSheet references

### Edit Client Profiles from Agency Admin (Mar 2, 2026)
- Click on any client card to open edit modal
- Editable fields: Name, Email, Phone, Address, Rating (VIP/Bon/Neutre/Mauvais/Bloqué), Admin Notes

### GPS Tracking - Fixed Map Layout (Mar 2, 2026)
- Map always visible and fixed at top (agency-app + admin tracking)
- Clicking a vehicle centers the map on its position with a marker

### Contract System with Digital Signature (Feb 28, 2026)
- Full contract API, bilingual, digital signature, PDF generation

### Dark/Light Mode Toggle Everywhere (Feb 28, 2026)
- Theme toggle in Admin and Super Admin headers

### Email Notifications (Feb 28, 2026)
- Branded HTML email via Resend on reservation status change

### Advanced Statistics Dashboards (Feb 28, 2026)
- 3 Statistics pages with SVG charts

### Previously Completed
- Super Admin Agencies, GPS Tab, Password Display
- Agency Admin Profile Page, Theme System
- GPS Tracking (Navixy), Client Import (ZIP)
- In-App Notifications, QR Codes, Calendar
- AI Document Verification, Multi-Agency Architecture
- Auth, Vehicles, Reservations, Stripe Payments, Resend Email

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
