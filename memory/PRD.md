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

### GPS Tracking per Agency Admin (Feb 27, 2026) - NEW
- GPS tab added to agency-app (6th tab, scrollable navigation)
- Full tracking page: vehicle list with positions, speed, status (en route/stationné/hors ligne), stats
- Map integration (OpenStreetMap) on vehicle click
- Per-agency Navixy config: each admin configures their own API URL + hash via settings modal
- Backend: GET/PUT /api/admin/my-agency/navixy endpoints for self-service config
- Setup prompt for agencies without Navixy config
- NOT in super admin - each agency manages independently

### Client Import with Photos (Feb 27, 2026)
- Import endpoint supports ZIP files (Excel/CSV + photos)
- Photos matched by filename column in Excel or by client name/email
- Import modal in agency admin clients page with format instructions
- Client list displays profile photos from imports

### In-App Notifications & Theme Toggle (Feb 27, 2026)
- Dark/light theme toggle in both client and agency admin apps
- Notification bell with unread badge, mark-as-read

### Agency Admin Sticky Header (Feb 27, 2026) - FIXED
- Facebook-style sticky header at TOP with scrollable tab navigation

### Previously Completed
- Admin Interface Separation, Agency Admin Mobile App, QR Codes
- AI Document Verification, Per-Agency Navixy GPS, Excel Client Import
- Multi-Agency Architecture, Calendar, Auth, Vehicles, Reservations

## Remaining Tasks
- P1: Push Notifications (Firebase)
- P3: Driver/Agent Application
- P4: Advanced Statistics & Dashboards
- P5: App Store Deployment

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin Geneva: admin-geneva@logirent.ch / LogiRent2024
- Agency Admin Lausanne: admin@test.com / password123
- Client: client1@test.com / test1234

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS per-agency), OpenAI GPT-5.2 (AI doc verification)
