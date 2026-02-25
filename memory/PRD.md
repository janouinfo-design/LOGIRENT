# RentDrive - Car Rental Solution PRD

## Original Problem Statement
Build a complete car rental solution with:
- Client Mobile App (iOS & Android) 
- Admin Web Back-office
- (Optional) Driver/Agent App

Target market: Switzerland (TWINT payment important)

## Tech Stack
- **Frontend**: React Native (Expo Router), Zustand, Axios
- **Backend**: Python FastAPI
- **Database**: MongoDB (via pymongo)
- **Authentication**: JWT
- **Payments**: Stripe (+ cash option)

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI server, all API logic
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   ├── admin-login.tsx
    │   │   └── login.tsx
    │   ├── (tabs)/
    │   │   ├── index.tsx, profile.tsx, reservations.tsx
    │   ├── admin/
    │   │   ├── _layout.tsx
    │   │   ├── index.tsx (dashboard)
    │   │   ├── calendar.tsx (NEW - agenda)
    │   │   ├── reservations.tsx (fixed ScrollView)
    │   │   ├── vehicles.tsx
    │   │   ├── users.tsx
    │   │   └── payments.tsx
    │   ├── vehicle/[id].tsx
    │   └── booking.tsx
    └── package.json
```

## Tâches complétées (25 Fév 2026)
- Correction affichage statuts réservations admin (FlatList -> ScrollView)
- Page Agenda/Calendrier admin avec CSS Grid, indicateurs départs/retours, détection retards
- Mini calendrier popup sur la page de réservation client
- Traduction complète en français de la page booking

### Client App
- [x] Email/password registration & login
- [x] Vehicle catalog with photos, prices
- [x] Booking flow with date selection
- [x] Stripe payment + Cash payment option
- [x] Profile with mandatory document upload (ID, driving license)

### Admin Panel (Web)
- [x] Separate admin login (/admin-login)
- [x] Dashboard with stats (revenue, fleet, bookings)
- [x] **Calendar/Agenda page** — Monthly grid showing car departures & returns with CSS Grid
- [x] Vehicle CRUD (add/edit/delete, multi-photo upload, status changes)
- [x] Reservation management (status changes, payment status, search, date filter)
- [x] User management (edit info, notes, ratings, document uploads)
- [x] Payment dashboard
- [x] Overdue vehicle detection (API + alert banner)

### Bug Fixes (Feb 24, 2026)
- [x] Fixed reservation status visibility (replaced FlatList with ScrollView+map)
- [x] Built calendar/agenda page with CSS Grid (React Native Web flex limitation workaround)

## Pending/Upcoming Tasks

### P1 - High Priority
- [ ] TWINT payment integration (important for Swiss market, via Stripe)

### P2 - Medium Priority  
- [ ] Deploy to app stores (Google Play, Apple App Store)
- [ ] Push/email notifications (reservation confirmations, reminders)

### P3 - Low Priority / Future
- [ ] Driver/Agent application
- [ ] GDPR + Swiss LPD compliance
- [ ] Activity logging
- [ ] Data encryption at rest
- [ ] Excel/PDF export for reservations and payments

### Refactoring
- [ ] Break down large admin files (users.tsx, vehicles.tsx) into smaller components
- [ ] Extract API calls into custom hooks

## Key API Endpoints
- `/api/auth/login`, `/api/auth/register`, `/api/auth/profile`
- `/api/admin/calendar?month=&year=` — Calendar events
- `/api/admin/overdue` — Overdue reservations
- `/api/admin/reservations`, `/api/admin/vehicles`, `/api/admin/users`, `/api/admin/payments`
- `/api/admin/stats`

## Test Credentials
- Email: test@example.com
- Password: password123
- Role: admin
