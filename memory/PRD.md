# LogiRent - PRD

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with Client App, Agency Admin App, Admin Back-office, Super Admin.

## Architecture
- **4 Interfaces**: Client App, Agency App, Admin, Super Admin
- **Backend**: FastAPI + MongoDB | **Frontend**: React Native (Expo Router)

## What's Been Implemented

### Airbnb-Style Calendar for Booking (Mar 2, 2026) - NEW
- Two-month visual calendar with range selection (click start + click end)
- Purple-highlighted date range between start/end dates
- DÉBUT → FIN summary bar showing formatted dates
- Hour selectors (08:00/18:00) with +/- controls
- Duration badge showing total days
- Vehicle list with availability check (OCCUPÉ badge for busy vehicles)
- ✓ checkmark on selected vehicle with price summary

### Previous (Mar 2, 2026)
- Contract actions in Agency App modal (View/Generate, Send, Download PDF)
- Filter chips fix + bigger navigation menu
- Edit client profiles modal
- GPS tracking fixed map layout

### Previous (Feb 28, 2026)
- Contract system with digital signature and PDF
- Dark/light mode toggle
- Email notifications (Resend)
- Statistics dashboards

### Core Features
- Auth, Vehicles CRUD, Reservations, Stripe Payments, Navixy GPS, Client Import, QR Codes, Calendar, AI Document Verification, Multi-Agency Architecture

## Key Files
- `/app/backend/server.py` - Backend with vehicle-schedule endpoint
- `/app/frontend/app/agency-app/book.tsx` - Airbnb calendar booking
- `/app/frontend/app/agency-app/reservations.tsx` - Reservations with contracts
- `/app/frontend/app/agency-app/clients.tsx` - Client edit
- `/app/frontend/app/agency-app/tracking.tsx` - GPS fixed map

## Remaining Tasks
- P1: Push Notifications (Firebase)
- P2: Driver/Agent Application
- P3: Refactoring server.py
- P4: App Store Deployment

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin Geneva: admin-geneva@logirent.ch / LogiRent2024
- Client: client1@test.com / test1234
