# LogiRent - Product Requirements Document

## Overview
LogiRent is a complete car rental management solution for Swiss vehicle rental agencies. It features a React Native/Expo Web frontend, FastAPI backend, and MongoDB database.

## Target Users
- **Agency Admins**: Manage vehicles, reservations, clients, invoicing, contracts
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

## Architecture
- **Frontend**: React Native / Expo Web (hybrid)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Stripe (card + TWINT)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Storage**: Emergent Object Storage
- **Deployment**: VPS with GitHub Actions CI/CD

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
- Seasonal pricing
- Pricing tiers
- GPS tracking (Navixy)
- Analytics dashboard
- Notification system
- Module toggles per agency
- GitHub Actions CI/CD deployment
- **Swiss Invoicing System (2026-04-03)**:
  - Invoice CRUD (deposit, reservation, final, penalty, credit_note)
  - PDF generation with Swiss QR-bill
  - TVA 7.7% calculation
  - Stripe Checkout (card + TWINT)
  - Admin invoice dashboard with filters, search, actions
  - Client "Mes Factures" portal with payment buttons
  - Invoice email sending
  - Penalty and credit note management

### Key Files
- `/app/backend/routes/invoices.py` - Invoice CRUD & payments
- `/app/backend/utils/invoice_pdf.py` - PDF with QR-bill
- `/app/frontend/app/agency-app/invoices.tsx` - Admin dashboard
- `/app/frontend/app/my-invoices.tsx` - Client portal

## Prioritized Backlog

### P1 - Next
- Dynamic AI Pricing (adjust prices by demand/season)
- Predictive Maintenance (mileage/date alerts)

### P2 - Future
- Multi-channel integration (Expedia, Kayak)
- Loyalty program (points system)
- Real reviews system

### P3 - Backlog
- App Store / Play Store deployment
- Health dashboard (super-admin)
- Check-in selfie verification
- Fine/toll management
