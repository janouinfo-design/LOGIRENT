# TimeSheet - Plateforme SaaS Complete de Gestion RH

## Problem Statement
Plateforme SaaS complete de gestion du temps et des ressources humaines pour entreprises suisses, inspiree de Tipee.

## Tech Stack
- Frontend: Expo Web (React Native Web) with expo-router
- Backend: FastAPI (Python)
- Database: MongoDB
- Maps: Leaflet.js (GPS geofencing)

## Architecture - 21 screens, 50+ API endpoints
```
/app
├── backend/server.py           # FastAPI - all models, routes, business logic
├── frontend/app/(app)/
│   ├── index.tsx               # Dashboard (pointage + soldes + geofencing)
│   ├── timesheets.tsx          # Feuilles de temps
│   ├── projects.tsx            # Gestion projets (budget, taux, heures/mois, GPS)
│   ├── planning.tsx            # Planning equipes (calendrier hebdo)
│   ├── leaves.tsx              # Absences (recherche, filtres, CRUD complet)
│   ├── expenses.tsx            # Notes de frais
│   ├── messaging.tsx           # Messagerie interne
│   ├── directory.tsx           # Annuaire employes (recherche, modification)
│   ├── documents.tsx           # Dossier RH
│   ├── reports.tsx             # Rapports (PDF/Excel)
│   ├── analytics.tsx           # Tableau de bord analytique (graphiques)
│   ├── invoices.tsx            # Facturation
│   ├── payroll.tsx             # Variables paie + export suisse
│   ├── notifications.tsx       # Centre notifications
│   ├── subscriptions.tsx       # Plans d'abonnement SaaS
│   ├── audit.tsx               # Journal d'audit
│   ├── users.tsx               # Gestion utilisateurs
│   ├── departments.tsx         # Departements
│   ├── clients.tsx             # Clients
│   ├── activities.tsx          # Activites
│   └── profile.tsx             # Profil
└── frontend/src/components/
    ├── Sidebar.tsx             # Navigation (21 items, role-based)
    ├── LeafletMap.tsx          # Carte geofence (dashboard)
    └── MapPicker.tsx           # Carte interactive (admin projets)
```

## ALL FEATURES IMPLEMENTED

### 1. Pointage / Timbrage
- Clock-in/out + pauses, timer temps reel
- GPS geofencing avec carte Leaflet, validation Haversine
- Selection projet obligatoire + lieu de travail (Bureau/Teletravail/Chantier)

### 2. Soldes en temps reel
- Vacances restantes (25j suisse), heures supplementaires
- Heures du mois avec progression, repartition lieux

### 3. Gestion des absences (7 types) - ENHANCED Mars 4, 2026
- Vacances, Maladie, Accident, Formation, Maternite, Paternite, Conge special
- Workflow: demande employe > validation manager > notification
- Barre de recherche (nom, type, raison)
- Filtres par statut (Tous, En attente, Approuvees, Refusees)
- Bouton Modifier + Supprimer sur les absences en attente
- CRUD complet: PUT /api/leaves/{id}, DELETE /api/leaves/{id}

### 4. Planning des equipes
- Calendrier hebdomadaire, navigation semaines, filtre departement

### 5. Notes de frais
- CRUD complet avec categories, approbation manager

### 6. Messagerie interne
- Conversations multi-participants, envoi/reception messages

### 7. Annuaire employes - ENHANCED Mars 4, 2026
- Cartes avec statut temps reel, recherche par nom/email/departement
- Bouton Modifier par employe (modal: prenom, nom, telephone, heures contrat)
- Compteurs: Actifs, Absents, Total

### 8-17. (See previous PRD for full list)

### 18. Module Projets ameliore (Mars 4, 2026)
- Champ devise (CHF, EUR, USD) par projet
- 3 cartes resume: Budget total, Taux horaire, Heures consommees ce mois
- Endpoints: GET /api/projects/monthly-hours, GET /api/projects/{id}/monthly-hours

## Credentials
- Admin: admin@timesheet.ch / admin123
- Manager: manager@test.ch / test123
- Employee: employe@test.ch / test123

## Remaining P1 Tasks
- Connecter les modules placeholder aux APIs backend
- Mode hors ligne PWA, Plans SaaS, App mobile native

## Refactoring Needed
- Decouper server.py monolithique en modules
