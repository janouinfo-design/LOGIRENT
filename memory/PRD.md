# TimeSheet - Plateforme SaaS Complete de Gestion RH

## Problem Statement
Plateforme SaaS de gestion du temps et des ressources humaines pour entreprises suisses.

## Tech Stack
- Frontend: Expo Web (React Native Web) with expo-router
- Backend: FastAPI (Python), MongoDB
- Maps: Leaflet.js (GPS geofencing)

## Sidebar Structure
```
Tableau de bord | Feuilles de temps | Projets | Planning | Absences | Annuaire | Dossier RH | Rapports | Analytique
├── Comptabilite (collapsible)
│   ├── Factures | Paie | Notes de frais
├── Parametres (collapsible)
│   ├── Utilisateurs | Departements | Clients | Activites | Abonnement | Journal d'audit
Top bar: Messagerie | Notifications | Profil (dropdown)
```

## Features Implemented (All pages in vignettes/grid format with search + filters)
1. Pointage GPS avec geofencing + timer temps reel
2. Projets: budget CHF, taux horaire, heures/mois, carte GPS
3. Absences: 7 types, workflow approbation, recherche, filtres statut, modifier/supprimer
4. Notes de frais: categories, recherche, filtres, modifier/supprimer, approbation
5. Notifications: vignettes, recherche, filtres type, modifier/supprimer
6. Annuaire: recherche, bouton modifier, compteurs actifs/absents
7. Dossier RH: vignettes, recherche, filtres categorie
8. Factures: vignettes, recherche, filtres statut, cartes resume
9. Paie: export Cresus/Abacus/WinBiz
10. Planning: calendrier hebdomadaire
11. Analytique: KPIs + graphiques Chart.js
12. Menu Comptabilite: sous-menu (Factures, Paie, Notes de frais)
13. Menu Parametres: sous-menu (Utilisateurs, Departements, etc.)
14. Top bar: Messagerie + Notifications + Profil (dropdown)

## Credentials
- Admin: admin@timesheet.ch / admin123
- Manager: manager@test.ch / test123
- Employee: employe@test.ch / test123

## Remaining Tasks
- P2: Mode hors-ligne PWA
- P3: Plans SaaS avec feature gating
- P4: Application mobile native
- Refactoring: decouper server.py en modules
