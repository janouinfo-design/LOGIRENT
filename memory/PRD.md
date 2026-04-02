# LogiRent - Product Requirements Document

## Product Overview
Complete car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Deployment
- `app.logirent.ch` -> Frontend (VPS Nginx)
- `api.logirent.ch` -> Backend (VPS PM2)
- EAS Build for Android APK (`eas build --platform android --profile preview`)

## Core Features (Implemented)
- Multi-agency management with super admin RBAC
- **Agency Modules System** (super admin can enable/disable features per agency)
- Vehicle fleet management (categories, photos, documents, pricing tiers, seasonal pricing)
- **Premium Vehicle Cards UI** (Phase 1 UI overhaul: contain images, European plate badges, status badges, brand/model display, smart dropdowns)
- **Photo Management** (thumbnails, delete, reorder with dedicated API endpoint)
- **Auto-confirmed reservations** (no more "pending" status)
- **Email system**: Confirmation, Payment confirmation, 24h Reminder (all French)
- **Notification system**: In-app notifications
- E-Signature (digital contract signing with canvas)
- PDF Contract generation with tier details
- Vehicle Inspections (checkin/checkout with AI damage detection)
- Analytics Dashboard (revenue, occupancy, trends)
- Stripe payment integration
- GPS tracking via Navixy
- Client document upload (ID + license) with AI verification

## Key Endpoints
- `POST /api/reservations` -> Auto-confirmed + email + notification
- `PUT /api/admin/vehicles/{id}/photos` -> Dedicated photo management (add/delete/reorder)
- `POST /api/inspections/{id}/analyze-damage` -> AI damage detection
- `PUT /api/admin/agencies/{id}/modules` -> Agency feature toggles

## Deploy Commands
Backend: `cd ~/apps/LOGIRENT/backend && git fetch origin && git reset --hard origin/main && source venv/bin/activate && pip install -r requirements.txt && pm2 restart logirent-backend`
Frontend Web: `cd ~/apps/LOGIRENT/frontend && git fetch origin && git reset --hard origin/main && rm -f package-lock.json && rm -rf .expo .metro-cache node_modules/.cache dist && npx expo export --platform web --clear && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/ && sudo systemctl reload nginx`

## Changelog
- 2026-04-02: Phase 1 UI/UX - Vehicle Cards & Listing redesign (DONE)
- 2026-04-02: Photo Management - thumbnails, delete, reorder with PUT /api/admin/vehicles/{id}/photos (DONE)
- 2026-03-26: Signature canvas fix, AI Damage detection, Auto-confirmation, Email templates, Module toggles

## Backlog
- P1: Pricing dynamique IA
- P1: Maintenance predictive (alertes km/date)
- P2: Multi-canal (Expedia, Kayak)
- P2: Programme fidelite
- P3: App Store / Play Store deployment
- P3: Health Dashboard super-admin
