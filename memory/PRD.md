# LogiRent - Product Requirements Document

## Product Overview
Complete car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Deployment
- `app.logirent.ch` → Frontend (VPS Nginx)
- `api.logirent.ch` → Backend (VPS PM2)
- EAS Build for Android APK (`eas build --platform android --profile preview`)

## Core Features (Implemented)
- Multi-agency management with super admin RBAC
- Vehicle fleet management (categories, photos, documents, pricing tiers, seasonal pricing)
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
1. **Confirmation de reservation** - Sent immediately when booking, includes vehicle details, dates, price, CI/permis reminder, cash note if applicable
2. **Confirmation de paiement** - Sent after payment (Stripe or admin manual), confirms payment received
3. **Rappel 24h** - Sent 24h before pickup, includes full details, location, CI/permis reminder
- Sender: `contact@logirent.ch` via Resend

## Reservation Status Flow
- `confirmed` → Auto-set on creation (replaces old pending/pending_cash)
- `active` → Vehicle picked up
- `completed` → Vehicle returned
- `cancelled` → Reservation cancelled

## Key Endpoints
- `POST /api/reservations` → Auto-confirmed + email + notification
- `POST /api/payments/create-checkout` → Stripe checkout
- `POST /api/payments/webhook` → Stripe webhook → payment email
- `PUT /api/admin/reservations/{id}/payment-status` → Manual payment → payment email

## Deploy Commands
Backend: `cd ~/apps/LOGIRENT/backend && git fetch origin && git reset --hard origin/main && source venv/bin/activate && pip install -r requirements.txt && pm2 restart logirent-backend`
Frontend Web: `cd ~/apps/LOGIRENT/frontend && git fetch origin && git reset --hard origin/main && rm -f package-lock.json && rm -rf .expo .metro-cache node_modules/.cache dist && npx expo export --platform web --clear && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/ && sudo systemctl reload nginx`
Mobile APK: `cd ~/apps/LOGIRENT/frontend && git fetch origin && git reset --hard origin/main && rm -f package-lock.json && eas build --platform android --profile preview`

## Bug Fixes
- 2026-03-26: Signature canvas erasing after drawing (useRef instead of useState)
- 2026-03-26: DamageAnalyzer not rendered in VehicleInspectionForm
- 2026-03-26: app.json splash-icon.png → splash-image.png, #000 → #000000
- 2026-03-26: Auto-confirmation system (replaced pending/pending_cash with confirmed)
- 2026-03-26: All "En attente" wording replaced by "Confirmee" across frontend

## Backlog
- P2: Pricing dynamique IA
- P2: Maintenance predictive (alertes km/date)
- P3: Multi-canal (Expedia, Kayak)
- P3: Programme fidelite
- P3: App Store / Play Store deployment
- P3: Health Dashboard super-admin
