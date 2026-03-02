# LogiRent - PRD

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with Client App, Agency Admin App, Admin Back-office, and Super Admin.

## Architecture
- **4 Interfaces**: Client App, Agency App, Admin, Super Admin
- **Backend**: FastAPI + MongoDB
- **Frontend**: React Native (Expo Router)

## What's Been Implemented

### Agenda/Calendar Booking System (Mar 2, 2026) - NEW
- New backend endpoint: GET /api/admin/vehicle-schedule returns all vehicles with their reservations for date range
- Complete visual agenda with weekly view: shows all vehicles and their booking status per day
- Color-coded slots: Green (available), Red (confirmed/active), Orange (pending)
- Hour selectors for start/end times (08:00-18:00 adjustable)
- "Occupé" badge on vehicles that conflict with selected dates
- Selection summary bar showing vehicle, dates, duration, and price
- 4-step booking flow: Client → Véhicule/Planning → Options/Paiement → Confirmer

### Contract Actions in Agency App (Mar 2, 2026)
- Added CONTRAT section to reservation modal: View/Generate, Send, Download PDF

### Filter Chips Fix + Bigger Nav Menu (Mar 2, 2026)
- Fixed filter visibility, enlarged navigation icons/text

### Edit Client Profiles (Mar 2, 2026)
- Modal to edit name, email, phone, address, rating, admin notes

### GPS Tracking Fixed Map (Mar 2, 2026)
- Map always visible at top, centers on clicked vehicle

### Previous (Feb 28, 2026)
- Contract system, Theme toggle, Email notifications, Statistics dashboards
- All core features: Auth, Vehicles, Reservations, Stripe, Navixy GPS, Client Import, etc.

## Key Files
- `/app/backend/server.py` - Backend with vehicle-schedule endpoint
- `/app/frontend/app/agency-app/book.tsx` - Booking flow with agenda
- `/app/frontend/app/agency-app/reservations.tsx` - Reservations with contract actions
- `/app/frontend/app/agency-app/clients.tsx` - Client management with edit modal
- `/app/frontend/app/agency-app/tracking.tsx` - GPS with fixed map

## Remaining Tasks
- P1: Push Notifications (Firebase)
- P2: Driver/Agent Application
- P3: Refactoring server.py into routers
- P4: App Store Deployment

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin Geneva: admin-geneva@logirent.ch / LogiRent2024
- Client: client1@test.com / test1234
