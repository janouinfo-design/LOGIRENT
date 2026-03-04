# TimeSheet - Plateforme SaaS Complete de Gestion RH

## Problem Statement
Plateforme SaaS complete de gestion du temps et des ressources humaines pour entreprises suisses, inspiree de Tipee. Centralise pointage, absences, planning, notes de frais, facturation, rapports et annuaire employes.

## Tech Stack
- **Frontend**: Expo Web (React Native Web) with expo-router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Maps**: Leaflet.js (GPS geofencing)

## Architecture
```
/app
├── backend/
│   ├── server.py              # FastAPI - all models, routes, business logic
│   └── tests/                 # Backend tests
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx        # Root layout
│   │   ├── +html.tsx          # HTML template (Leaflet CSS+JS)
│   │   ├── login.tsx          # Login page
│   │   └── (app)/             # Authenticated routes
│   │       ├── _layout.tsx    # Sidebar layout
│   │       ├── index.tsx      # Dashboard (pointage + soldes + geofencing)
│   │       ├── timesheets.tsx # Feuilles de temps
│   │       ├── projects.tsx   # Gestion projets (avec carte GPS)
│   │       ├── planning.tsx   # Planning equipes (calendrier hebdo)
│   │       ├── leaves.tsx     # Gestion absences (7 types)
│   │       ├── expenses.tsx   # Notes de frais
│   │       ├── directory.tsx  # Annuaire employes
│   │       ├── reports.tsx    # Rapports (PDF/Excel)
│   │       ├── invoices.tsx   # Facturation
│   │       ├── notifications.tsx # Centre notifications
│   │       ├── audit.tsx      # Journal d'audit (admin)
│   │       ├── users.tsx      # Gestion utilisateurs
│   │       ├── departments.tsx # Departements
│   │       ├── clients.tsx    # Clients
│   │       ├── activities.tsx # Activites
│   │       └── profile.tsx    # Profil
│   └── src/
│       ├── context/AuthContext.tsx
│       ├── services/api.ts    # API client (all endpoints)
│       ├── components/
│       │   ├── Sidebar.tsx    # Navigation sidebar (16 items)
│       │   ├── LeafletMap.tsx # Carte geofence (dashboard)
│       │   └── MapPicker.tsx  # Carte interactive (admin projets)
│       └── theme/constants.ts
```

## What's Implemented (March 4, 2026)

### 1. Pointage / Timbrage (COMPLETE)
- Clock-in/out + pauses
- GPS geofencing (carte Leaflet, validation distance Haversine)
- Selection projet obligatoire avant pointage
- Selection lieu de travail (Bureau/Teletravail/Chantier)
- Timer temps reel, historique des pointages

### 2. Soldes en temps reel (COMPLETE)
- Vacances restantes (25j standard suisse)
- Heures supplementaires cumulees
- Heures du mois avec barre de progression
- Repartition Bureau/Teletravail/Chantier

### 3. Gestion des absences (COMPLETE)
- 7 types: Vacances, Maladie, Accident, Formation, Maternite, Paternite, Conge special
- Demande par employe, validation par manager
- Notifications automatiques

### 4. Planning des equipes (COMPLETE)
- Calendrier hebdomadaire avec navigation semaines
- Filtrage par departement
- Legende couleur par type (bureau, teletravail, vacances, maladie...)
- Vue condensee heures par jour par employe

### 5. Notes de frais (COMPLETE)
- CRUD complet (creer, lister, approuver, refuser)
- Categories: Transport, Repas, Materiel, Hebergement, Communication, Autre
- Association projet optionnelle
- Resume: approuve, en attente, total

### 6. Rapports et Export (COMPLETE)
- Filtres mois/annee/employe
- Stats mensuelles (heures totales, facturables, supp, jours)
- Export PDF et Excel

### 7. Facturation (COMPLETE)
- Creation factures depuis pointages facturables
- Selection client et projet
- Statuts: Brouillon, Envoyee, Payee, En retard
- Resume: payees, en cours, total

### 8. Annuaire employes (COMPLETE)
- Carte par employe avec statut temps reel
- Recherche par nom/email/departement
- Indication lieu de travail actuel
- Resume: actifs, absents, total

### 9. Notifications (COMPLETE)
- Centre de notifications (info, success, warning, error)
- Marquer lu / tout marquer lu
- Notifications auto sur absences, frais, etc.

### 10. Journal d'audit (COMPLETE - admin)
- Historique toutes actions (CREATE, UPDATE, DELETE, APPROVE, REJECT)
- Filtre par entite et utilisateur

### 11. Suivi teletravail (COMPLETE)
- Selection lieu au pointage (Bureau/Teletravail/Chantier)
- Stats repartition dans "Mes soldes"
- Visible dans planning et annuaire

### 12. GPS Geofencing (COMPLETE)
- Carte interactive dans admin projets (clic pour placer le marqueur)
- Rayon configurable (50-500m)
- Validation distance au pointage
- Blocage si hors zone ou GPS non disponible

### 13. Gestion admin (COMPLETE)
- Utilisateurs, Departements, Clients, Activites
- Roles: Admin, Manager, Employe
- Filtrage menu selon role

## Credentials
- Admin: admin@timesheet.ch / admin123
- Manager: manager@test.ch / test123
- Employee: employe@test.ch / test123

## P1 (Remaining)
- Mode hors ligne (PWA)
- Calcul variables de paie
- Integration logiciels paie (Cresus, Abacus, WinBiz)
- Communication interne (messagerie)
- Dossier collaborateur avec documents RH
- Horaires fixes/flexibles dans planning
