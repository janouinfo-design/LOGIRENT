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
│   ├── leaves.tsx              # Absences (7 types)
│   ├── expenses.tsx            # Notes de frais
│   ├── messaging.tsx           # Messagerie interne
│   ├── directory.tsx           # Annuaire employes
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

### 3. Gestion des absences (7 types)
- Vacances, Maladie, Accident, Formation, Maternite, Paternite, Conge special
- Workflow: demande employe > validation manager > notification

### 4. Planning des equipes
- Calendrier hebdomadaire, navigation semaines, filtre departement
- Legende couleur par type (bureau, teletravail, vacances, maladie...)

### 5. Notes de frais
- CRUD complet avec categories (Transport, Repas, Materiel, etc.)
- Association projet, approbation manager

### 6. Messagerie interne
- Conversations multi-participants, envoi/reception messages
- Rafraichissement auto toutes les 5s, compteur non-lus

### 7. Annuaire employes
- Cartes avec statut temps reel, recherche
- Indication lieu de travail actuel

### 8. Dossier RH
- Documents par categorie (Contrat, Certificat, Formation, Evaluation, Medical...)
- Filtrage par categorie et employe

### 9. Rapports et Export
- Filtres mois/annee/employe, stats mensuelles
- Export PDF et Excel

### 10. Tableau de bord analytique (Manager)
- KPIs: employes, projets actifs, heures/mois, taux absenteisme
- Graphiques: heures mensuelles, heures par projet, repartition lieux
- Taux d'absenteisme mensuel

### 11. Facturation
- Creation factures depuis pointages, selection client/projet
- Statuts: Brouillon, Envoyee, Payee, En retard

### 12. Variables de paie + Export suisse
- Calcul automatique: heures, supplementaires, nuit, maladie, vacances, frais, brut
- Export Cresus (CSV), Abacus (XML), WinBiz (Excel)
- Tableau detaille par employe

### 13. Horaires fixes/flexibles
- Definition horaires par jour et par employe
- Types: fixe ou flexible avec heures hebdo

### 14. Plans d'abonnement SaaS
- 3 plans: Basic (5 CHF), Professional (12 CHF), Enterprise (25 CHF)
- Fonctionnalites differenciees par plan

### 15. GPS Geofencing
- Carte interactive admin (clic pour placer, marqueur deplacable)
- Rayon configurable 50-500m, validation au pointage

### 16. Notifications + Journal d'audit
- Centre notifications multi-type, audit complet pour admin

### 17. Gestion admin complete
- Utilisateurs, Departements, Clients, Activites, Roles (Admin/Manager/Employe)

### 18. Module Projets ameliore (Mars 4, 2026)
- Champ devise (CHF, EUR, USD) par projet
- 3 cartes resume par projet: Budget total, Taux horaire, Heures consommees ce mois
- Endpoints: GET /api/projects/monthly-hours (batch), GET /api/projects/{id}/monthly-hours (detail)
- Calcul automatique des heures et couts par mois

## Credentials
- Admin: admin@timesheet.ch / admin123
- Manager: manager@test.ch / test123
- Employee: employe@test.ch / test123

## Remaining P1 Tasks
- Connecter les modules placeholder aux APIs backend:
  - Absences: types de conges + workflow approbation
  - Notes de frais: integration complete
  - Dossier RH: stockage fichiers
  - Messagerie: implementation temps reel (WebSockets)
  - Planning & Horaires
  - Factures
  - Paie: export logiciels suisses

## Remaining P2/P3/P4 (Nice to Have)
- Mode hors ligne PWA (Service Worker)
- Plans d'abonnement SaaS avec gating
- Application mobile native (Expo Go)
- SSO / LDAP integration
- Integration ProConcept, Opale

## Refactoring Needed
- Decouper server.py monolithique en modules (routes, models, services)
