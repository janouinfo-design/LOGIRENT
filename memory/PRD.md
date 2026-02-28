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

### Dark/Light Mode Toggle Everywhere (Feb 28, 2026) - NEW
- Theme toggle (moon/sun icon) added to Admin and Super Admin headers
- All admin pages (`/admin/*`) now use `useThemeStore()` for dynamic theming
- All super-admin pages (`/super-admin/*`) now use `useThemeStore()` for dynamic theming
- Agency-app already had full theme support (maintained)
- Client app already had theme support (maintained)
- Theme persists via AsyncStorage across sessions
- testID props: `admin-theme-toggle`, `sa-theme-toggle`

### Email Notifications on Reservation Status Change (Feb 28, 2026)
- Backend sends branded HTML email via Resend when admin changes reservation status (confirmed, active, completed, cancelled)
- Email + in-app notification triggered simultaneously
- Note: Resend domain must be verified for emails to be delivered

### Advanced Statistics Dashboards - P3 (Feb 28, 2026)
- New `/api/admin/stats/advanced` endpoint with comprehensive metrics
- `/admin/statistics` page: KPI cards with trends, bar charts, vehicle utilization, payment donut chart
- `/agency-app/statistics` page: theme-aware mobile dashboard
- `/super-admin/statistics` page: global view across all agencies
- Navigation tab "Statistiques" added to all 3 admin interfaces

### Previously Completed
- Super Admin Agencies - Password Display & GPS Tab Removal
- Agency Admin Profile Page with dark mode toggle
- Light/Dark Theme System (agency-app + client)
- GPS Tracking per Agency Admin (Navixy)
- Client Import with Photos (ZIP)
- In-App Notifications (bell with unread badge)
- Agency Admin Mobile App, Admin Interface Separation, QR Codes
- AI Document Verification, Multi-Agency Architecture, Calendar, Auth, Vehicles, Reservations
- Stripe Payments, Resend Email

## Remaining Tasks
- P1: Push Notifications (Firebase) for mobile apps
- P2: Driver/Agent Application
- P4: App Store Deployment

## Refactoring Needs
- `server.py` monolith (3000+ lines) → split into routers
- Security: password stored in plain text (initial_password field)

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin Geneva: admin-geneva@logirent.ch / LogiRent2024
- Agency Admin Lausanne: admin@test.com / password123
- Client: client1@test.com / test1234

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS), OpenAI GPT-5.2 (AI doc verification)

## Key Files
- Backend: `/app/backend/server.py`
- Theme Store: `/app/frontend/src/store/themeStore.ts`
- Admin Layout: `/app/frontend/app/admin/_layout.tsx`
- Super Admin Layout: `/app/frontend/app/super-admin/_layout.tsx`
- Admin Stats: `/app/frontend/app/admin/statistics.tsx`
- Agency Stats: `/app/frontend/app/agency-app/statistics.tsx`
- Super Admin Stats: `/app/frontend/app/super-admin/statistics.tsx`
