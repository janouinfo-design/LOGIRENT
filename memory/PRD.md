# LogiRent - Product Requirements Document

## Original Problem Statement
Complete car rental solution "LogiRent" with multi-agency support, deployed on user's VPS (logirent.ch).

## Tech Stack
- Frontend: React Native (Expo), Backend: FastAPI, Database: MongoDB
- Integrations: Stripe, Resend, Navixy, OpenAI (doc validation)

## What's Been Implemented

### Session March 20, 2026 - All Changes
1. **Client vehicles page**: Compact layout, categories LEFT + search RIGHT, 3-column responsive grid
2. **Admin reservations fix**: Vehicle-schedule query handles datetime+string dates via $or, end-of-day boundary, limit 500. Returns 13 reservations for March (was 2)
3. **Sort by start_date**: Both admin and client reservations sorted by start_date DESC
4. **Admin vehicles 3-column grid**: Large images, price header, feature badges
5. **Homepage redesign**: Compact header, 2-column layout (vehicles left, search right)
6. **4-step Booking Wizard**: Sélection → Validation → Paiement → Confirmation + auto-contract
7. **Admin-configurable booking options per agency**: GPS, Siège enfant, Conducteur supplémentaire
8. **Planning fix**: Shows ALL vehicles + completed reservations
9. **Vehicle detail page removed**, login redirects to reservations
10. **Notifications fix**: React hooks ordering

## Key Files
- `/app/frontend/app/(tabs)/vehicles.tsx` - Client vehicles (compact, 3-col)
- `/app/frontend/app/agency-app/vehicles.tsx` - Admin vehicles (3-col grid)
- `/app/frontend/app/booking/[id].tsx` - 4-step wizard
- `/app/frontend/app/(tabs)/index.tsx` - Redesigned homepage
- `/app/backend/routes/agencies.py` - Vehicle schedule (date fix)
- `/app/backend/routes/admin.py` - Reservations sort + booking options
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
