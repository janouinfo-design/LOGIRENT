# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with multi-agency support, reservation management, vehicle tracking, and payment processing. The user deployed to their own VPS (logirent.ch, app.logirent.ch) and the development focuses on fixing bugs and adding new features.

## Tech Stack
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Integrations**: Stripe (payments), Resend (emails), Navixy (GPS tracking), OpenAI (via emergentintegrations for doc validation)

## User Roles
- **Super Admin**: Global dashboard, manage all agencies
- **Agency Admin**: Manage own agency vehicles, reservations, clients
- **Client**: Browse vehicles, make reservations, manage profile, upload documents

## What's Been Implemented

### Core Features (Complete)
- Multi-agency vehicle rental platform
- Role-based access (super_admin, admin, client)
- Vehicle management with availability calendar
- Reservation system with payment (Stripe + cash + TWINT)
- GPS tracking via Navixy integration
- Contract generation
- Email notifications via Resend
- QR code for agency public pages

### Session March 19-20, 2026 - Bug Fixes & Features
- **Notifications page blank (FIXED)**: Fixed React hooks violation in `notifications.tsx`
- **Admin Planning shows ALL vehicles**: Changed `showAllVehicles` default to `true`, added `completed` status to backend reservation query
- **Vehicle detail page deleted**: Removed `/vehicle/[id]`, all links redirect to `/booking/[id]`
- **Client login redirect**: Now goes to `/(tabs)/reservations` instead of home
- **Booking options**: Added GPS (CHF 10/j), Siège enfant (CHF 8/j), Conducteur supplémentaire (CHF 15/j) as default options
- **Document upload in client profile**: Recto/verso for ID and license with AI validation (already implemented)
- Fixed backend CORS, URLs, data integrity issues
- Created VPS deployment scripts and guides

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI app + CORS config
│   ├── routes/
│   │   ├── agencies.py    # Agency CRUD + vehicle schedule (includes completed)
│   │   ├── admin.py       # Admin dashboard endpoints
│   │   ├── auth.py        # Auth + document upload endpoints
│   │   ├── notifications.py
│   │   ├── reservations.py
│   │   └── vehicles.py
│   └── models.py
├── frontend/
│   ├── app/
│   │   ├── booking/[id].tsx    # Booking with default options (GPS, siège enfant, conducteur supp.)
│   │   ├── agency-app/         # Admin interface (planning defaults to show all vehicles)
│   │   └── (tabs)/             # Client interface (login → reservations)
│   └── src/
│       ├── store/              # Zustand stores
│       └── components/
└── scripts/
```

## Key Credentials
- Super Admin: `superadmin@logirent.ch` / `LogiRent2024!`
- Agency Admin: `admin-geneva@logirent.ch` / `LogiRent2024!`
- Client: `jean.dupont@gmail.com` / `LogiRent2024!`

## VPS Deployment Commands
```bash
# Backend
cd /home/ubuntu/apps/LOGIRENT && git pull origin main && bash scripts/backend.sh restart
# Frontend (MUST delete old files!)
cd /home/ubuntu/apps/LOGIRENT/frontend && npx expo export --platform web && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/
```

## Backlog

### P1 - Upcoming
- Push Notifications: Re-implement native push for mobile app
- Resend domain verification (user action required - DNS records)
- Health Dashboard: Super-admin for data inconsistency detection

### P2 - Future
- Driver/Agent mobile application
- App Store / Play Store deployment

### P3 - Nice to Have
- Advanced analytics dashboard
- Multi-language support improvements
