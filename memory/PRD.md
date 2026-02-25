# LogiRent - PRD (Product Requirements Document)

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile App (iOS & Android) and Web App
- Admin Web Back-office
- (Optional future) Driver/Agent App

## Branding
- **Name**: LogiRent
- **Colors**: Violet, Grey, Black
- **Language**: French (primary) and English, with flag-based switcher

## Core Requirements

### Client App Features
- Email/password registration & login
- Profile with document upload (ID + license)
- Vehicle catalog with elegant/luxurious homepage, animated cards, 3 per line
- Reservation with mini-calendar popup (month/year pickers)
- Integrated Payment: Stripe (Card, Apple/Google Pay), TWINT (Swiss), Cash
- Notifications for reservation status and late returns

### Admin Back-office
- Full CRUD for Vehicles, Reservations, Users
- Reservation Calendar/Agenda view
- Statistics & Dashboards

## What's Been Implemented (Feb 2025)

### Client App
- [x] User authentication (register/login)
- [x] Profile management with document uploads
- [x] Homepage redesign: LogiRent branding, violet/grey/black theme, 3-column vehicle grid with scroll animations
- [x] Internationalization (FR/EN) with flag switcher
- [x] Vehicle catalog with category filters
- [x] Booking page with mini-calendar popup and month/year pickers
- [x] Payment: Stripe (Card), TWINT option, Cash payment
- [x] Notification system: bell icon, unread count, notification endpoints

### Admin Panel
- [x] Admin login and dashboard
- [x] Vehicle CRUD management
- [x] Reservation management with status updates
- [x] User management with ratings
- [x] Reservation Calendar/Agenda page
- [x] Overdue reservation tracking
- [x] Statistics dashboard

### Backend (FastAPI + MongoDB)
- [x] All CRUD endpoints for vehicles, reservations, users
- [x] Stripe payment integration with TWINT support
- [x] Notification system (create, read, mark as read)
- [x] Admin calendar data endpoint
- [x] Overdue reservation check endpoint
- [x] Email notifications (Resend)

## Architecture
```
/app
├── backend/
│   └── server.py          # FastAPI server
└── frontend/
    ├── app/
    │   ├── (auth)/         # Login/Register screens
    │   ├── (tabs)/         # Main app tabs (Home, Vehicles, Reservations, Profile)
    │   ├── admin/          # Admin panel (dashboard, vehicles, reservations, users, calendar)
    │   ├── booking/        # Booking flow with payment
    │   └── vehicle/        # Vehicle detail
    └── src/
        ├── store/          # Zustand stores (auth, vehicle, reservation, notification)
        ├── i18n/           # Internationalization
        └── components/     # Reusable components
```

## Tech Stack
- **Frontend**: React Native (Expo), Expo Router, Zustand, Axios, i18next
- **Backend**: FastAPI, MongoDB (Motor), JWT Auth
- **Payments**: Stripe via emergentintegrations (Card + TWINT)
- **Email**: Resend

## Prioritized Backlog

### P1 - High Priority
- Late return notification triggers (scheduled job to auto-check overdue)
- TWINT activation in Stripe dashboard (requires real Stripe key)

### P2 - Medium Priority
- Refactor booking.tsx calendar into reusable component
- Enhanced notification UI (dedicated notifications page)

### P3 - Future
- Deploy to App Stores (iOS/Android)
- Driver/Agent application
- Revenue analytics deep-dive

## Known Limitations
- TWINT requires activation in Stripe dashboard (test mode returns error)
- Notification check for overdue is manual (admin triggers), not automated cron
- Email notifications require valid Resend API key
