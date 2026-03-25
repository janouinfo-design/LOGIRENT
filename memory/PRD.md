# LogiRent - Product Requirements Document

## Product Overview
Complete car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Deployment Architecture
```
www.logirent.ch     -> Site vitrine marketing (Infomaniak)
app.logirent.ch     -> Application LogiRent (VPS 83.228.217.250)
api.logirent.ch     -> API backend (VPS 83.228.217.250)
```
PM2: `logirent-backend` (port 8001), `logitime-backend` (port 8002)

## Core Features (Implemented)
- Multi-agency management with super admin
- Vehicle fleet management with categories, photos, documents
- **Vehicle Pricing Tiers**: Admin configures tariff packages per vehicle
- **Seasonal/Promo Pricing**: Date-based price modifiers (% discount or fixed price/day)
- **Vehicle Inspections**: Checkout + Checkin forms with checklist, km, fuel, conditions
- **Dashboard Analytics (NEW)**: Revenue/vehicle, occupancy rates, tier analytics, payment methods, weekly trends, KPIs, cancellation rate
- **E-Signature**: Digital contract signing with canvas (SignatureCanvas component)
- **PDF Contract with Tier Details**: Contracts include selected tier info
- **Agency Ownership Security**: Admins can only modify their own agency's vehicles
- Client registration with document upload (ID + license)
- AI document verification (via OpenAI)
- Multi-step booking wizard with forfait + seasonal pricing
- Contract generation (PDF) and auto-email
- Post-signature workflow: auto status update + PDF email
- Client "Mes Reservations" dashboard
- Admin "Reservations du jour" cards
- Gantt chart planning view
- Configurable booking options (GPS, child seat, etc.)
- Stripe payment integration
- Email notifications via Resend
- GPS tracking via Navixy
- Notification system (in-app + email)

## Key Endpoints
### Analytics
- `GET /api/admin/stats/advanced` - Full analytics (revenue, occupancy, trends, payment methods)
- `GET /api/admin/stats/tier-analytics` - Tier/package popularity and revenue stats

### Pricing
- `GET/PUT /api/admin/vehicles/{id}/pricing` - Vehicle pricing tiers CRUD
- `GET/PUT /api/admin/vehicles/{id}/seasonal-pricing` - Seasonal pricing CRUD

### Inspections
- `GET /api/inspections/defaults` - Default 10-item checklist
- `POST /api/inspections` - Create checkout/checkin inspection
- `GET /api/inspections/reservation/{id}` - Inspections for a reservation

### E-Signature
- `PUT /api/contracts/{id}/sign` - Sign contract with base64 signature data

### Vehicles
- `GET /api/vehicles` - All vehicles (including maintenance) - client filters maintenance in UI

## Deploy Commands
Backend: `cd ~/apps/LOGIRENT/backend && git pull origin main && source venv/bin/activate && pip install -r requirements.txt && pm2 restart logirent-backend`
Frontend: `cd ~/apps/LOGIRENT/frontend && git pull origin main && rm -rf .expo .metro-cache node_modules/.cache dist && npx expo export --platform web --clear && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/ && sudo systemctl reload nginx`

## Backlog (P2-P3)
- Pricing dynamique IA (prix auto selon demande/saison)
- Detection dommages IA (photo -> analyse auto)
- Maintenance predictive (alertes km/date)
- Multi-canal (sync Expedia, Kayak)
- Programme fidelite (points, reductions)
- App mobile native (push notifications, offline)
- Driver/Agent mobile app
- App Store deployment

## Known Issues
- Resend domain not verified (user-side DNS action required)
- VPS: always clear cache when deploying frontend
