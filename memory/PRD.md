# LogiRent - Product Requirements Document

## Product Overview
Complete car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Deployment
- `app.logirent.ch` -> Frontend (VPS Nginx)
- `api.logirent.ch` -> Backend (VPS PM2)
- EAS Build for Android APK
- GitHub Actions auto-deploy (workflow added, SSH key config pending)

## Core Features (Implemented)
- Multi-agency management with super admin RBAC
- Agency Modules System (super admin toggles features per agency)
- Vehicle fleet management with premium commercial card UI
- Photo Management (thumbnails, delete, reorder via dedicated API)
- Auto-confirmed reservations
- Email system: Confirmation, Payment, 24h Reminder
- Notification system: In-app
- E-Signature (digital contract signing)
- PDF Contract generation
- Vehicle Inspections (checkin/checkout + AI damage detection)
- Analytics Dashboard
- Stripe payment integration
- GPS tracking via Navixy
- Client document upload with AI verification

## Vehicle Card Design (Commercial)
- Photo zone: 160px height, cover mode, clickable → gallery
- Status badge: pill with colored dot
- Brand · Year on one line
- Model name: large bold
- Specs row: seats, transmission, fuel with icons
- "A partir de CHF X /jour"
- CTA: [Details (outline)] [Réserver (purple filled)]

## Photo Gallery
- Full-screen dark overlay
- Image: flex container with contain mode (no crop)
- Navigation arrows + swipe
- Counter "1 / 8"
- Thumbnail strip at bottom
- Close button

## Key Endpoints
- `PUT /api/admin/vehicles/{id}/photos` -> Photo management (add/delete/reorder)
- `POST /api/reservations` -> Auto-confirmed + email + notification
- `POST /api/inspections/{id}/analyze-damage` -> AI damage detection
- `PUT /api/admin/agencies/{id}/modules` -> Agency feature toggles

## Deploy Commands
Backend: `cd ~/apps/LOGIRENT/backend && git fetch origin && git reset --hard origin/main && source venv/bin/activate && pip install -r requirements.txt && pm2 restart logirent-backend`
Frontend: `cd ~/apps/LOGIRENT/frontend && git fetch origin && git reset --hard origin/main && rm -f package-lock.json && rm -rf .expo .metro-cache node_modules/.cache dist && npx expo export --platform web --clear && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/ && sudo systemctl reload nginx`

## Backlog
- P1: Pricing dynamique IA
- P1: Maintenance predictive
- P2: Multi-canal (Expedia, Kayak)
- P2: Programme fidelite
- P3: App Store / Play Store
- P3: Health Dashboard super-admin
- GitHub Actions SSH key fix (workflow created, needs valid SSH key in secrets)
