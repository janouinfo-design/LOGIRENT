# LogiRent - Product Requirements Document

## Overview
LogiRent is a complete car rental management solution for Swiss vehicle rental agencies. It features a React Native/Expo Web frontend, FastAPI backend, and MongoDB database.

## Target Users
- **Agency Admins**: Manage vehicles, reservations, clients, invoicing, contracts, documents
- **Clients**: Browse vehicles, book rentals, manage documents, pay invoices
- **Super Admin**: Oversee all agencies

## Core Requirements
- Multi-agency RBAC (role-based access control)
- Premium vehicle catalog with commercial design (Sixt/Airbnb style)
- Complete booking flow with date selection and payment
- PDF contract generation with e-signature
- Vehicle inspections with AI damage detection
- Swiss invoicing system with QR-bill
- Stripe payments (card + TWINT)
- GPS tracking via Navixy
- Analytics dashboard
- Document scanning and validation
- Mobile app builds (iOS + Android via EAS)

## Architecture
- **Frontend**: React Native / Expo Web (hybrid)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Stripe (card + TWINT)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Storage**: Emergent Object Storage
- **Deployment**: VPS with GitHub Actions CI/CD
- **Mobile**: Expo EAS Build (iOS + Android)

## What's Been Implemented

### Completed Features
- User authentication (login/register/JWT)
- Multi-agency RBAC system
- Vehicle CRUD with photo management
- Premium vehicle catalog (admin + client side)
- Vehicle detail pages (ultra-commercial design)
- Reservation system with booking flow
- PDF contract generation
- E-signature integration
- Vehicle inspections (check-in/check-out)
- AI damage detection (GPT-5.2)
- Seasonal pricing & pricing tiers
- GPS tracking (Navixy)
- Analytics dashboard
- Notification system
- Module toggles per agency
- GitHub Actions CI/CD deployment

### Session 2026-04-03 Completed
- **Swiss Invoicing System**:
  - Invoice CRUD (deposit, reservation, final, penalty, credit_note)
  - PDF generation with Swiss QR-bill (qrbill library, structured address)
  - TVA 7.7% automatic calculation
  - Stripe Checkout (card + TWINT)
  - Admin invoice dashboard with filters, search, actions
  - Client "Mes Factures" portal with payment buttons
  - Invoice email sending with PDF attachment
  - Penalty and credit note management
  - 7 status states (draft→paid→refunded)

- **Agency Billing Settings (QR-IBAN)**:
  - Admin page to configure IBAN/QR-IBAN
  - Company info (name, address, phone, email, TVA)
  - Live invoice preview card
  - Invoice PDF uses agency-specific billing data

- **Document Scanning System**:
  - Camera capture + gallery upload (expo-image-picker)
  - Secure object storage
  - 4 document types (ID card front/back, license front/back)
  - Admin validation interface with manual data entry
  - Extracted data updates client profile
  - Status tracking (pending → validated/rejected)
  - Scalable architecture for future OCR API

- **Mobile App Configuration**:
  - app.json configured for iOS + Android builds
  - eas.json with development/preview/production profiles
  - LogiRent icon (1024x1024) installed
  - Bundle ID: ch.logirent.app
  - Camera, photos, location permissions set

### Key Files
- `/app/backend/routes/invoices.py` - Invoice CRUD & payments
- `/app/backend/utils/invoice_pdf.py` - PDF with QR-bill
- `/app/backend/routes/admin.py` - Billing settings + document scanning endpoints
- `/app/frontend/app/agency-app/invoices.tsx` - Admin invoice dashboard
- `/app/frontend/app/agency-app/billing-settings.tsx` - IBAN/company settings
- `/app/frontend/app/agency-app/documents.tsx` - Document scanning
- `/app/frontend/app/my-invoices.tsx` - Client invoice portal
- `/app/frontend/eas.json` - EAS Build config

## Prioritized Backlog

### P1 - Next
- Dynamic AI Pricing (adjust prices by demand/season)
- Predictive Maintenance (mileage/date alerts)
- Automatic invoice reminders (email before/after due date)
- Accounting export (CSV/XML for Bexio, Abacus)

### P2 - Future
- Multi-channel integration (Expedia, Kayak)
- Loyalty program (points system)
- Real reviews system
- OCR API integration for document scanning
- Multi-currency (EUR + CHF)

### P3 - Backlog
- App Store / Play Store submission
- Health dashboard (super-admin)
- Check-in selfie verification
- Fine/toll management
- Recurring invoicing (long-term rentals)
