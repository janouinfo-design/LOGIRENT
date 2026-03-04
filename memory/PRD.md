# TimeSheet - Plateforme SaaS de Gestion du Temps

## Problem Statement
Plateforme SaaS de gestion du temps pour entreprises suisses avec pointage, gestion de projets, facturation et rapports.

## User Personas
- **Employé**: Pointe ses arrivées/départs, gère ses absences
- **Manager**: Approuve les feuilles de temps, supervise les projets
- **Administrateur**: Gère les utilisateurs, départements, clients, activités

## Tech Stack
- **Frontend**: Expo Web (React Native Web) with expo-router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Styling**: React Native StyleSheet (web-optimized)
- **Icons**: @expo/vector-icons (MaterialIcons)

## Architecture
```
/app
├── backend/
│   └── server.py          # FastAPI with all models and routes
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx    # Root layout with AuthProvider
│   │   ├── index.tsx      # Entry redirect
│   │   ├── login.tsx      # Login page (split-panel design)
│   │   └── (app)/         # Authenticated routes
│   │       ├── _layout.tsx    # Sidebar layout
│   │       ├── index.tsx      # Dashboard (clock in/out)
│   │       ├── timesheets.tsx # Timesheet management
│   │       ├── projects.tsx   # Project management
│   │       ├── leaves.tsx     # Leave management
│   │       ├── profile.tsx    # User profile
│   │       ├── users.tsx      # Admin: user management
│   │       ├── departments.tsx # Admin: departments
│   │       ├── clients.tsx    # Admin: clients
│   │       └── activities.tsx # Admin: activities
│   └── src/
│       ├── context/AuthContext.tsx  # Auth state management
│       ├── services/api.ts         # API client
│       ├── components/Sidebar.tsx   # Navigation sidebar
│       └── theme/constants.ts      # Design tokens
```

## What's Implemented (Phase 1 - MVP)
- Login/Auth with JWT tokens
- Dashboard with real-time clock, clock-in/out, break management
- Weekly stats (hours, billable, overtime, days worked)
- Manager overview (employees, active today, pending entries)
- Timesheet list with filters and approve/reject actions
- Project management with CRUD and client association
- Leave management (vacation, sick, accident, training)
- User management table with role badges
- Department management
- Client management
- Activity management (billable/non-billable)
- Profile viewing and editing
- Full French localization

## Credentials
- Admin: admin@timesheet.ch / admin123

## P0 (Critical - Next)
- N/A (Phase 1 complete)

## P1 (Important - Upcoming)
- Invoice generation from billable hours
- Advanced reporting (by project, employee, period)
- Export PDF/Excel reports from UI
- START/STOP real-time timer

## P2 (Nice to Have - Future)
- Push notifications for approvals
- Audit log viewer for admins
- SaaS subscription plans (Basic, Pro, Enterprise)
- Multi-company support
- Mobile-responsive design improvements
