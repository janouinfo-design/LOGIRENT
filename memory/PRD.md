# LogiRent - Product Requirements Document

## Product Overview
Car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Core Features (Implemented)
- Multi-agency management with super admin
- Vehicle fleet management with categories
- Client registration with document upload (ID + license, recto/verso)
- AI document verification (via OpenAI)
- Multi-step booking wizard (4 steps)
- Contract generation (PDF) and e-signature
- **Post-signature workflow: auto status update + PDF email to client**
- **Client "Mes Reservations" dashboard with contract view/download**
- **Admin "Reservations du jour" cards with quick status actions**
- **Document verification check before confirming reservation**
- Admin reservation management (Planning Gantt + List view)
- Configurable booking options (GPS, child seat, etc.)
- Stripe payment integration
- Email notifications via Resend
- GPS tracking via Navixy
- Object storage for documents/photos

## Architecture
- Frontend: React Native + Expo Router + TypeScript
- Backend: FastAPI + Motor (async MongoDB)
- Database: MongoDB
- Integrations: Stripe, Resend, Navixy, OpenAI (emergentintegrations)

## Key Endpoints
- `GET /api/admin/reservations/today` - Today's reservations with enriched data
- `GET /api/client/reservations` - Client reservations with vehicle/contract info
- `GET /api/admin/reservations/{id}/check-documents` - Document verification
- `PUT /api/contracts/{id}/sign` - Sign contract + auto-confirm + email PDF
- `PUT /api/contracts/{id}/send` - Send contract with PDF attachment

## Key Files
- `/app/backend/routes/contracts.py` - Contract CRUD, signing workflow, PDF generation
- `/app/backend/routes/admin.py` - Admin endpoints, today reservations, doc check
- `/app/backend/routes/reservations.py` - Client reservations endpoint
- `/app/backend/utils/email.py` - Email with PDF attachment support
- `/app/frontend/app/agency-app/index.tsx` - Admin dashboard with today's cards
- `/app/frontend/src/components/agency/TodayReservationCard.tsx` - Today's reservation card
- `/app/frontend/src/components/agency/ReservationCard.tsx` - Reservation card with quick actions
- `/app/frontend/src/components/agency/ReservationActionModal.tsx` - Actions modal with doc check
- `/app/frontend/app/(tabs)/profile.tsx` - Client profile with "Mes Reservations"

## Upcoming Tasks (P1)
- Phase 3: Operational notifications, vehicle checklist, e-signature check-out/in
- Configurable option pricing from admin panel
- Push notifications

## Backlog (P2-P3)
- Revenue statistics per option
- Health dashboard (super-admin)
- Driver/Agent mobile app
- App Store deployment
