# LogiRent - PRD

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile App (iOS & Android) and Web App
- Agency Admin Mobile App for phone bookings
- Admin Web Back-office with Super Admin and Agency Admin roles
- French/English internationalization, violet/grey/black branding

## Architecture
- **4 Interfaces**: Client App (`/`), Agency Admin Mobile App (`/agency-app`), Super Admin (`/super-admin`), Web Admin (`/admin`)
- **Backend**: FastAPI + MongoDB
- **Frontend**: React Native (Expo Router)
- **Auth**: JWT-based, role-based routing

## What's Been Implemented

### Super Admin Agencies - Password Display & GPS Tab Removal (Feb 27, 2026) - NEW
- Mot de passe admin affiché à côté de l'email de chaque agence dans Super Admin > Agences
- Mots de passe stockés en clair lors de la création d'une agence (admin_password_plain)
- Onglet "Suivi GPS" supprimé du menu Super Admin (GPS exclusif à l'admin agence)

### Agency Admin Profile Page (Feb 27, 2026)
- New "Profil" tab (7th tab) in agency admin app
- Admin info card (name, email, Admin Agence badge)
- Agency info section (name, address, phone, email)
- Links & QR Codes section with Copier/Partager/QR Code buttons for both App Client and App Admin
- Settings: Mode sombre toggle + Configuration GPS Navixy link
- Logout button
- Links/QR section removed from home page (Accueil)

### Light/Dark Theme System (Feb 27, 2026)
- Default theme: LIGHT (white backgrounds, dark text)
- ALL screens use dynamic theme colors via useThemeStore()
- Toggle in both app headers, persisted to storage

### GPS Tracking per Agency Admin (Feb 27, 2026)
- GPS tab, per-agency Navixy config, self-service setup

### Client Import with Photos (Feb 27, 2026)
- ZIP import (Excel/CSV + photos), photos matched by filename

### In-App Notifications (Feb 27, 2026)
- Notification bell with unread badge

### Previously Completed
- Agency Admin Mobile App, Admin Interface Separation, QR Codes
- AI Document Verification, Multi-Agency Architecture, Calendar, Auth, Vehicles, Reservations

## Remaining Tasks
- P1: Push Notifications (Firebase)
- P3: Driver/Agent Application
- P4: Advanced Statistics & Dashboards
- P5: App Store Deployment

## Credentials
- Super Admin: test@example.com / password123
- Agency Admin Geneva: admin-geneva@logirent.ch / LogiRent2024
- Agency Admin Lausanne: admin@test.com / password123
- Client: client1@test.com / test1234

## 3rd Party Integrations
- Stripe (Payments), Resend (Email), Navixy (GPS per-agency), OpenAI GPT-5.2 (AI doc verification)
