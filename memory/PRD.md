# LogiRent - PRD (Product Requirements Document)

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile App (iOS & Android) and Web App
- Admin Web Back-office
- (Optional future) Driver/Agent App

## User Personas
- **Client**: End-user who browses vehicles, makes reservations, pays
- **Admin**: Agency manager who manages vehicles, reservations, users
- **Super Admin**: Global admin who manages all agencies

## Core Requirements
- **Branding**: "LogiRent", colors violet/grey/black
- **i18n**: French and English
- **Account Management**: Email/password auth, profile with document upload
- **Vehicle Catalog**: Elegant homepage with animated cards
- **Reservation**: Calendar date selection, same-day booking, Airbnb-style availability
- **Payment**: Stripe (Credit Card, Apple/Google Pay) and TWINT
- **Notifications**: Reservation status and late returns
- **Admin**: Full CRUD, visual calendar, stats, multi-agency support

## Architecture
```
/app
├── backend/
│   ├── server.py             # FastAPI with multi-agency logic, RBAC, all endpoints
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── (tabs)/
    │   │   ├── index.tsx         # Homepage with hero, categories, vehicle grid
    │   │   ├── vehicles.tsx      # Vehicle catalog
    │   │   ├── reservations.tsx  # Client reservations with LIST + CALENDAR views
    │   │   ├── profile.tsx       # User profile
    │   │   └── _layout.tsx       # Tab layout
    │   ├── admin/
    │   │   ├── agencies.tsx      # Super-admin agency management
    │   │   ├── calendar.tsx      # Admin reservation calendar
    │   │   ├── vehicles.tsx      # Admin vehicle CRUD
    │   │   ├── reservations.tsx  # Admin reservation management
    │   │   ├── users.tsx         # Admin user management
    │   │   └── payments.tsx      # Admin payments
    │   ├── vehicle/[id].tsx      # Vehicle detail with availability calendar
    │   ├── booking/[id].tsx      # Booking flow with payment
    │   ├── admin-login.tsx       # Admin login
    │   └── _layout.tsx           # Root layout with SafeAreaView, TopNavBar
    ├── src/
    │   ├── store/                # Zustand stores (auth, vehicle, reservation, notification)
    │   ├── api/axios.ts          # API client
    │   ├── components/           # Shared components
    │   └── i18n/                 # Internationalization
```

## Tech Stack
- **Frontend**: React Native (Expo) for Web, Expo Router, Zustand
- **Backend**: FastAPI, MongoDB (Motor), JWT auth
- **Payments**: Stripe (via emergentintegrations)
- **Email**: Resend (configured but needs user API key)

## DB Schema
- **agencies**: `{_id, name, created_at}`
- **users**: `{id, name, email, password_hash, role, agency_id, phone, documents, ...}`
- **vehicles**: `{id, brand, model, year, type, price_per_day, agency_id, status, photos, ...}`
- **reservations**: `{id, user_id, vehicle_id, agency_id, start_date, end_date, total_days, total_price, status, payment_status, ...}`
- **notifications**: `{user_id, type, message, read, created_at}`

## What's Been Implemented (as of Feb 26, 2026)

### Document Upload Fix (Feb 26, 2026)
- **FIXED**: Critical document upload bug on web/mobile-web platforms
  - Root cause: Blob URL roundtrip + manual Content-Type header breaking FormData boundary
  - Solution: Pass File object directly, let browser auto-set Content-Type
  - Both ID card and license uploads working on web
- **FIXED**: Agency admin count now includes super_admin in stats

### Multi-Agency Architecture (Complete)
- Full multi-tenancy with super_admin, admin, client roles
- Data scoping by agency_id
- Super-admin dashboard at /admin/agencies
- **Agency slug URLs**: Each agency has a unique URL like `/a/logirent-geneva`
  - Public landing page showing agency name, location, vehicle count, contact
  - "Créer un compte" / "Se connecter" buttons that bind clients to the agency
  - Vehicle grid filtered to agency-only vehicles
  - **QR Code System**: 
    - Admin can generate/print QR codes for each agency from the super-admin panel
    - Landing page has "Scanner le QR de votre agence" button
    - `/scan-qr` page uses device camera (html5-qrcode) to scan agency QR codes
    - Scanned QR redirects to the agency page for registration
  - Client registered via agency URL is permanently bound to that agency
  - Bound clients only see their agency's vehicles in the app

### Client Features (Complete)
- Homepage with hero, search, categories, vehicle cards
- **Responsive vehicle grid**: 1 full-width card per row on mobile, 3 cards per row on desktop with larger images
- Vehicle catalog with filtering (same responsive grid)
- Vehicle detail with availability calendar
- Booking flow with Stripe payment + cash option
- **MiniCalendar with availability indicators**: 
  - Red/pink = booked dates (cannot be selected)
  - Green = free dates (available for booking)
  - Grey = past dates (disabled)
  - Legend displayed at top
  - Fetches vehicle availability per month
- **Reservations page with LIST + CALENDAR views**
  - Toggle between list and calendar modes
  - Calendar shows monthly grid with reservation dots
  - Date selection shows reservation details
  - Month navigation (forward/backward)
  - **"Aujourd'hui" button** - returns to current month (hidden when already on current month)
  - **"Réserver un véhicule" button** - appears on free future dates, redirects to vehicles page
  - **Heures affichées** - chaque événement montre l'heure de début/fin (HH:MM - HH:MM) avec icône horloge
  - French localization with proper accents
- Profile management
- Notifications (bell icon)
- FR/EN language switching

### Admin Features (Complete)
- Admin login and scoped dashboard
- Vehicle CRUD management
- Reservation management
- User management
- **Calendar/agenda view for reservations with hours (HH:MM)** on event cards
  - Departure time shown in blue
  - Return time shown in purple
  - Ongoing reservation time range shown in green
  - Detail modal shows departure + return times
  - CSS grid responsive for mobile (46px cells on mobile, 56px on desktop)
- Overdue rental alerts
- Agency management (super-admin)

### Bug Fixes (Complete)
- Silent booking failure → clear error messages
- Incorrect availability calendar → includes pending reservations
- Mobile responsive fixes (hero section, nav overlap, compact cards)
- Filter tabs layout on mobile → horizontal row with flexWrap

## Credentials
- **Super Admin**: test@example.com / password123
- **Client**: client1@test.com / test1234

## Prioritized Backlog

### P1 - Navixy API Integration
- Synchronize vehicle list from Navixy GPS tracking platform
- Fetch last known GPS position of vehicles
- Requires Navixy API key from user

### P2 - Push Notifications
- Enhance notification system with real push notifications

### P3 - Deploy to App Stores
- Generate builds for Google Play and Apple App Store

### P4 - Driver/Agent Application
- Optional future component

### P5 - Admin Statistics & Dashboards
- Advanced dashboards for revenue and fleet utilization

### Minor
- Availability calendar component could be extracted as reusable
