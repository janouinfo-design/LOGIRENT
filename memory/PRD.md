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

### Authentication & Roles
- Super Admin, Agency Admin, Client roles
- JWT-based auth with bcrypt password hashing
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

### Notifications
- In-app notifications
- Email notifications (Resend)
- Reservation reminders (cron job)
- Overdue alerts

### Multi-Tenant
- Agency creation with slug-based routing
- Per-agency contract templates
- Agency admin isolation
- Agency activate/deactivate (Super Admin)

## VPS Deployment Guide
- Script created: `/app/scripts/seed_superadmin.py`
- Guide created: `/app/scripts/GUIDE_DEPLOIEMENT_VPS.md`
- User's MongoDB Atlas: configured

## 3rd Party Integrations
- **Stripe** - Payments
- **Resend** - Email notifications
- **Navixy** - GPS tracking
- **OpenAI (emergentintegrations)** - AI revenue forecast
- **MinIO (emergentintegrations)** - Object storage
- **ReportLab** - PDF generation
- **QRCode** - Welcome email QR codes

## Test Credentials
- Super Admin: test@example.com / password123
- Agency Admin: admin-geneva@logirent.ch / LogiRent2024
- Client: client1@test.com / test1234

## Verification Status (March 16, 2026)
- Backend: 100% (17/17 tests passed)
- Frontend: 100% (4/4 flows verified)
- Test report: /app/test_reports/iteration_49.json

## Pending Issues
1. **Resend Domain Verification (P2)** - User needs to verify logirent.ch with Resend for emails to work in production

## Upcoming Tasks
1. **Push Notifications (P1)** - Native push notifications for mobile app
2. **Driver/Agent Application (P2)** - Separate mobile app for drivers
3. **App Store Deployment (P3)** - Submit apps to App Store and Play Store
