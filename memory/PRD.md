# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile/Web App
- Admin Web Back-office (Super Admin & Agency Admin)
- Future: Driver/Agent App

## Core Architecture
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (local dev) / MongoDB Atlas (production)
- **Storage**: MinIO Object Storage (via emergentintegrations)

## What's Been Implemented

### Authentication & Roles
- Super Admin, Agency Admin, Client roles
- JWT-based auth with bcrypt password hashing
- Role-based redirection: super_admin → /super-admin, admin → /agency-app, client → /(tabs)
- Password reset via email (Resend)

### Frontend Refactoring (March 18, 2026)
- Moved components out of Expo Router route folders (app/agency-app/components/ → src/components/agency/)
- Fixed all imports in vehicles.tsx, reservations.tsx, clients.tsx
- Branding: RentDrive → LogiRent (French)
- No more Expo Router warnings for non-route components

### Demo Data Seed
- Script: /app/scripts/seed_demo.py
- 2 agencies (Geneva, Lausanne), 12 users, 12 vehicles with photos, 32+ reservations over 1 month
- Realistic Swiss data (names, addresses, plates, phone numbers)
- Multiple statuses: completed, active, confirmed, pending, cancelled

### Vehicle Management
- CRUD with photos, options, documents
- 12 vehicles: berline, citadine, SUV, utilitaire, van, electrique
- Vehicle status: available/rented/maintenance

### Reservation System
- Gantt chart view with color-coded statuses
- Card list view with action buttons
- Calendar integration
- Payment via Stripe and cash

### Contract System
- Interactive vehicle inspection diagram
- Single-page PDF generation (ReportLab)
- Per-agency contract templates
- Live PDF preview

### VPS Deployment
- Seed script: /app/scripts/seed_superadmin.py
- Full seed: /app/scripts/seed_demo.py (also works on VPS with Atlas)
- Guide: /app/scripts/GUIDE_DEPLOIEMENT_VPS.md

## 3rd Party Integrations
- Stripe, Resend, Navixy, OpenAI (emergentintegrations), MinIO, ReportLab, QRCode

## Test Credentials (Dev)
- Super Admin: test@example.com / password123
- Agency Admin: admin-geneva@logirent.ch / LogiRent2024
- Client: client1@test.com / test1234

## Test Credentials (Seed)
- All accounts: LogiRent2024!
- Super Admin: superadmin@logirent.ch
- Admin Geneva: admin-geneva@logirent.ch
- Clients: jean.dupont@gmail.com, sophie.martin@outlook.com, etc.

## Pending Issues
1. Resend Domain Verification (P2) - User needs to verify logirent.ch

## Upcoming Tasks
1. Push Notifications (P1)
2. Driver/Agent Application (P2)
3. App Store Deployment (P3)
