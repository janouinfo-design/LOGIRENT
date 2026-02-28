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

### Email Notifications on Reservation Status Change (Feb 28, 2026) - NEW
- Backend sends email via Resend when admin changes reservation status (confirmed, active, completed, cancelled)
- Branded HTML email template in French with reservation details (vehicle, dates, amount)
- Email + in-app notification triggered simultaneously
- Note: Resend domain (logitrak.ch) must be verified for emails to be delivered

### Advanced Statistics Dashboards - P3 (Feb 28, 2026) - NEW
- New `/api/admin/stats/advanced` endpoint with: revenue trends, vehicle utilization, daily/weekly revenue, payment method breakdown, cancellation rate, new clients, average booking duration/revenue
- `/admin/statistics` page: dark theme, KPI cards with trends, bar charts (daily/weekly revenue), vehicle utilization bars, revenue per vehicle, payment methods donut chart
- `/agency-app/statistics` page: theme-aware (light/dark), same rich dashboard adapted for mobile
- `/super-admin/statistics` page: global view across all agencies, includes agency count KPI
- Navigation tab "Statistiques" added to all 3 admin interfaces

### Super Admin Agencies - Password Display & GPS Tab Removal (Feb 27, 2026)
- Mot de passe admin affiché à côté de l'email de chaque agence dans Super Admin > Agences
- Onglet "Suivi GPS" supprimé du menu Super Admin (GPS exclusif à l'admin agence)

### Agency Admin Profile Page (Feb 27, 2026)
- New "Profil" tab (7th tab) in agency admin app
- Admin info, agency info, Links & QR Codes, dark mode toggle, GPS config link, logout

### Light/Dark Theme System (Feb 27, 2026)
- Default theme: LIGHT, all screens use dynamic theme colors, toggle persisted

### GPS Tracking per Agency Admin (Feb 27, 2026)
- GPS tab, per-agency Navixy config, self-service setup

### Client Import with Photos (Feb 27, 2026)
- ZIP import (Excel/CSV + photos), photos matched by filename

### In-App Notifications (Feb 27, 2026)
- Notification bell with unread badge in client and agency layouts

### Previously Completed
- Agency Admin Mobile App, Admin Interface Separation, QR Codes
- AI Document Verification, Multi-Agency Architecture, Calendar, Auth, Vehicles, Reservations
- Stripe Payments, Resend Email, Navixy GPS

## Remaining Tasks
- P1: Push Notifications (Firebase) for mobile apps
- P2: Driver/Agent Application
- P4: App Store Deployment

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin Geneva: admin-geneva@logirent.ch / LogiRent2024
- Agency Admin Lausanne: admin@test.com / password123
- Client: client1@test.com / test1234

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS per-agency), OpenAI GPT-5.2 (AI doc verification)

## Key Files
- Backend: `/app/backend/server.py`
- Admin Stats: `/app/frontend/app/admin/statistics.tsx`
- Agency Stats: `/app/frontend/app/agency-app/statistics.tsx`
- Super Admin Stats: `/app/frontend/app/super-admin/statistics.tsx`
