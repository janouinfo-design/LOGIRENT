# LogiRent - PRD

## Branding
- **Name**: LogiRent
- **Colors**: Violet, Grey, Black
- **Language**: French (primary), English

## What's Been Implemented

### Client App
- [x] Auth (register/login), Profile with document uploads
- [x] **Top Navigation** (Facebook-style): Logo left, nav icons centered, notifications + language switcher right. No bottom tab bar.
- [x] Homepage: Hero section, category filters, 3-column vehicle grid with scroll animations
- [x] Vehicles page: "Notre Flotte" with 3-column grid and quick filters
- [x] Internationalization (FR/EN) with flag switcher in top nav
- [x] Booking with mini-calendar popup, month/year pickers
- [x] Payment: Stripe (Card), TWINT option, Cash
- [x] Notification system: bell icon with badge, backend CRUD

### Admin Panel
- [x] Dashboard, Vehicle/Reservation/User CRUD
- [x] Reservation Calendar/Agenda
- [x] Overdue reservation tracking

### Backend (FastAPI + MongoDB)
- [x] All CRUD, Stripe + TWINT, Notifications, Email (Resend)

## Architecture
```
frontend/app/(tabs)/_layout.tsx  - Custom top nav bar (Facebook-style)
frontend/app/(tabs)/index.tsx    - Homepage
frontend/app/(tabs)/vehicles.tsx - Vehicles grid
frontend/app/(tabs)/reservations.tsx
frontend/app/(tabs)/profile.tsx
frontend/app/admin/              - Admin panel
frontend/src/store/              - Zustand stores
frontend/src/i18n/               - i18n system
backend/server.py                - FastAPI server
```

## Backlog
- P1: TWINT activation (requires real Stripe key)
- P1: Automate late return notification checks (cron)
- P2: Refactor calendar into reusable component
- P3: App Store deployment, Driver/Agent app
