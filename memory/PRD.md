# TimeSheet - Plateforme SaaS de Gestion du Temps

## Problème Original
Application complète de suivi du temps (TimeSheet) pour entreprises suisses avec:
- Rôles: Employee, Manager, Admin
- Suivi du temps: Clock-in/out, pauses, géofencing GPS
- Gestion de projets: Budgets, taux horaires (CHF/EUR/USD)
- Absences, Notes de frais, Documents RH
- Facturation et Paie (exports Cresus/Abacus/WinBiz)
- Interface mobile style "logirent"

## Architecture Technique
- **Frontend**: React Native for Web (Expo Router)
- **Backend**: FastAPI (Python) - Architecture modulaire
- **Base de données**: MongoDB
- **Auth**: JWT avec AsyncStorage

## Structure Backend (Refactorisé)
```
/app/backend/
├── server.py          # Point d'entrée (50 lignes)
├── config.py          # DB, JWT, sécurité
├── models/
│   ├── enums.py       # UserRole, TimesheetStatus, etc.
│   └── schemas.py     # Modèles Pydantic
├── utils/
│   ├── auth.py        # Authentification (hash, tokens, dependencies)
│   └── helpers.py     # Utilitaires (haversine, notifications, audit)
├── routes/
│   ├── auth.py        # Authentification
│   ├── admin.py       # Entreprises, départements, utilisateurs, clients, activités
│   ├── projects.py    # Projets CRUD + stats
│   ├── timeentries.py # Pointages + timer
│   ├── leaves.py      # Absences
│   ├── finance.py     # Factures, dépenses, paie
│   ├── notifications.py
│   ├── stats.py       # Stats, soldes, analytics, audit logs
│   ├── reports.py     # PDF/Excel
│   ├── planning.py    # Planning + horaires
│   ├── hr.py          # Annuaire, messagerie, documents RH
│   └── subscriptions.py
```

## Fonctionnalités Implémentées
- [x] Auth (register, login, JWT)
- [x] Gestion entreprises/départements/utilisateurs
- [x] Gestion clients et activités
- [x] Projets avec budgets, taux, géofencing GPS
- [x] Pointage (clock-in/out, pauses, chrono)
- [x] Absences (CRUD, approbation)
- [x] Facturation
- [x] Notes de frais
- [x] Planning et horaires
- [x] Notifications
- [x] Reports PDF/Excel
- [x] Export paie (Cresus, Abacus, WinBiz)
- [x] Analytics dashboard
- [x] Messagerie interne
- [x] Documents RH
- [x] Dashboard mobile style "logirent" (timer card, chips projet, stats grid, progress bars)
- [x] Backend refactorisé en architecture modulaire

## Credentials de Test
- Admin: admin@timesheet.ch / admin123
- Manager: manager@test.ch / test123
- Employee: employe@test.ch / test123

## Backlog (P2-P4)
- P2: Mode hors-ligne (PWA)
- P3: Plans d'abonnement SaaS (feature gating)
- P4: Compilation mobile native (APK/IPA)
