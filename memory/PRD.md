# LogiRent - Product Requirements Document

## Product Overview
Car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Core Features (Implemented)
- Multi-agency management with super admin
- Vehicle fleet management with categories
- **Vehicle Pricing Tiers (NEW)**: Admin configures tariff lines per vehicle (name, km, price, period, order, active). Client sees active tiers on booking page.
- Client registration with document upload (ID + license, recto/verso)
- AI document verification (via OpenAI)
- Multi-step booking wizard (4 steps)
- Contract generation (PDF) and e-signature
- Post-signature workflow: auto status update + PDF email to client
- Client "Mes Reservations" dashboard with contract view/download
- Admin "Reservations du jour" cards with quick status actions
- Admin "Dernieres reservations" in card format (3 columns)
- Document verification check before confirming reservation
- Sort toggle on reservations list page
- Orphan reservations included in planning view
- Admin reservation management (Planning Gantt + List view)
- Configurable booking options (GPS, child seat, etc.)
- Stripe payment integration
- Email notifications via Resend (with PDF attachments)
- GPS tracking via Navixy
- Object storage for documents/photos

## Architecture
- Frontend: React Native + Expo Router + TypeScript
- Backend: FastAPI + Motor (async MongoDB)
- Database: MongoDB
- Integrations: Stripe, Resend, Navixy, OpenAI (emergentintegrations)

## Key Endpoints
- `GET/PUT /api/admin/vehicles/{id}/pricing` - Vehicle pricing tiers CRUD
- `GET /api/admin/reservations/today` - Today's reservations
- `GET /api/client/reservations` - Client reservations with contract info
- `GET /api/admin/reservations/{id}/check-documents` - Document verification
- `PUT /api/contracts/{id}/sign` - Sign contract + auto-confirm + email PDF
- `PUT /api/contracts/{id}/send` - Send contract with PDF attachment
- `GET /api/admin/vehicle-schedule` - Vehicle schedule with orphan reservations

## Key Files
- `/app/backend/routes/admin.py` - Admin endpoints, pricing tiers, today reservations, doc check
- `/app/backend/routes/contracts.py` - Contract CRUD, signing workflow, PDF generation
- `/app/backend/routes/agencies.py` - Vehicle schedule with orphan reservations
- `/app/backend/routes/reservations.py` - Client reservations endpoint
- `/app/backend/utils/email.py` - Email with PDF attachment support
- `/app/frontend/src/components/agency/VehiclePricingManager.tsx` - Admin pricing CRUD
- `/app/frontend/src/components/VehiclePricingDisplay.tsx` - Client pricing display
- `/app/frontend/app/agency-app/index.tsx` - Admin dashboard with today's cards
- `/app/frontend/app/agency-app/reservations.tsx` - Reservations with sort toggle
- `/app/frontend/src/components/agency/GanttChart.tsx` - Planning with orphan reservations
- `/app/frontend/app/(tabs)/profile.tsx` - Client profile with "Mes Reservations"
- `/app/frontend/app/booking/[id].tsx` - Booking wizard with pricing display

## DB Schema - Pricing Tiers
Stored in `vehicles.pricing_tiers[]`:
```json
{
  "id": "uuid",
  "name": "100 km / jour",
  "kilometers": 100,
  "price": 90.0,
  "period": "jour|weekend|semaine|mois|custom",
  "order": 0,
  "active": true
}
```

## Upcoming Tasks (P1)
- Phase 3: Operational notifications, vehicle checklist, e-signature check-out/in
- Seasonal/promo pricing tiers
- Configurable option pricing from admin panel
- Push notifications

## Backlog (P2-P3)
- Revenue statistics per option
- Health dashboard (super-admin)
- Driver/Agent mobile app
- App Store deployment
