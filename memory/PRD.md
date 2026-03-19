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
- Reservation system with payment (Stripe + cash)
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
- **Frontend URL fix**: Added `|| ''` fallback to `EXPO_PUBLIC_BACKEND_URL` in 15 files, enabling relative URLs on VPS (no more `undefined/api/...`)
- **CORS fix**: Moved middleware before routes, added explicit origins (`logirent.ch`, `app.logirent.ch`, `*.logirent.ch` regex)
- **Agencies KeyError fix**: Changed `agency['id']` to `agency.get('id')` throughout `agencies.py`, added auto-repair for agencies missing `id` field
- **Navixy form fix**: PUT request now includes `navixy_api_url` and `navixy_hash` fields
- **VPS data cleanup**: Created `scripts/fix_vps_data.py` to clean duplicate/test agencies, re-link orphan admins
- **Admin-agency linkage**: Fixed `admin-geneva@logirent.ch` missing `agency_id`

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI app + CORS config
│   ├── routes/
│   │   ├── agencies.py    # Agency CRUD + admin login
│   │   ├── admin.py       # Admin dashboard endpoints
│   │   ├── auth.py        # Authentication
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

## Backlog

### P1 - Upcoming
- Push Notifications: Re-implement native push for mobile app
- Resend domain verification (user action required)

### P2 - Future
- Driver/Agent mobile application
- App Store / Play Store deployment

### P3 - Nice to Have
- Advanced analytics dashboard
- Multi-language support improvements
