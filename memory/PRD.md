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
    auth.py          # User auth + impersonation endpoint
    vehicles.py      # Vehicle CRUD, availability
    reservations.py  # Reservation management
    notifications.py # Notification endpoints
    payments.py      # Stripe payment integration
    admin.py         # Admin dashboard, stats, users, calendar, overdue
    agencies.py      # Agency CRUD (now returns admin_id)
    navixy.py        # GPS tracking integration
    contracts.py     # ABICAR-style contract with editable fields, signing, PDF
  utils/
    email.py, helpers.py, notifications.py
```

### Frontend (React Native / Expo)
```
/app/frontend/app/
  agency-app/
    book.tsx                  # Booking flow -> auto-generates contract
    complete-contract.tsx     # Contract completion + client signing
  admin/
    agencies.tsx              # "Login as" impersonation button (no more passwords)
  contract/[id].tsx           # Contract view (ABICAR-style)
```

## Completed Tasks
- [2026-03-02] Backend refactoring: 3704-line server.py -> 17 modular files. 70 tests passed.
- [2026-03-02] ABICAR contract PDF with Swiss CO/LP legal text. 16 tests passed.
- [2026-03-02] Contract auto-generation after reservation + editable fields + on-screen signing. 16 tests passed.
- [2026-03-02] Super Admin impersonation: "Login as user" replaces access links/passwords in agencies page.

## 3rd Party Integrations
Stripe, Resend, Navixy, OpenAI GPT-5.2 (emergentintegrations), Expo Barcode Scanner, react-qr-code, reportlab, expo-linear-gradient

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
