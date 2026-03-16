# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile/Web App
- Admin Web Back-office (Super Admin & Agency Admin)
- Future: Driver/Agent App

## Core Architecture
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (local dev) / MongoDB Atlas (production)
- **Storage**: MinIO Object Storage (via emergentintegrations)

## What's Been Implemented

### Authentication & Roles (FIXED March 16, 2026)
- Super Admin, Agency Admin, Client roles
- JWT-based auth with bcrypt password hashing
- **Role-based redirection after login**: super_admin → /super-admin, admin → /agency-app, client → /(tabs)
- Password reset via email (Resend)
- Admin impersonation

### Vehicle Management
- CRUD for vehicles with photos, options, documents
- Vehicle status management (available/rented/maintenance)
- GPS tracking integration (Navixy)

### Reservation System
- Client-facing booking with date selection
- Admin reservation management with calendar view
- Payment via Stripe (card) and cash
- Status workflow: pending → confirmed → active → completed
- Overdue detection with notifications

### Contract System
- Interactive vehicle inspection diagram (damage marking)
- Single-page PDF contract generation (ReportLab)
- Contract template system per agency (logo, legal text, rates)
- Live PDF preview for templates
- Digital signature support

### Admin Dashboard
- Statistics: vehicles, users, reservations, revenue
- Advanced analytics with AI revenue forecast (OpenAI GPT-5.2)
- Calendar view with drag support
- Overdue reservations tracking
- Top clients & agency comparison (Super Admin)

### Client Management
- Quick client creation with auto-generated password
- Document upload (license, ID card - front/back)
- Welcome email with QR code
- Client import from Excel/CSV/ZIP
- Client rating system

### Multi-Tenant
- Agency creation with slug-based routing
- Per-agency contract templates
- Agency admin isolation
- Agency activate/deactivate (Super Admin)

## VPS Deployment
- Script: `/app/scripts/seed_superadmin.py`
- Guide: `/app/scripts/GUIDE_DEPLOIEMENT_VPS.md`
- User's MongoDB Atlas: mongodb+srv://...@cluster0.isugn1l.mongodb.net

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS), OpenAI via emergentintegrations, MinIO, ReportLab, QRCode

## Test Credentials
- Super Admin: test@example.com / password123
- Agency Admin: admin-geneva@logirent.ch / LogiRent2024
- Client: client1@test.com / test1234

## Pending Issues
1. Resend Domain Verification (P2) - User needs to verify logirent.ch

## Upcoming Tasks
1. Push Notifications (P1)
2. Driver/Agent Application (P2)
3. App Store Deployment (P3)
