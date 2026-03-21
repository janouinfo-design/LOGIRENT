# LogiRent - Product Requirements Document

## Product Overview
Car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Core Features (Implemented)
- Multi-agency management with super admin
- Vehicle fleet management with categories
- **Vehicle Pricing Tiers**: Admin configures tariff lines per vehicle. Client selects a forfait on booking page. Price auto-calculated.
- **Forfait linked to reservation**: Selected tier stored in reservation, displayed in admin details and contract
- Client registration with document upload (ID + license, recto/verso)
- AI document verification (via OpenAI)
- Multi-step booking wizard (4 steps) with forfait selection
- Contract generation (PDF) and e-signature
- Post-signature workflow: auto status update + PDF email to client
- Client "Mes Reservations" dashboard with contract view/download
- Admin "Reservations du jour" cards with quick status actions
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
- `POST /api/reservations` - Create reservation (now accepts `selected_tier_id`)
- `GET /api/admin/reservations/today` - Today's reservations
- `GET /api/client/reservations` - Client reservations with contract info
- `PUT /api/contracts/{id}/sign` - Sign contract + auto-confirm + email PDF

## DB Schema - Pricing Tiers
Stored in `vehicles.pricing_tiers[]`:
```json
{"id": "uuid", "name": "100 km / jour", "kilometers": 100, "price": 90.0, "period": "jour|weekend|semaine|mois|custom", "order": 0, "active": true}
```

Stored in `reservations.selected_tier`:
```json
{"id": "uuid", "name": "Forfait weekend 500km", "kilometers": 500, "price": 200.0, "period": "weekend"}
```

## Upcoming Tasks (P1)
- Tarifs saisonniers/promo (extension du systeme actuel)
- Phase 3: Notifications agence, checklist vehicule, e-signature check-out/in
- Configurable option pricing from admin panel
- Push notifications

## Backlog (P2-P3)
- Revenue statistics per option
- Health dashboard (super-admin)
- Driver/Agent mobile app
- App Store deployment
