# LogiRent - Product Requirements Document

## Original Problem Statement
Complete car rental solution "LogiRent" with multi-agency support, deployed on user's VPS (logirent.ch).

## Tech Stack
- Frontend: React Native (Expo), Backend: FastAPI, Database: MongoDB
- Integrations: Stripe, Resend, Navixy, OpenAI (doc validation)

## What's Been Implemented

### Core Features
- Multi-agency platform, role-based access, vehicle management, reservation system, GPS tracking, contracts, emails

### Session March 20, 2026
1. **Admin Vehicles 3-Column Grid** (latest): Responsive layout (3 cols desktop, 2 tablet, 1 mobile), large images (220px), price header with "Détails" button, brand uppercase purple, feature badges
2. **Homepage redesign**: Compact header, 2-column layout (vehicles left, search right), vehicles immediately visible
3. **4-step Booking Wizard**: Sélection → Validation → Paiement → Confirmation + auto-contract
4. **Admin-configurable booking options per agency**: GPS, Siège enfant, Conducteur supplémentaire
5. **Planning fix**: Shows ALL vehicles + completed reservations
6. **Vehicle detail page removed**, login redirects to reservations
7. **Notifications fix**: React hooks ordering

## Key Files
- `/app/frontend/app/agency-app/vehicles.tsx` - 3-column responsive grid
- `/app/frontend/src/components/agency/VehicleCard.tsx` - Redesigned card
- `/app/frontend/app/(tabs)/index.tsx` - Redesigned homepage
- `/app/frontend/app/booking/[id].tsx` - 4-step booking wizard
- `/app/backend/routes/admin.py` - Booking options CRUD
- `/app/backend/routes/contracts.py` - Auto-generate contract

## Credentials
- Super Admin: `superadmin@logirent.ch` / `LogiRent2024!`
- Agency Admin: `admin-geneva@logirent.ch` / `LogiRent2024!`
- Client: `jean.dupont@gmail.com` / `LogiRent2024!`

## VPS Deployment
```bash
cd /home/ubuntu/apps/LOGIRENT && git pull origin main && bash scripts/backend.sh restart
cd /home/ubuntu/apps/LOGIRENT/frontend && npx expo export --platform web && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/
```

## Backlog
### P1: Push Notifications, Resend domain verification, Health Dashboard
### P2: Driver/Agent mobile app, App Store deployment, Analytics
