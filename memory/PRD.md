# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile/Web App (React Native/Expo)
- Admin Web Back-office with multi-agency support
- Super admin oversight of all agencies

## Architecture
- **Frontend**: React Native + Expo Router + Zustand + Axios
- **Backend**: Python FastAPI + MongoDB
- **Payments**: Stripe (Card, TWINT) + Cash
- **Auth**: JWT-based with roles (client, admin, super_admin)

## Multi-Agency Data Model
### Collections:
- **agencies**: {id, name, address, phone, email, logo, created_at}
- **users**: {id, email, password_hash, name, phone, address, id_photo, license_photo, role, agency_id, created_at}
- **vehicles**: {id, brand, model, year, type, price_per_day, photos, description, seats, transmission, fuel_type, options, status, location, agency_id, created_at}
- **reservations**: {id, user_id, vehicle_id, agency_id, start_date, end_date, options, total_days, base_price, options_price, total_price, status, payment_method, payment_status, created_at}
- **notifications**: {id, user_id, message, read, created_at}
- **payment_transactions**: {id, user_id, reservation_id, session_id, amount, currency, status, payment_status, metadata, created_at}

## Roles
- **client**: Browse all vehicles from all agencies, make reservations, manage profile
- **admin**: Manages their agency's vehicles, reservations, and clients (isolated data)
- **super_admin**: Oversees all agencies, creates agencies with admin accounts, sees all data

## Key API Endpoints
### Auth
- POST /api/auth/login - Universal login
- POST /api/auth/register - Client registration
- POST /api/auth/register-admin - Self-register as agency admin (creates agency)
- POST /api/admin/login - Admin-only login (role check, returns 403 for clients)

### Agencies (Super Admin)
- GET /api/agencies - List agencies (super admin=all, admin=own)
- POST /api/agencies - Create agency + admin account (super admin only)
- PUT /api/agencies/{id} - Update agency info
- DELETE /api/agencies/{id} - Delete agency

### Vehicles & Reservations
- GET /api/vehicles?agency_id=xxx - List vehicles (optional agency filter)
- POST /api/admin/vehicles - Create vehicle (auto-assigns agency_id from admin)
- POST /api/reservations - Create reservation (auto-assigns agency_id from vehicle)
- GET /api/admin/stats - Dashboard stats (scoped by agency)
- GET /api/admin/reservations - Reservations (scoped by agency)
- GET /api/admin/users - Users who booked with agency
- GET /api/admin/calendar - Calendar view (scoped by agency)

### Setup
- POST /api/setup/init - Initialize platform (create default agency, migrate data)

## Test Credentials
- Super Admin: test@example.com / password123 (LogiRent Geneva)
- Admin Lausanne: admin2@logirent.ch / password123 (LogiRent Lausanne)
- Admin Zurich: pierre@logirent-zurich.ch / zurich2026 (LogiRent Zurich)
- Client: client1@test.com / test1234

## Implemented Features (as of Feb 25, 2026)

### Client Features
- [x] Registration & login
- [x] Vehicle catalog with 3-column grid
- [x] Professional homepage with hero section
- [x] Vehicle detail page with Airbnb-style availability calendar
- [x] Booking with date/time selection, same-day booking
- [x] Payment: Card (Stripe), TWINT (Stripe), Cash
- [x] In-app feedback banners for booking errors/success
- [x] Reservation management (My Rentals)
- [x] Profile with document upload
- [x] Late return notifications (bell icon)
- [x] Global top navigation bar (Facebook-style)

### Admin Features
- [x] Admin login page (dark theme, login + register toggle)
- [x] Vehicle CRUD (scoped by agency)
- [x] Reservation management with status/payment modals (scoped by agency)
- [x] User management (scoped by agency - only clients who booked)
- [x] Calendar view (scoped by agency)
- [x] Dashboard stats (scoped by agency)
- [x] Agency name badge and role badge in admin panel

### Super Admin Features
- [x] Agency CRUD (create, edit, delete)
- [x] Create agency + admin account simultaneously (credentials shown in success modal)
- [x] All-data overview (sees all agencies, vehicles, reservations, users)
- [x] Agences navigation tab

### Multi-Agency System
- [x] Complete data isolation per agency
- [x] Role-based access control (client, admin, super_admin)
- [x] Auto-assignment of agency_id on vehicle creation and reservation creation
- [x] Agency-scoped admin panel

## Backlog (Priority Order)
- [ ] P2: Admin Statistics & Dashboards (charts, revenue graphs, fleet utilization)
- [ ] P2: Push Notifications (enhance existing bell system)
- [ ] P3: Driver/Agent Application
- [ ] P4: App Store deployment (iOS + Android)
