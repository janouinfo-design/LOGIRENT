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
- `app/(tabs)/` - index.tsx (home), vehicles.tsx, reservations.tsx, profile.tsx, _layout.tsx
- `app/_layout.tsx` - TopNavBar + main app layout
- `app/(auth)/` - login.tsx, register.tsx

## Completed Tasks
- [2026-03-02] Backend refactoring: 3704->167 lines entry point. 70 tests.
- [2026-03-02] ABICAR contract PDF + Swiss CO/LP legal text.
- [2026-03-02] Contract auto-generation + editable fields + on-screen signing.
- [2026-03-02] Super Admin impersonation: "Login as" button.
- [2026-03-02] Security: Removed plain-text password exposure.
- [2026-03-02] Frontend refactoring: super-admin pages refactored (-64%).
- [2026-03-02] Analytics dashboards: Top Clients + Agency Comparison sections.
- [2026-03-02] AI Revenue Forecast (GPT-5.2): Endpoint + frontend charts.
- [2026-03-02] Vehicle fields: plate_number, chassis_number, color.
- [2026-03-02] Vehicle document upload: Object Storage integration.
- [2026-03-02] Booking flow redirect: pulsing highlight + success banner.
- [2026-03-02] Lists to vignettes: 4-column card grids.
- [2026-03-02] Document expiration system: color-coded badges.
- [2026-03-02] Client identity/license fields.
- [2026-03-02] Booking->Contract->Planning flow.
- [2026-03-02] Reservations in 4-column vignettes with inline status change.
- [2026-03-03] GPS Tracking 4-column grid + status text size increase.
- [2026-03-03] Global text size increase across all card grid pages.
- [2026-03-03] Component refactoring: 6 sub-components from clients.tsx & reservations.tsx.
- [2026-03-03] **Bug fix**: Client app vehicles not showing (removed agency_id filter for client users).
- [2026-03-03] **Bug fix**: Logout inaccessible on mobile (added bottom tab bar + red logout icon in top navbar, hid FR/EN on mobile).
- [2026-03-03] **Feature**: Complete client profile overhaul — replaced birth_year with date_of_birth (DD-MM-YYYY) across backend + frontend. Added all identity fields (birth_place, date_of_birth, nationality, license_number, license_issue_date, license_expiry_date) to client profile page (read + edit), admin EditClientModal, and NewClientModal. 100% test pass rate (backend 10/10, frontend verified).
- [2026-03-03] **Bug fix**: Document upload buttons invisible on Android native — applied inline backgroundColor (#7C3AED for upload, #EDE9FE for modify) instead of StyleSheet-based conditional styles that weren't merging correctly on native.
- [2026-03-03] **Feature**: Grid layout changed from 4 to 3 columns across all admin pages (reservations, vehicles, clients, users, GanttChart).
- [2026-03-03] **Feature**: Font sizes increased ~50% across all admin card components for better readability.
- [2026-03-03] **Feature**: Dark mode completely disabled — forced light mode in themeStore, removed all toggle buttons from layouts.
- [2026-03-03] **Feature**: Super Admin can now activate/deactivate agency admin accounts. Backend endpoint PUT /api/admin/agencies/{id}/toggle-active. Login blocked for deactivated accounts with "Votre compte a été désactivé" message. Visual indicator on deactivated cards.
- [2026-03-03] **Bug fix**: Super Admin agencies page was hardcoded with dark theme colors — replaced with light colors.
- [2026-03-03] **Feature**: Complete Push Notification System (P1):
  - Backend: Notification triggers for ALL events (reservation creation, cancellation, payment success, status changes, reminders)
  - Backend: Expo Push API integration for native push notifications + push token registration endpoint
  - Backend: Hourly cron job for reservation reminders (day before)
  - Backend: `create_notification` and `notify_admins_of_agency` utility functions
  - Frontend: Dedicated notification center page at `/(tabs)/notifications` with pull-to-refresh, mark-all-read, delete, and empty state
  - Frontend: Notification badge on NavBar (top + bottom) with real-time polling (15s interval)
  - Frontend: Push token registration on app startup (native only)
  - Recipients: Clients + Agency Admins
  - Events: reservation_created, reservation_confirmed, reservation_cancelled, client_cancelled, payment_success, payment_received, reservation_reminder, reservation_active, reservation_completed, late_return, new_message

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS), OpenAI GPT-5.2 (Revenue Forecast), Emergent Object Storage (Documents), Expo Push API (Notifications)

