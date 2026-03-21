# LogiRent - Product Requirements Document

## Product Overview
Car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Core Features (Implemented)
- Multi-agency management with super admin
- Vehicle fleet management with categories
- **Vehicle Pricing Tiers**: Admin configures tariff lines per vehicle. Client selects a forfait on booking page. Price auto-calculated.
- **Forfait linked to reservation**: Selected tier stored in reservation, displayed in admin details and contract
- **Agency ownership security**: Agency admins can only modify pricing tiers for their own agency's vehicles (403 for others)
- **PDF Contract with Tier Details**: Generated contracts include a highlighted "Forfait selectionne" section with tier name, km, price, period
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
- `GET/PUT /api/admin/vehicles/{id}/pricing` - Vehicle pricing tiers CRUD (agency-scoped)
- `POST /api/reservations` - Create reservation (accepts `selected_tier_id`)
- `POST /api/admin/contracts/generate` - Generate contract (includes selected tier in PDF)
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

Contract data fields for tier:
- `selected_tier_name`, `selected_tier_km`, `selected_tier_price`, `selected_tier_period`

## Upcoming Tasks (P1)
- Tarifs saisonniers/promo (extension du systeme actuel)
- Phase 3: Notifications agence, checklist vehicule, e-signature check-out/in
- Push notifications

## Backlog (P2-P3)
- Revenue statistics per option/tier
- Health dashboard (super-admin, orphan reservation cleanup)
- Driver/Agent mobile app
- E-Signature intégrée pour les contrats
- App Store deployment

## Known Issues
- Resend domain not verified (user-side DNS action required)
- VPS deployment: always use cache-clearing commands when deploying frontend
