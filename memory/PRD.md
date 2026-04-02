# LogiRent - Product Requirements Document

## Product Overview
Complete car rental management solution (React Native/Expo frontend, FastAPI backend, MongoDB).

## Deployment
- `app.logirent.ch` -> Frontend (VPS Nginx)
- `api.logirent.ch` -> Backend (VPS PM2)
- EAS Build for Android APK
- GitHub Actions auto-deploy (workflow created, SSH key pending)

## Core Features
- Multi-agency RBAC with super admin
- Agency Modules System (toggle features per agency)
- Vehicle fleet management with premium commercial cards
- **Vehicle Detail Page** (ultra-commercial, Airbnb/Sixt style)
- Photo Management (thumbnails, delete, reorder)
- Photo Gallery (fullscreen, contain, navigation, thumbnails)
- Auto-confirmed reservations
- Email system (Confirmation, Payment, 24h Reminder)
- Notification system
- E-Signature & PDF Contracts
- Vehicle Inspections + AI Damage Detection
- Analytics Dashboard
- Stripe payments
- GPS tracking (Navixy)

## Vehicle Detail Page Sections
1. Photo gallery (full-width carousel, counter, navigation arrows, thumbnails, fullscreen modal)
2. Urgency indicators ("X reservations cette semaine", "Plus que X disponibles")
3. Header (brand · year, model, badges: Disponible/Populaire/4.8-5/Location)
4. Characteristics grid (places, transmission, fuel, year, type, color)
5. Description + options chips
6. Conditions de location (age, caution, permis, assurance, km)
7. Avis clients (3 mock reviews with stars)
8. Booking card (sticky right, price, CTA primary+secondary, trust signals)

## Vehicle Card Design
- Photo zone 160px cover, clickable → gallery
- Status badge with dot
- Brand · Year, Model, Specs tags, Price
- CTA: [Details → detail page] [Réserver → detail page]

## Key Endpoints
- `GET /api/vehicles/{id}` -> Vehicle detail
- `PUT /api/admin/vehicles/{id}/photos` -> Photo management
- `POST /api/reservations` -> Auto-confirmed booking
- `POST /api/inspections/{id}/analyze-damage` -> AI damage detection

## Deploy Commands
Backend: `cd ~/apps/LOGIRENT/backend && git fetch origin && git reset --hard origin/main && source venv/bin/activate && pip install -r requirements.txt && pm2 restart logirent-backend`
Frontend: `cd ~/apps/LOGIRENT/frontend && git fetch origin && git reset --hard origin/main && rm -f package-lock.json && rm -rf .expo .metro-cache node_modules/.cache dist && npx expo export --platform web --clear && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/ && sudo systemctl reload nginx`

## Backlog
- P1: Pricing dynamique IA
- P1: Maintenance predictive
- P2: Real review system (replace mocked reviews)
- P2: Multi-canal (Expedia, Kayak)
- P2: Programme fidelite
- P3: App Store / Play Store
- P3: Health Dashboard super-admin
- Fix GitHub Actions SSH key for auto-deploy
