# LogiRent - Product Requirements Document

## Product Overview
Complete car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Core Features (Implemented)
- Multi-agency management with super admin
- Vehicle fleet management with categories, photos, documents
- **Vehicle Pricing Tiers**: Admin configures tariff packages per vehicle. Client selects during booking.
- **Seasonal/Promo Pricing (NEW)**: Admins define date-based price modifiers (% discount or fixed price/day) per vehicle. Auto-applied in booking wizard when reservation dates match.
- **Vehicle Inspections / Etat des lieux (NEW)**: Checkout + Checkin inspection forms with 10-item default checklist, km reading, fuel level, condition tracking (OK/Endommage/Manquant), notes. Accessible from admin reservation modal. Auto-sets reservation status to "active" on checkout.
- **PDF Contract with Tier Details**: Generated contracts include selected tier info in highlighted blue section.
- **Agency Ownership Security**: Admins can only modify vehicles/pricing of their own agency (403 for others).
- Client registration with document upload (ID + license, recto/verso)
- AI document verification (via OpenAI)
- Multi-step booking wizard (4 steps) with forfait + seasonal pricing selection
- Contract generation (PDF) and e-signature
- Post-signature workflow: auto status update + PDF email to client
- Client "Mes Reservations" dashboard with contract view/download
- Admin "Reservations du jour" cards with quick status actions
- Document verification check before confirming reservation
- Admin reservations list with sort toggle
- Gantt chart planning view (includes orphan reservations)
- Configurable booking options (GPS, child seat, etc.)
- Stripe payment integration
- Email notifications via Resend (with PDF attachments)
- GPS tracking via Navixy
- Object storage for documents/photos
- Notification system (in-app + email)

## Architecture
- Frontend: React Native + Expo Router + TypeScript
- Backend: FastAPI + Motor (async MongoDB)
- Database: MongoDB (logirent)
- Integrations: Stripe, Resend, Navixy, OpenAI (emergentintegrations)

## Key Endpoints
### Pricing
- `GET/PUT /api/admin/vehicles/{id}/pricing` - Vehicle pricing tiers CRUD (agency-scoped)
- `GET/PUT /api/admin/vehicles/{id}/seasonal-pricing` - Seasonal pricing CRUD (agency-scoped)
- `GET /api/vehicles/{id}/seasonal-pricing` - Public seasonal pricing (active only)

### Inspections
- `GET /api/inspections/defaults` - Default 10-item checklist
- `POST /api/inspections` - Create checkout/checkin inspection
- `GET /api/inspections/reservation/{id}` - All inspections for a reservation
- `PUT /api/inspections/{id}` - Update inspection
- `GET /api/inspections/{id}` - Single inspection

### Reservations & Contracts
- `POST /api/reservations` - Create reservation (accepts selected_tier_id)
- `POST /api/admin/contracts/generate` - Generate contract (includes selected tier in PDF)
- `GET /api/contracts/{id}/pdf` - Download contract PDF

## DB Schema Additions
### Seasonal Pricing (embedded in vehicles)
```json
vehicles.seasonal_pricing: [{
  "id": "uuid", "name": "Ete 2026", "start_date": "2026-06-01", "end_date": "2026-08-31",
  "modifier_type": "percentage|fixed_price", "modifier_value": -15.0, "active": true
}]
```

### Inspections (separate collection)
```json
inspections: {
  "id": "uuid", "reservation_id": "uuid", "vehicle_id": "uuid", "agency_id": "uuid",
  "type": "checkout|checkin", "items": [{name, checked, condition, notes}],
  "photos": [], "km_reading": 45200, "fuel_level": "full|3/4|1/2|1/4|empty",
  "notes": "", "signature_data": "", "completed_by": "uuid", "completed_at": "iso"
}
```

## Deployment (User VPS)
### Single domain architecture (recommended):
```
www.logirent.ch     -> Expo Web app (all roles via single login)
www.logirent.ch/api -> FastAPI backend (proxied to port 8001)
```
Nginx config: `/app/nginx/logirent.conf`

### Deploy commands:
Backend: `cd ~/apps/LOGIRENT/backend && git pull origin main && source venv/bin/activate && pip install -r requirements.txt && pm2 restart logirent-backend`
Frontend: `cd ~/apps/LOGIRENT/frontend && git pull origin main && rm -rf .expo .metro-cache node_modules/.cache dist && npx expo export --platform web --clear && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/ && sudo systemctl reload nginx`

## Upcoming Tasks (P1)
- Push notifications for mobile
- Admin dashboard: revenue analytics per tier/option

## Backlog (P2-P3)
- Revenue statistics per option/tier
- Health dashboard (super-admin, orphan reservation cleanup)
- Driver/Agent mobile app
- E-Signature integree pour les contrats
- App Store deployment
- Photo upload within inspection forms (integration with object storage)

## Known Issues
- Resend domain not verified (user-side DNS action required)
- VPS deployment: always use cache-clearing commands when deploying frontend
