# LogiRent - PRD (Product Requirements Document)

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile/Web App
- Admin Web Back-office (Super Admin & Agency Admin)
- Future Driver/Agent App

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
  server.py          # Entry point (166 lines) - app creation, CORS, routers, seed data
  database.py        # MongoDB connection and config
  models.py          # Pydantic models
  deps.py            # Dependencies, JWT auth helpers
  routes/
    auth.py          # User auth: login, register, profile, forgot-password
    vehicles.py      # Vehicle CRUD, availability
    reservations.py  # Reservation management
    notifications.py # Notification endpoints
    payments.py      # Stripe payment integration
    admin.py         # Admin dashboard, stats, users, calendar, overdue
    agencies.py      # Agency CRUD, public pages, mobile app endpoints
    navixy.py        # GPS tracking integration
    contracts.py     # ABICAR-style contract generation, field editing, signing, PDF
  utils/
    email.py         # Email templates (Resend)
    helpers.py       # Utility functions
    notifications.py # Notification creation helpers
  tests/
    test_backend_refactoring_regression.py
    test_abicar_contracts.py
    test_contract_update_fields.py
```

### Frontend (React Native / Expo)
```
/app/frontend/
  app/
    agency-app/
      book.tsx                  # Booking flow - auto-generates contract after reservation
      complete-contract.tsx     # NEW: Contract completion + client signing screen
      reservations.tsx          # Reservation list
    admin/                      # Super admin web interface
    (tabs)/                     # Client-facing app
    contract/[id].tsx           # Contract view (ABICAR-style)
```

## What's Been Implemented
- Full vehicle catalog with search/filter
- Reservation system with calendar
- Multi-role auth (client, admin, super_admin)
- Agency management (CRUD, public pages)
- **ABICAR-style contract PDF**: header, vehicle, tenant, dates/km, pricing grid, legal conditions, financial, signature, footer
- **Contract auto-generation**: after reservation creation, contract auto-generated with pre-filled data
- **Editable contract fields**: 25 editable fields (vehicle plate/color, client nationality/license, km, pricing)
- **On-screen signing**: client signs directly on computer/tablet screen
- Stripe payment integration
- GPS tracking (Navixy)
- Email notifications (Resend)
- Admin dashboard with stats
- QR code scanning
- i18n (FR/EN)

## Completed Tasks
- [2026-03-02] Backend refactoring: 3704-line server.py → 17 modular files. 70 tests passed.
- [2026-03-02] Contract PDF redesigned to ABICAR format. 16 tests passed.
- [2026-03-02] Contract legal text updated with Swiss CO/LP references.
- [2026-03-02] Contract completion flow: auto-generation after reservation, field editing, on-screen signing. 16 tests passed.
- [2026-03-02] Bug fix: PDF generation crash with string numeric values.

## 3rd Party Integrations
- Stripe (Payments)
- Resend (Email)
- Navixy (GPS Tracking)
- OpenAI GPT-5.2 (via emergentintegrations)
- Expo Barcode Scanner, react-qr-code, reportlab, expo-linear-gradient

## Prioritized Backlog

### P1 (High Priority)
- Security: Replace plain-text initial_password storage with secure password reset flow
- Push Notifications: Implement native push notifications (Firebase)

### P2 (Medium)
- Driver/Agent Application: Separate mobile app for drivers
- Refactoring of large frontend files (admin/reservations.tsx: 1211 lines)

### P3 (Low Priority)
- App Store Deployment: Prepare and submit mobile apps

## Test Credentials
- Super Admin: test@example.com / password123
- Geneva Agency Admin: admin-geneva@logirent.ch / LogiRent2024
- Lausanne Agency Admin: admin@test.com / password123
- Client: client1@test.com / test1234
