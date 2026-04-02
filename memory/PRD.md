# LogiRent - Product Requirements Document

## Product Overview
Complete car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Deployment
- `app.logirent.ch` -> Frontend (VPS Nginx)
- `api.logirent.ch` -> Backend (VPS PM2)
- EAS Build for Android APK (`eas build --platform android --profile preview`)

## Core Features (Implemented)
- Multi-agency management with super admin RBAC
- **Agency Modules System** (super admin can enable/disable features per agency: reservations, Stripe, cash, inspections, AI damage, email, GPS, e-signature, analytics)
- Vehicle fleet management (categories, photos, documents, pricing tiers, seasonal pricing)
- **Premium Vehicle Cards UI** (Phase 1 UI overhaul: contain images, European plate badges, status badges, brand/model prominent display, smart dropdowns)
- **Auto-confirmed reservations** (no more "pending" status - all reservations are confirmed immediately)
- **Email system**: Confirmation email, Payment confirmation email, 24h reminder email (all French, with CI+permis reminder)
- **Notification system**: In-app notifications for clients and agency admins
- **24h Reminder Cron**: Automatic email + notification 24h before reservation start
- E-Signature (digital contract signing with canvas)
- PDF Contract generation with tier details
- Vehicle Inspections (checkin/checkout with AI damage detection)
- Analytics Dashboard (revenue, occupancy, trends)
- Stripe payment integration
- GPS tracking via Navixy
- Client document upload (ID + license) with AI verification

## Email Templates
1. **Confirmation de reservation** - Sent immediately when booking
2. **Confirmation de paiement** - Sent after payment (Stripe or admin manual)
3. **Rappel 24h** - Sent 24h before pickup
- Sender: `contact@logirent.ch` via Resend

## Reservation Status Flow
- `confirmed` -> Auto-set on creation
- `active` -> Vehicle picked up
- `completed` -> Vehicle returned
- `cancelled` -> Reservation cancelled

## Key Endpoints
- `POST /api/reservations` -> Auto-confirmed + email + notification
- `POST /api/payments/create-checkout` -> Stripe checkout
- `POST /api/payments/webhook` -> Stripe webhook -> payment email
- `PUT /api/admin/reservations/{id}/payment-status` -> Manual payment -> payment email
- `PUT /api/admin/agencies/{id}/modules` -> Updates agency feature toggles
- `POST /api/inspections/{id}/analyze-damage` -> AI damage detection

## Deploy Commands
Backend: `cd ~/apps/LOGIRENT/backend && git fetch origin && git reset --hard origin/main && source venv/bin/activate && pip install -r requirements.txt && pm2 restart logirent-backend`
Frontend Web: `cd ~/apps/LOGIRENT/frontend && git fetch origin && git reset --hard origin/main && rm -f package-lock.json && rm -rf .expo .metro-cache node_modules/.cache dist && npx expo export --platform web --clear && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/ && sudo systemctl reload nginx`
Mobile APK: `cd ~/apps/LOGIRENT/frontend && git fetch origin && git reset --hard origin/main && rm -f package-lock.json && eas build --platform android --profile preview`

## UI/UX Overhaul Log
- 2026-04-02: Phase 1 - Vehicle Cards & Listing Page redesign (DONE)
  - VehicleCard.tsx: contain images, European plate badges, status badge, purple brand, bold model, CHF price, feature tags, details button
  - vehicles.tsx: "Flotte de vehicules" header, "Ajouter" button, search, status filter tabs, 3-column grid
  - NewVehicleModal.tsx: 26 brands with smart model dropdowns, search, year/type dropdowns

## Bug Fixes
- 2026-03-26: Signature canvas erasing after drawing (useRef instead of useState)
- 2026-03-26: DamageAnalyzer not rendered in VehicleInspectionForm
- 2026-03-26: app.json splash-icon.png -> splash-image.png, #000 -> #000000
- 2026-03-26: Auto-confirmation system (replaced pending/pending_cash with confirmed)
- 2026-03-26: All "En attente" wording replaced by "Confirmee" across frontend

## Backlog
- P1: Pricing dynamique IA
- P1: Maintenance predictive (alertes km/date)
- P2: Multi-canal (Expedia, Kayak)
- P2: Programme fidelite
- P3: App Store / Play Store deployment
- P3: Health Dashboard super-admin
