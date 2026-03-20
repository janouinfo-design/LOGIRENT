# LogiRent - Product Requirements Document

## Original Problem Statement
Complete car rental solution "LogiRent" with multi-agency support, deployed on user's VPS (logirent.ch, app.logirent.ch).

## Tech Stack
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Integrations**: Stripe, Resend, Navixy, OpenAI (doc validation)

## What's Been Implemented

### Core Features
- Multi-agency platform, role-based access, vehicle management
- Reservation system (Stripe + cash + TWINT), GPS tracking, contract generation, email notifications

### Session March 20, 2026 - All Changes
1. **Homepage redesign**: Compact header, 2-column desktop layout (vehicles left, search sidebar right), vehicles immediately visible, category filtering
2. **4-step Booking Wizard**: Sélection → Validation → Paiement → Confirmation with auto-generated contract
3. **Admin-configurable booking options**: GPS, Siège enfant, Conducteur supplémentaire with custom prices per agency
4. **Admin Planning fix**: Shows ALL vehicles + completed reservations
5. **Vehicle detail page removed**: Links go to booking directly
6. **Login redirect**: Client → reservations page
7. **Notifications fix**: React hooks ordering

## Key Files
- `/app/frontend/app/(tabs)/index.tsx` - Redesigned homepage
- `/app/frontend/app/booking/[id].tsx` - 4-step booking wizard
- `/app/frontend/app/agency-app/contract-template.tsx` - BookingOptionsSection
- `/app/backend/routes/admin.py` - Booking options CRUD
- `/app/backend/routes/agencies.py` - Public booking options endpoint
- `/app/backend/routes/contracts.py` - Auto-generate contract endpoint

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
