# LogiRent - Product Requirements Document

## Overview
LogiRent is a complete car rental management solution for Swiss vehicle rental agencies. It features a React Native/Expo Web frontend, FastAPI backend, and MongoDB database.

## Target Users
- **Agency Admins**: Manage vehicles, reservations, clients, invoicing, contracts, documents
- **Clients**: Browse vehicles, book rentals, manage documents, pay invoices, scan ID/license
- **Super Admin**: Oversee all agencies

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

### Core Features (Previous Sessions)
- User authentication, Multi-agency RBAC, Vehicle CRUD with photos
- Premium vehicle catalog (admin + client), Vehicle detail pages
- Reservation system with booking flow, PDF contract generation, E-signature
- Vehicle inspections with AI damage detection, Seasonal pricing, Pricing tiers
- GPS tracking (Navixy), Analytics dashboard, Notification system
- Module toggles per agency, GitHub Actions CI/CD deployment

### Session 2026-04-03 - Completed
1. **Swiss Invoicing System**: CRUD (5 types), PDF+QR-bill, TVA 7.7%, Stripe+TWINT, admin dashboard, client portal
2. **Agency Billing Settings (QR-IBAN)**: Admin configures IBAN, company info for invoices
3. **Document Scanning - Admin**: Client list, camera/gallery upload, validation with manual data entry
4. **Document Scanning - Client**: "Mes documents" page with 4 doc types, progress bar, Scanner/Galerie buttons
5. **Mobile App Configuration**: app.json + eas.json, LogiRent icon, bundle ID ch.logirent.app

## Prioritized Backlog

### P1 - Next
- Dynamic AI Pricing, Predictive Maintenance
- Automatic invoice email reminders, Accounting export (CSV/XML)

### P2 - Future
- Multi-channel (Expedia, Kayak), Loyalty program, Real reviews, OCR API, Multi-currency

### P3 - Backlog
- App Store/Play Store submission, Health dashboard, Check-in selfie, Fine management
