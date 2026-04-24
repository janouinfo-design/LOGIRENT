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

### Session 2026-04-17 - Completed
1. **Simplification des statuts de reservation**: Labels courts et coherents sur toute l'interface (admin, client, modal d'action): Attente, Especes, Confirmee, Active, Terminee, Annulee. Correction du bug paymentLabels (pending: 'En attente' au lieu de 'Confirmee'). Correction de la legende calendrier client (Active, Attente, Confirmee).
2. **Creation client admin avec mot de passe + email de bienvenue**: Le modal "Nouveau client" permet desormais de definir un mot de passe manuellement (ou laisser vide pour auto-generation). Le formulaire a ete redesigne dans le style du modal vehicule (2 colonnes, sections avec icones, boutons Annuler/Creer). Le backend accepte le champ `password` optionnel via POST /api/admin/quick-client. L'email de bienvenue est envoye via le SMTP de l'agence (agency_id transmis). Le client recoit ses identifiants (email + mot de passe) avec QR code de l'app.

### Session 2026-04-24 - Completed
1. **Flux "Demande de reservation"**: Toute nouvelle reservation est creee en statut `pending` (demande). Email "Demande recue" envoye automatiquement au client. Admin confirme manuellement plus tard. Filtre et KPI "En attente" ajoutes.
2. **Logique de prix 24h**: `Math.ceil((end-start)/3600/24)` = nombre de jours. 24h=1j, 26h=2j, 48h=2j, 50h=3j. Retours tardifs auto-calcules. Admin peut ajuster manuellement le prix.
3. **Inspection vehicule avec IA (GPT-5.2)**: Scan global + par zone (avant/arriere/cotes/interieur) pour detecter les dommages automatiquement via Emergent LLM Key.
4. **Creation client multi-etapes dans la reservation**: Base info -> details -> validation, avec WebcamCapture pour photos ID/permis.
5. **Contrat retire cote client**: Les clients ne peuvent plus generer ni voir le contrat. Genere par l'admin a l'activation, envoye par email apres signature.
6. **Page confirmation client mise a jour**: "Demande de reservation envoyee !" avec icone sablier, bouton "Telecharger le contrat" retire, message email d'attente, accents francais corriges.
7. **Dashboard "Demandes a traiter"**: Nouvelle section prominente sur l'accueil admin (/app/frontend/app/agency-app/index.tsx) affichant les demandes en attente avec badge de comptage rouge, cartes client (nom cliquable + temps ecoule), infos vehicule+dates+montant, et 3 actions rapides (Refuser / Details / Confirmer). Lien "Tout voir" avec param URL `?filter=pending` qui pre-applique le filtre sur la page Reservations. Section cachee automatiquement s'il n'y a aucune demande en attente.
8. **Systeme d'alertes nouvelles demandes (complete)**:
  - **Email a l'agence**: Nouvelle fonction `send_new_request_admin_email` dans `utils/email.py` qui envoie un email avec details client + details reservation + bouton "Traiter la demande" a TOUS les admins de l'agence concernee, via le SMTP configure. Appelee depuis `POST /api/reservations`.
  - **Badge rouge sur menu "Reservations"**: Pastille rouge avec compteur sur l'onglet Reservations du menu principal (`_layout.tsx`), visible depuis n'importe quelle page. Actualisee toutes les 30s via `/api/admin/stats`. Egalement sur le sous-menu "Toutes les reservations".
  - **Notifications push mobile**: Hook `usePushNotifications` (`src/hooks/usePushNotifications.ts`) qui enregistre automatiquement le token Expo Push du device mobile dans `/api/notifications/register-token`. Active sur iOS/Android uniquement (no-op sur web). Necessite `expo.extra.eas.projectId` configure dans `app.json`. Les notifications push sont deja cablees cote backend (fonction `send_expo_push` dans `utils/notifications.py`).
  - **Notification in-app**: Deja en place via `notify_admins_of_agency` (lors de creation de reservation).

9. **Modifier le prix et envoyer une contre-offre au client**:
  - **Nouvel endpoint**: `POST /api/admin/reservations/{id}/send-offer` dans `routes/admin.py`. Accepte `total_price` et `message` optionnels. Met a jour le prix + enregistre une `price_adjustments` entry + envoie email au client + cree notification in-app.
  - **Email de proposition**: Nouvelle fonction `send_price_offer_email` + template `generate_price_offer_email` dans `utils/email.py`. Affiche ancien prix barre + nouveau prix + message optionnel de l'agence. Inclut bouton CTA pour que le client se connecte.
  - **UI**: Bouton "Modifier prix" (bleu) remplace "Details" dans les cartes "Demandes a traiter". Clic sur le badge prix ou le bouton ouvre un modal avec: prix actuel affiche, input editable pour le nouveau prix, textarea message optionnel, tooltip explicatif. Action "Envoyer l'offre" (bouton bleu avec paper-plane icon).
  - **Validee**: pytest `test_offer_email.py` (2 cas: prix change / prix identique) + test endpoint live (360 CHF -> 299 CHF + message).

10. **Cartes "Demandes a traiter" harmonisees avec "Reservations du jour"**:
  - Meme modele visuel que `TodayReservationCard`: grille 3 colonnes, bordure gauche orange 4px, header (nom client cliquable souligne + badge DOCS + badge "Attente"), timestamp relatif, vehicule, dates + nombre de jours, chips Depart/Retour avec heures, prix cliquable (edit icon), badge paiement (Especes/Carte), 3 boutons d'action (Refuser / Modifier / Confirmer).
  - Position: directement au-dessus de "Reservations du jour" pour priorite visuelle maximale.
  - Section cachee automatiquement si aucune demande en attente.

## Prioritized Backlog

### P1 - Next
- Dynamic AI Pricing, Predictive Maintenance
- Automatic invoice email reminders, Accounting export

### P2 - Future
- Multi-channel (Expedia, Kayak), Loyalty program, Multi-currency

### P3 - Backlog
- App Store/Play Store submission (blocked on user creating Google Play account)
- Health dashboard, Fine management
