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

### Light/Dark Theme System (Feb 27, 2026) - NEW
- Default theme changed from dark to LIGHT
- ALL screens (client + agency admin) now use dynamic theme colors via useThemeStore()
- Toggle button (moon/sun icon) in both app headers
- Theme persisted to AsyncStorage/localStorage
- Consistent white backgrounds, dark text, purple accents in light mode

### GPS Tracking per Agency Admin (Feb 27, 2026)
- GPS tab in agency-app (6th tab, scrollable navigation)
- Per-agency Navixy config with self-service setup modal
- Backend: GET/PUT /api/admin/my-agency/navixy endpoints

### Client Import with Photos (Feb 27, 2026)
- ZIP import (Excel/CSV + photos), photos matched by filename
- Import modal with format instructions

### In-App Notifications (Feb 27, 2026)
- Notification bell with unread badge, mark-as-read panel

### Previously Completed
- Agency Admin Mobile App, Admin Interface Separation, QR Codes
- AI Document Verification, Per-Agency Navixy GPS, Excel Client Import
- Multi-Agency Architecture, Calendar, Auth, Vehicles, Reservations

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
- Stripe (Payments), Resend (Email), Navixy (GPS per-agency), OpenAI GPT-5.2 (AI doc verification)
