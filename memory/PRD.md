# LogiRent - PRD

## Original Problem Statement
Complete car rental solution "LogiRent": Client App, Admin Back-office (Super Admin + Agency Admin), Driver App.

## Architecture
### Backend: `/app/backend/` (FastAPI + MongoDB)
- `server.py` (167 lines) entry point with routers: auth, vehicles, reservations, notifications, payments, admin, agencies, navixy, contracts

### Frontend: `/app/frontend/` (React Native / Expo)
- `app/super-admin/` - statistics.tsx, agencies.tsx, reservations.tsx, vehicles.tsx, users.tsx
- `app/super-admin/components/` - ReservationComponents.tsx, VehicleComponents.tsx, UserComponents.tsx
- `app/agency-app/` - statistics.tsx, book.tsx, clients.tsx, reservations.tsx, vehicles.tsx, tracking.tsx
- `app/agency-app/components/` - EditClientModal.tsx, NewClientModal.tsx, ImportClientModal.tsx, GanttChart.tsx, ReservationCard.tsx, ReservationActionModal.tsx
- `app/admin/` - statistics.tsx
- `app/(auth)/` - login.tsx, register.tsx

## Key API Endpoints
- `POST /api/auth/login` - Login (returns access_token)
- `GET /api/admin/stats` - Basic stats
- `GET /api/admin/stats/advanced` - Advanced stats (daily revenue, utilization, etc.)
- `GET /api/admin/stats/top-clients` - Top clients by revenue
- `GET /api/admin/stats/agency-comparison` - Agency revenue comparison (super admin only)
- `GET /api/admin/stats/revenue-forecast` - AI-powered revenue forecast (GPT-5.2)
- `POST /api/admin/impersonate/{user_id}` - Super admin impersonation
- `PUT /api/contracts/{contract_id}` - Update contract with signature
- `POST /api/admin/vehicles/{id}/documents?doc_type=carte_grise` - Upload vehicle document
- `GET /api/vehicles/{id}/documents/{doc_id}/download` - Download vehicle document
- `DELETE /api/admin/vehicles/{id}/documents/{doc_id}` - Soft-delete vehicle document

## Completed Tasks
- [2026-03-02] Backend refactoring: 3704->167 lines entry point. 70 tests.
- [2026-03-02] ABICAR contract PDF + Swiss CO/LP legal text.
- [2026-03-02] Contract auto-generation + editable fields + on-screen signing.
- [2026-03-02] Super Admin impersonation: "Login as" button.
- [2026-03-02] Security: Removed plain-text password exposure.
- [2026-03-02] Frontend refactoring: super-admin pages refactored (-64%).
- [2026-03-02] Analytics dashboards: Top Clients + Agency Comparison sections.
- [2026-03-02] AI Revenue Forecast (GPT-5.2): Endpoint + frontend charts for both super-admin and agency-admin. 16 tests passed.
- [2026-03-02] Fix: Impersonation token via URL hash instead of localStorage swap.
- [2026-03-02] Vehicle fields: plate_number, chassis_number, color.
- [2026-03-02] Vehicle document upload: Object Storage integration (Emergent). 19 tests passed.
- [2026-03-02] Booking flow redirect: After confirming reservation, pulsing highlight + success banner.
- [2026-03-02] Lists to vignettes: 4-column card grids with photos/avatars/badges.
- [2026-03-02] Document expiration system: color-coded badges. 10 tests passed.
- [2026-03-02] Super admin vignettes: agencies, vehicles, users lists to 4-column card grids. 10 tests passed.
- [2026-03-02] Client identity/license fields. 9 pytest tests passed.
- [2026-03-02] Booking->Contract->Planning flow: auto-filled contract. 7 pytest tests passed.
- [2026-03-02] Fix: Mouse signature canvas with native DOM event listeners. 9 pytest tests passed.
- [2026-03-02] Reservations in 4-column vignettes with inline status change buttons.
- [2026-03-03] GPS Tracking 4-column grid + status text size increase. 8/8 tests passed.
- [2026-03-03] Global text size increase across all 6 card grid pages. 6/6 tests passed.
- [2026-03-03] Component refactoring: Extracted 6 sub-components from clients.tsx and reservations.tsx into /agency-app/components/. 100% frontend test pass rate (iteration 38).

## 3rd Party Integrations
- Stripe (Payments)
- Resend (Email)
- Navixy (GPS Tracking)
- OpenAI GPT-5.2 via emergentintegrations (Revenue Forecast)
- Emergent Object Storage (Vehicle Documents)
- react-native-svg (Charts)
- reportlab (PDF Generation)

## Prioritized Backlog
### P1: Push Notifications (Firebase)
### P2: Driver/Agent Application
### P3: App Store Deployment
### Optional: book.tsx cleanup/refactoring
### Optional: Move /agency-app/components/ to /src/components/agency/ to avoid expo-router route warnings

## Test Credentials
- Super Admin: test@example.com / password123
- Geneva Admin: admin-geneva@logirent.ch / LogiRent2024
- Lausanne Admin: admin@test.com / password123
- Client: client1@test.com / test1234
