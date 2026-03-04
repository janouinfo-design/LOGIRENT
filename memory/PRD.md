# TimeSheet - Plateforme SaaS de Gestion du Temps

## Problem Statement
Plateforme SaaS de gestion du temps pour entreprises suisses avec pointage, gestion de projets, facturation et rapports.

## User Personas
- **Employe**: Pointe ses arrivees/departs, gere ses absences
- **Manager**: Approuve les feuilles de temps, supervise les projets
- **Administrateur**: Gere les utilisateurs, departements, clients, activites

## Tech Stack
- **Frontend**: Expo Web (React Native Web) with expo-router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Styling**: React Native StyleSheet (web-optimized)
- **Icons**: @expo/vector-icons (MaterialIcons)
- **Maps**: Leaflet.js (global script) + LeafletMap/MapPicker components

## Architecture
```
/app
├── backend/
│   └── server.py          # FastAPI with all models and routes
│   └── tests/
│       └── test_geofencing.py  # Geofencing backend tests
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx    # Root layout with AuthProvider
│   │   ├── +html.tsx      # HTML template (Leaflet CSS+JS)
│   │   ├── index.tsx      # Entry redirect
│   │   ├── login.tsx      # Login page (split-panel design)
│   │   └── (app)/         # Authenticated routes
│   │       ├── _layout.tsx    # Sidebar layout
│   │       ├── index.tsx      # Dashboard (clock in/out + geofencing)
│   │       ├── timesheets.tsx # Timesheet management
│   │       ├── projects.tsx   # Project management (with MapPicker)
│   │       ├── leaves.tsx     # Leave management
│   │       ├── profile.tsx    # User profile
│   │       ├── users.tsx      # Admin: user management
│   │       ├── departments.tsx # Admin: departments
│   │       ├── clients.tsx    # Admin: clients
│   │       └── activities.tsx # Admin: activities
│   └── src/
│       ├── context/AuthContext.tsx  # Auth state management
│       ├── services/api.ts         # API client
│       ├── components/
│       │   ├── Sidebar.tsx         # Navigation sidebar
│       │   ├── LeafletMap.tsx      # Map display (dashboard geofence)
│       │   └── MapPicker.tsx       # Interactive map (project admin)
│       └── theme/constants.ts      # Design tokens
```

## What's Implemented

### Phase 1 - MVP (Complete)
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

### Phase 2 - GPS Geofencing (Complete - March 4, 2026)
- **Mandatory project selection before clock-in** (backend + frontend)
- **GPS Geofencing on Dashboard:**
  - Project selection chips before clock-in
  - Interactive Leaflet map showing project geofence zone
  - GPS position tracking with distance calculation
  - Visual indicators: "Dans la zone" / "Hors zone" / "GPS non disponible"
  - Clock-in button blocked if outside geofence or GPS unavailable
  - Backend validates GPS coordinates with Haversine formula
- **Interactive Map in Project Admin:**
  - Click-on-map to set project GPS coordinates automatically
  - Draggable marker for fine-tuning position
  - Geofence radius circle visualization (updates with radius selection)
  - "Use my current position" button
  - Radius selector: 50m, 100m, 150m, 200m, 300m, 500m
  - GPS info displayed on project cards
- **Backend:**
  - project_id mandatory on clock-in endpoint
  - GPS geofence validation with configurable radius
  - update_project returns lat/lng/geofence_radius

## Credentials
- Admin: admin@timesheet.ch / admin123
- Manager: manager@test.ch / test123
- Employee: employe@test.ch / test123

## P0 (Critical - Next)
- N/A (Phase 2 complete)

## P1 (Important - Upcoming)
- Billable activities selection during clock-in
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
