# LogiRent - PRD

## Original Problem Statement
Complete car rental solution "LogiRent": Client App, Admin Back-office (Super Admin + Agency Admin), Driver App.

## Architecture
### Backend: `/app/backend/` (FastAPI + MongoDB)
- `server.py` (166 lines) → routes/auth.py, vehicles.py, reservations.py, notifications.py, payments.py, admin.py, agencies.py, navixy.py, contracts.py

### Frontend: `/app/frontend/` (React Native / Expo)
- `app/admin/` - reservations.tsx (191), vehicles.tsx (238), users.tsx (291)
- `src/components/admin/` - ReservationComponents.tsx, VehicleComponents.tsx
- `src/utils/admin-helpers.ts` - Shared helpers

## Completed Tasks
- [2026-03-02] Backend refactoring: 3704→166 lines entry point. 70 tests.
- [2026-03-02] ABICAR contract PDF + Swiss CO/LP legal text. 16 tests.
- [2026-03-02] Contract auto-generation + editable fields + on-screen signing. 16 tests.
- [2026-03-02] Super Admin impersonation: "Login as" button, no more passwords.
- [2026-03-02] P1 Security: Removed plain-text admin_password_plain storage.
- [2026-03-02] P2 Frontend refactoring: 3424→1237 lines (-64%). reservations 1212→191, vehicles 1155→238, users 1055→291.

## Prioritized Backlog
### P1: Push Notifications (Firebase)
### P2: Driver/Agent Application
### P3: App Store Deployment

## Test Credentials
- Super Admin: test@example.com / password123
- Geneva Admin: admin-geneva@logirent.ch / LogiRent2024
- Client: client1@test.com / test1234
