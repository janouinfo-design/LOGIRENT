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
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (document validation, OCR extraction, damage detection)
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
1. Swiss Invoicing System: CRUD (5 types), PDF+QR-bill, TVA 7.7%, Stripe+TWINT, admin dashboard, client portal
2. Agency Billing Settings (QR-IBAN)
3. Document Scanning - Admin & Client (camera/gallery upload, validation)
4. Mobile App Configuration: app.json + eas.json
5. Admin Menu UX Refactoring (grouped dropdown submenus)
6. Fixed Agency QR codes (app.logirent.ch)

### Session 2026-04-07 - Completed
1. **Camera Integration Fix (DamageAnalyzer)**: expo-image-picker with launchCameraAsync/launchImageLibraryAsync + webcam PC via navigator.mediaDevices.getUserMedia
2. **OCR Integration (Document Scanning)**: Automatic OCR via GPT-5.2 vision, background processing, manual trigger, pre-filled validation modal
3. **Registration Bug Fix**: Fixed TypeScript interface (5 params), added inline error banner, translated UI to French, translated backend error messages
4. **Reservation Page Redesign**: Gestion tab redesigned to match admin mockup - dark top bar (search + quick filters + create), 4 KPI cards, Activite Recente feed, Dernieres Reservations table (Voir/Modifier/Annuler), 3 alert cards, full Toutes les Reservations table (sort + pagination). Planning tab with Gantt chart preserved.

### Session 2026-04-14 - Completed
1. **Heure de reservation** : Chips "Depart HH:MM" et "Retour HH:MM" ajoutees dans TodayReservationCard, tri chronologique des reservations du jour. Les selecteurs d'heure existaient deja dans le formulaire de creation (book.tsx etape 2).
2. **Bouton Modifier vehicules** : Bouton "Modifier" (orange) ajoute sur chaque carte vehicule. Ouvre le modal complet d'edition (statut, marque, modele, annee, prix, places, lieu, plaque, couleur, chassis, type, transmission, photos, documents). Sauvegarde via PUT /api/admin/vehicles/{id}.
3. **Interactive Gantt Chart (Planning)**: Complete overhaul tested and verified. Features: alert bar (retards/conflits/paiements), Jour/Semaine/Mois views, zoom controls, status filters, vehicle search, legend, conflict detection (red bars), today highlight, click-on-reservation popup with quick actions, click-on-empty-cell to create reservation, horizontal scroll.
4. **Drag & Drop Reservations**: Added drag & drop to move reservations on the Gantt chart. Long press (300ms) starts drag, mouse move shows ghost preview (blue cells), release calls reschedule API. Backend: PUT /api/admin/reservations/{id}/reschedule with conflict detection (409). DEPLACABLE badge shown in action modal for movable reservations. Only confirmed/pending/pending_cash reservations are draggable.
5. **Planning Reservation Cards**: Added "Reservations du mois" section below Gantt chart showing all reservations as filterable card list. Cards display vehicle, client, dates, duration, status badge. Synced with Gantt status filters and vehicle search.
6. **Expandable Alert Cards (Gestion)**: Alert cards (Vehicule non rendu, Paiement en attente, Client en retard) now show counts and expand on click to reveal full item lists. Accordion behavior (one at a time). Each item clickable to open action modal.
7. **Heures globales sur les reservations**: Ajout des horaires (HH:mm) dans "Dernieres Reservations" (colonne Heure avec badges vert/bleu + colonne Creee le), "Toutes les Reservations" (heure sous les dates debut/fin), et les cartes Planning (icone horloge + heures depart/retour).
8. **Photos de documents cliquables**: Miniatures avec icone zoom, clic ouvre un modal plein ecran avec bouton fermer.
9. **GPS - Adresse et lien Google Maps**: Cartes vehicules GPS affichent maintenant lat/lng + bouton cliquable "Google Maps" qui ouvre la position dans un nouvel onglet.
10. **Calendrier de disponibilite vehicule**: Bouton "Voir la disponibilite" sur la page detail vehicule ouvre un modal calendrier style agenda eBooking. Vue mensuelle avec jours colores (vert=disponible, rouge=reserve), navigation mois par mois, details des reservations (heures, statut) au clic sur un jour reserve, bouton "Reserver cette date" au clic sur un jour disponible qui pre-remplit le formulaire de booking. Backend: GET /api/vehicles/{id}/availability retourne booked_dates + reservations avec heures.
11. **Gantt Chart pleine largeur**: Refonte du planning pour utiliser toute la largeur ecran. Colonne vehicule elargie (180px) pour noms complets, header dates sticky (reste visible au scroll vertical), colonne vehicule sticky (reste visible au scroll horizontal), hauteur augmentee a 600px pour afficher plus de vehicules, lignes compactes (38px). Supporte 50+ vehicules avec scroll natif.
12. **Workflow Retour Vehicule**: Bouton "Retour" vert dans la table des reservations (actives/confirmees). Ouvre un modal checklist complet: saisie km depart/retour avec calcul auto des km excedentaires, selecteur niveau carburant (Plein/3-4/1-2/1-4/Vide), detection auto retard, penalites configurables (CHF/km, CHF carburant, CHF/h retard), recapitulatif en temps reel des supplements. Backend: POST /api/admin/reservations/{id}/return calcule et sauvegarde les supplements, passe la reservation en "completed", remet le vehicule en "available", notifie le client.
13. **SMTP personnalise par agence**: Chaque agence peut configurer son propre serveur SMTP pour envoyer les emails (confirmations, rappels, factures) depuis sa propre adresse. Page "Configuration Email" dans Outils avec preselections (Gmail, Outlook, Infomaniak, OVH), test d'envoi. Le systeme tente d'abord le SMTP de l'agence, puis fallback sur Resend. Le mot de passe SMTP n'est jamais expose dans l'API. Backend: GET/PUT /api/admin/smtp-config, POST /api/admin/smtp-test.

## Prioritized Backlog

### P1 - Next
- Dynamic AI Pricing, Predictive Maintenance
- Automatic invoice email reminders, Accounting export

### P2 - Future
- Multi-channel (Expedia, Kayak), Loyalty program, Multi-currency

### P3 - Backlog
- App Store/Play Store submission (blocked on user creating Google Play account)
- Health dashboard, Fine management
