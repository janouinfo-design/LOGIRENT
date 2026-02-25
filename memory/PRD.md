# LogiRent - PRD

## Branding
- **Name**: LogiRent | **Colors**: Violet, Grey, Black | **Language**: FR/EN

## Implemented Features

### Client App
- [x] Auth (register/login), Profile with document uploads
- [x] Top Navigation Facebook-style (logo, nav icons, notifications, language switcher)
- [x] Homepage: Hero (image + search bar + stats), category filters, 3-column vehicle grid
- [x] Vehicles page: "Notre Flotte" 3-column grid + quick filters
- [x] Reservations page: "Mes Locations" with status filters, French labels, vehicle thumbnails
- [x] Internationalization FR/EN with flag switcher
- [x] Booking with **MiniCalendar** reusable component (month/year pickers)
- [x] Payment: Stripe Card + TWINT + Cash
- [x] Notification system: bell icon, badge, backend CRUD

### Admin Panel
- [x] Dashboard, Vehicle/Reservation/User CRUD, Calendar/Agenda

### Backend
- [x] FastAPI + MongoDB, all CRUD endpoints
- [x] Stripe payments (Card + TWINT) with user's own key
- [x] **Overdue cron job**: Background task checks every hour for late returns, auto-creates notifications + sends emails
- [x] Notification endpoints (get, mark read, unread count)

## Architecture
```
frontend/src/components/MiniCalendar.tsx  - NEW reusable calendar component
frontend/app/(tabs)/_layout.tsx           - Facebook-style top nav
frontend/app/(tabs)/index.tsx             - Homepage with hero
frontend/app/(tabs)/vehicles.tsx          - Vehicles grid
frontend/app/(tabs)/reservations.tsx      - Redesigned reservations
frontend/app/(tabs)/profile.tsx           - Redesigned profile
frontend/app/booking/[id].tsx             - Booking (uses MiniCalendar)
frontend/src/store/notificationStore.ts   - Notification store
backend/server.py                         - FastAPI with cron + Stripe
```

## Backlog
- P2: Verify email domain for Resend (logitrak.ch not verified)
- P3: App Store deployment (iOS/Android)
- P3: Driver/Agent application
