# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile/Web App (React Native/Expo)
- Admin Web Back-office
- Multi-agency support (each admin = separate agency)

## Architecture
- **Frontend**: React Native + Expo Router + Zustand + Axios
- **Backend**: Python FastAPI + MongoDB
- **Payments**: Stripe (Card, TWINT) + Cash
- **Auth**: JWT-based with roles (client, admin, super_admin)

## Data Model
### Collections:
- **users**: {id, email, password_hash, name, phone, address, id_photo, license_photo, role, agency_id, created_at}
- **agencies**: {id, name, address, phone, email, logo, created_at}
- **vehicles**: {id, brand, model, year, type, price_per_day, photos, description, seats, transmission, fuel_type, options, status, location, agency_id, created_at}
- **reservations**: {id, user_id, vehicle_id, agency_id, start_date, end_date, options, total_days, base_price, options_price, total_price, status, payment_method, payment_status, created_at}
- **notifications**: {id, user_id, message, read, created_at}
- **payment_transactions**: {id, user_id, reservation_id, session_id, amount, currency, status, payment_status, metadata, created_at}

## Roles
- **client**: Can browse all vehicles, make reservations, manage profile
- **admin**: Manages their agency's vehicles, reservations, and clients
- **super_admin**: Oversees all agencies, can create/edit/delete agencies

## Key API Endpoints
- POST /api/auth/login - Client/Admin login
- POST /api/auth/register - Client registration
- POST /api/auth/register-admin - Admin registration with new agency
- POST /api/admin/login - Admin-only login (role check)
- GET /api/agencies - List agencies (scoped by role)
- POST /api/agencies - Create agency (super admin)
- GET /api/vehicles?agency_id=xxx - List vehicles (optional agency filter)
- POST /api/admin/vehicles - Create vehicle (auto-assigns agency_id)
- POST /api/reservations - Create reservation (auto-assigns agency_id from vehicle)
- GET /api/admin/stats - Dashboard stats (scoped by agency)
- GET /api/admin/reservations - Reservations (scoped by agency)
- GET /api/admin/users - Users who booked with agency
- GET /api/admin/calendar - Calendar view (scoped by agency)
- POST /api/setup/init - Initialize platform (create default agency, set super_admin)

## Test Credentials
- Super Admin: test@example.com / password123 (LogiRent Geneva)
- Admin: admin2@logirent.ch / password123 (LogiRent Lausanne)
- Client: client1@test.com / test1234

## Implemented Features (as of Feb 2026)
- [x] Client registration & login
- [x] Vehicle catalog with 3-column grid
- [x] Professional homepage with hero section
- [x] Vehicle detail page with Airbnb-style availability calendar
- [x] Booking with date/time selection and same-day booking
- [x] Payment: Card (Stripe), TWINT (Stripe), Cash
- [x] In-app feedback banners for booking errors/success
- [x] Client reservation management
- [x] Client profile with document upload
- [x] Admin panel: Vehicle CRUD, Reservation management, User management
- [x] Admin reservation status & payment status modals
- [x] Admin calendar view
- [x] Late return notifications (cron job + bell icon)
- [x] Global top navigation bar (Facebook-style)
- [x] French/English internationalization support
- [x] **Multi-agency system**: Complete data isolation per agency
- [x] **Admin registration with agency creation**
- [x] **Super admin**: Agency management (CRUD), all-data overview
- [x] **Role-based access control**: client, admin, super_admin
- [x] **Agency-scoped admin panel**: Stats, vehicles, reservations, users filtered by agency

## Backlog
- [ ] Admin Statistics & Dashboards (charts, revenue graphs)
- [ ] Push Notifications (enhance existing bell system)
- [ ] Driver/Agent Application
- [ ] App Store deployment