- [2026-03-03] **Bug fix (P0)**: Fixed "Add Vehicle" modal in Agency Admin — form fields were invisible due to undefined styles (`st.fieldInput` → `st.input`, `st.modalActionBtn` → `st.actionBtn`) and non-existent theme property (`C.background` → `C.bg`). Also fixed backend 500 error on `POST /api/admin/vehicles` (Pydantic validation failing with None values for status/documents). Full vehicle CRUD now functional.
- [2026-03-05] **Refactoring**: Decomposed `vehicles.tsx` (866 lines) into 4 clean components:
  - `vehicleTypes.ts` (105 lines) — shared types, constants, styles
  - `VehicleCard.tsx` (62 lines) — card component
  - `EditVehicleModal.tsx` (438 lines) — edit modal with photos/docs
  - `NewVehicleModal.tsx` (171 lines) — add vehicle modal
  - `vehicles.tsx` reduced to 116 lines (coordinator). 100% test pass after refactoring.
- [2026-03-05] **Feature**: Photo Gallery Modal — clicking on a vehicle photo opens full-screen viewer with horizontal scroll, navigation arrows, thumbnail strip, and photo counter (X/Y)
- [2026-03-05] **Bug fix**: Edit Vehicle Modal scroll fix — added maxHeight constraint (85% viewport) so Save/Cancel buttons are always reachable
- [2026-03-05] **Feature**: Photo count badge on vehicle cards showing number of photos

- [2026-03-05] **Performance (P0)**: Migrated vehicle photos from MongoDB Base64 to MinIO Object Storage. API payload reduced from 2.6MB to 15KB. Backend proxy endpoint GET /api/vehicles/photo/{path} for secure image serving.
- [2026-03-05] **Feature**: Client mobile bottom tab bar (native Expo Router tabs replacing custom nav).
- [2026-03-05] **Feature**: Swipeable image carousel on vehicle detail page.
- [2026-03-05] **Feature**: Auto-generate contract on reservation confirmation + redirect to contract page.
- [2026-03-05] **Bug fix**: Vehicle photos disappearing on edit — fixed to preserve existing photos.
- [2026-03-06] **Feature**: Interactive vehicle inspection diagram on contract pages. Admins can click on 13 car zones (pare-chocs, portes, toit, coffre, etc.) to annotate damages with descriptions. Damage data saved to contract_data.damages, displayed in red on zone grid, listed below diagram, and included in PDF as a damage table.

## Prioritized Backlog
### P1: Push Notifications (re-implement with non-Expo approach)
### P2: Resend domain verification (user action required for logitrak.ch)
### P2: Driver/Agent Application
### P3: App Store Deployment
### Optional: book.tsx cleanup, move /agency-app/components/ outside app/ dir

## Key Technical Notes
- Vehicle photos served via backend proxy: GET /api/vehicles/photo/{path} (use getPhotoUrl helper from src/utils/url.ts)
- Contract editing: Two pages — /contract/[id] (toggle edit) and /agency-app/complete-contract (always editable)
- Expo Go cache aggressive: restart frontend + clear device cache after UI changes
- Object Storage (MinIO) for vehicle photos and documents

## Test Credentials
- Super Admin: test@example.com / password123
- Geneva Admin: admin-geneva@logirent.ch / LogiRent2024
- Lausanne Admin: admin@test.com / password123
- Client: client1@test.com / test1234
