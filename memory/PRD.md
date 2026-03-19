# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with multi-agency support, reservation management, vehicle tracking, and payment processing. The user's primary goal was to migrate the application to their own VPS while fixing critical issues.

## Tech Stack
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (migrating from Atlas to self-hosted)
- **Integrations**: Stripe (payments), Resend (emails), Navixy (GPS tracking), OpenAI (via emergentintegrations)

## User Roles
- **Super Admin**: Global dashboard, manage all agencies
- **Agency Admin**: Manage own agency vehicles, reservations, clients
- **Client**: Browse vehicles, make reservations, manage profile

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

### VPS Migration & Stability Fixes (March 2026)
- Migration scripts refactored (secure, modular: 01-04 steps)
- LogiRent/LogiTime project isolation
- Backend port conflict resolution (pm2 management)
- Environment consistency (standardized env vars)
- Frontend routing protection (withAuth HOC)
- JWT secret security fix
- Version tracking endpoint (`/api/version`)

### Bug Fixes - Session March 19, 2026
- **Frontend URL fix**: Added `|| ''` fallback to `EXPO_PUBLIC_BACKEND_URL`
- **CORS fix**: Moved middleware before routes, added explicit origins
- **Agencies KeyError fix**: Changed `agency['id']` to `agency.get('id')` throughout
- **VPS data cleanup**: Created `scripts/fix_vps_data.py`
- **Admin-agency linkage**: Fixed missing `agency_id`

### Bug Fixes - Session March 19, 2026 (Fork)
- **Notifications page blank (FIXED)**: Fixed React hooks violation in `notifications.tsx` - hooks (useRouter, useNotificationStore, useState) were called AFTER a conditional return, violating React's Rules of Hooks. Moved all hooks before conditional returns.
- **Admin Planning View**: Backend code already robust with `vehicle.get('id')` and auto-repair logic. Verified endpoint returns all vehicles with their reservations correctly.
- **Document Upload in Client Profile**: Already implemented with recto/verso for both ID and license. Backend endpoints for AI-verified upload are in place.
- **Calendar Booking**: Already implemented - selecting a date with no reservations shows "Réserver un véhicule" button navigating to vehicles list.

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI app + CORS config
│   ├── routes/
│   │   ├── agencies.py    # Agency CRUD + vehicle schedule
│   │   ├── admin.py       # Admin dashboard endpoints
│   │   ├── auth.py        # Authentication + doc upload
│   │   ├── notifications.py # Notification CRUD
│   │   ├── reservations.py # Client reservations
│   │   └── vehicles.py    # Vehicle management
│   └── models.py          # Pydantic models
├── frontend/
│   ├── src/
│   │   ├── api/axios.ts   # Configured axios instance
│   │   ├── store/         # Zustand stores
│   │   └── components/    # Shared components
│   └── app/               # Expo Router pages
│       ├── agency-app/    # Agency admin interface
│       ├── admin/         # Super admin interface
│       └── (tabs)/        # Client interface
└── scripts/
    ├── fix_vps_data.py    # VPS database cleanup
    ├── backend.sh         # PM2 process management
    └── WORKFLOW_DEPLOIEMENT.md
```

## Key Credentials
- Super Admin: `superadmin@logirent.ch` / `LogiRent2024!`
- Agency Admin: `admin-geneva@logirent.ch` / `LogiRent2024!`
- Client: `jean.dupont@gmail.com` / `LogiRent2024!`

## VPS Deployment
- Domain: `logirent.ch` / `www.logirent.ch` / `app.logirent.ch`
- Server: Ubuntu VPS at `ov-4ae980`
- Project path: `/home/ubuntu/apps/LOGIRENT`
- Frontend served by Nginx from `/var/www/logirent/`
- Backend managed by PM2 on port 8001

### Deployment Commands (for user)
**Backend:** `cd /home/ubuntu/apps/LOGIRENT && git pull origin main && bash scripts/backend.sh restart`
**Frontend:** `cd /home/ubuntu/apps/LOGIRENT/frontend && npx expo export --platform web && sudo rm -rf /var/www/logirent/* && sudo cp -r dist/* /var/www/logirent/`

## Backlog

### P1 - Upcoming
- Push Notifications: Re-implement native push for mobile app
- Resend domain verification (user action required - DNS records)
- Health Dashboard: Super-admin panel for data inconsistency detection

### P2 - Future
- Driver/Agent mobile application
- App Store / Play Store deployment

### P3 - Nice to Have
- Advanced analytics dashboard
- Multi-language support improvements
