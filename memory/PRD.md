# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with multi-agency support, reservation management, vehicle tracking, and payment processing. Deployed on user's VPS (logirent.ch, app.logirent.ch).

## Tech Stack
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Integrations**: Stripe (payments), Resend (emails), Navixy (GPS tracking), OpenAI (doc validation)

## What's Been Implemented

### Core Features (Complete)
- Multi-agency vehicle rental platform
- Role-based access (super_admin, admin, client)
- Vehicle management with availability calendar
- Reservation system with payment (Stripe + cash + TWINT)
- GPS tracking via Navixy integration
- Contract generation & PDF
- Email notifications via Resend

### Session March 20, 2026 - All Features
- **4-step Booking Wizard**: Sélection → Validation → Paiement → Confirmation
  - Step 1: Date/time picker + options selection
  - Step 2: Full recap (vehicle, dates, options, price breakdown, conditions)
  - Step 3: Payment method (Carte, TWINT, Espèces)
  - Step 4: Confirmation + auto-generated contract download
- **Auto Contract Generation**: `POST /api/contracts/auto-generate/{reservation_id}` (client-facing, idempotent)
- **Admin-configurable booking options per agency**: GPS, Siège enfant, Conducteur supplémentaire with custom prices
- **Admin Planning**: Shows ALL vehicles + completed reservations
- **Login redirect**: Client → reservations page
- **Vehicle detail page removed**: Links go to booking directly
- **Notifications fix**: React hooks ordering bug resolved

## Architecture
```
/app
├── backend/
│   ├── routes/
│   │   ├── agencies.py    # + public booking-options endpoint
│   │   ├── admin.py       # + admin booking-options CRUD
│   │   ├── contracts.py   # + auto-generate contract for clients
│   │   ├── auth.py, notifications.py, reservations.py, vehicles.py
│   └── models.py
├── frontend/
│   ├── app/
│   │   ├── booking/[id].tsx         # 4-step wizard
│   │   ├── agency-app/
│   │   │   └── contract-template.tsx # + BookingOptionsSection
│   │   └── (tabs)/
│   │       ├── notifications.tsx    # Fixed hooks
│   │       ├── reservations.tsx     # Default landing
│   │       └── profile.tsx          # Document upload
│   └── src/store/
```

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
### P1
- Push Notifications natives
- Resend domain verification (user DNS action)
- Health Dashboard super-admin

### P2
- Driver/Agent mobile app
- App Store / Play Store deployment
- Advanced analytics
