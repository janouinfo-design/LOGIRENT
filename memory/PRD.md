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
- `app/admin/` - statistics.tsx

## Key API Endpoints
- `POST /api/auth/login` - Login (returns access_token)
- `GET /api/admin/stats` - Basic stats
- `GET /api/admin/stats/advanced` - Advanced stats (daily revenue, utilization, etc.)
- `GET /api/admin/stats/top-clients` - Top clients by revenue
- `GET /api/admin/stats/agency-comparison` - Agency revenue comparison (super admin only)
- `GET /api/admin/stats/revenue-forecast` - AI-powered revenue forecast (GPT-5.2)
- `POST /api/admin/impersonate/{user_id}` - Super admin impersonation
- `PUT /api/contracts/{contract_id}` - Update contract with signature

## Completed Tasks
- [2026-03-02] Backend refactoring: 3704->167 lines entry point. 70 tests.
- [2026-03-02] ABICAR contract PDF + Swiss CO/LP legal text.
- [2026-03-02] Contract auto-generation + editable fields + on-screen signing.
- [2026-03-02] Super Admin impersonation: "Login as" button.
- [2026-03-02] Security: Removed plain-text password exposure.
- [2026-03-02] Frontend refactoring: super-admin pages refactored (-64%).
- [2026-03-02] Analytics dashboards: Top Clients + Agency Comparison sections.
- [2026-03-02] AI Revenue Forecast (GPT-5.2): Endpoint + frontend charts for both super-admin and agency-admin. 16 tests passed.
- [2026-03-02] Fix: Impersonation token via URL hash instead of localStorage swap. Both sessions now independent.
- [2026-03-02] Vehicle fields: Added plate_number, chassis_number, color to Vehicle model and edit UI.
- [2026-03-02] Vehicle document upload: Object Storage integration (Emergent), upload/download/delete endpoints. Frontend document management in edit modal (carte grise, assurance, controle technique, photos). 19 tests passed.
- [2026-03-02] Booking flow redirect: After confirming reservation, navigates to reservations planning page with pulsing highlight on the new reservation bar + success banner for 4 seconds.
- [2026-03-02] Lists to vignettes: Converted clients list and booking vehicle selection to 4-column card grids with photos/avatars, badges, and compact info.
- [2026-03-02] Document expiration system: Added expiry_date to documents, GET /api/admin/vehicles/document-alerts endpoint (30-day warning), color-coded badges in vehicle edit modal (green/orange/red), dashboard alerts section. 10 tests passed.
- [2026-03-02] Super admin vignettes: Converted agencies, vehicles, and users lists to 4-column card grids. Agencies show stats/action buttons, vehicles show photos/status/price, users show avatars/ratings. 10 tests passed (iteration 32).
- [2026-03-02] Client identity/license fields: Added birth_place, birth_year, license_number, license_issue_date, license_expiry_date, nationality to client profiles. Required fields with red border validation. Edit + creation modals updated. 9 pytest tests passed (iteration 33).
- [2026-03-02] Booking→Contract→Planning flow: After confirming reservation, navigates to contract page (auto-filled with client identity + vehicle data). After signing, 'Voir sur le planning' button leads to planning with pulsing highlight. Contract auto-fills nationality, license, dates, plate, color, chassis. 7 pytest tests passed (iteration 34).
- [2026-03-02] Fix: Mouse signature canvas rewritten with native DOM event listeners (bypasses React Native Web interception). Clear/Confirm buttons work. 9 pytest tests passed (iteration 35).
- [2026-03-02] Reservations in 4-column vignettes: Both list view and planning-below cards now 4-column grids. Inline status change buttons (Conf/Activ/Termi/Annul) on every card for quick status updates.

## Key API Endpoints (New)
- `POST /api/admin/vehicles/{id}/documents?doc_type=carte_grise` - Upload vehicle document
- `GET /api/vehicles/{id}/documents/{doc_id}/download` - Download vehicle document
- `DELETE /api/admin/vehicles/{id}/documents/{doc_id}` - Soft-delete vehicle document

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

## Test Credentials
- Super Admin: test@example.com / password123
- Geneva Admin: admin-geneva@logirent.ch / LogiRent2024
- Lausanne Admin: admin@test.com / password123
- Client: client1@test.com / test1234
