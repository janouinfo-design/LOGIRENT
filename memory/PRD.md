# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with multi-agency support, reservation management, vehicle tracking, and payment processing. The user deployed to their own VPS (logirent.ch, app.logirent.ch).

## Tech Stack
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Integrations**: Stripe (payments), Resend (emails), Navixy (GPS tracking), OpenAI (via emergentintegrations for doc validation)

## User Roles
- **Super Admin**: Global dashboard, manage all agencies
- **Agency Admin**: Manage own agency vehicles, reservations, clients, configure booking options
- **Client**: Browse vehicles, make reservations, manage profile, upload documents

## What's Been Implemented

### Core Features (Complete)
- Multi-agency vehicle rental platform
- Role-based access (super_admin, admin, client)
- Vehicle management with availability calendar
- Reservation system with payment (Stripe + cash + TWINT)
- GPS tracking via Navixy integration
- Contract generation & PDF preview
- Email notifications via Resend
- QR code for agency public pages

### Session March 19-20, 2026 - Bug Fixes
- **Notifications page blank**: Fixed React hooks violation in `notifications.tsx`
- **Admin Planning**: Shows ALL vehicles by default (showAllVehicles=true) + includes completed reservations
- **Vehicle detail page deleted**: Removed `/vehicle/[id]`, links redirect to `/booking/[id]`
- **Client login redirect**: Goes to `/(tabs)/reservations` instead of home
- **VPS deployment fixes**: CORS, URLs, data integrity, file uploads

### Session March 20, 2026 - New Features
- **Booking options (GPS, Siège enfant, Conducteur supplémentaire)**: Added as default options in booking flow
- **Admin-configurable booking options per agency**: 
  - Backend: `GET/PUT /api/admin/booking-options` (admin auth) + `GET /api/agencies/{id}/booking-options` (public)
  - Frontend Admin: BookingOptionsSection in Modèle page - add/edit/delete/toggle options with custom prices
  - Frontend Client: Booking page fetches options from agency API dynamically
- **Document upload in client profile**: Recto/verso for ID and license with AI validation

## Architecture
```
/app
├── backend/
│   ├── server.py
│   ├── routes/
│   │   ├── agencies.py    # + public booking-options endpoint
│   │   ├── admin.py       # + admin booking-options CRUD
│   │   ├── auth.py        # + document upload endpoints
│   │   ├── notifications.py
│   │   ├── reservations.py
│   │   └── vehicles.py
│   └── models.py
├── frontend/
│   ├── app/
│   │   ├── booking/[id].tsx         # Dynamic agency options
│   │   ├── agency-app/
│   │   │   └── contract-template.tsx # + BookingOptionsSection
│   │   └── (tabs)/
│   │       ├── notifications.tsx    # Fixed hooks ordering
│   │       ├── reservations.tsx     # Default landing page
│   │       └── profile.tsx          # Document upload UI
│   └── src/store/
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
- Resend domain verification (user action - DNS records)
- Health Dashboard: Super-admin for data inconsistency detection

### P2 - Future
- Driver/Agent mobile application
- App Store / Play Store deployment
- Advanced analytics dashboard
- Multi-language support improvements
