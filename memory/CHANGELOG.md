# TimeSheet Changelog

## 2026-03-04 - Phase 1 MVP Complete

### Backend
- Complete SaaS backend with FastAPI
- Models: Users, Companies, Departments, Projects, Clients, Activities, TimeEntries, Leaves, Invoices, Notifications, AuditLogs
- RESTful API endpoints for all entities
- JWT authentication with role-based access control
- Weekly/Monthly/Dashboard statistics
- PDF and Excel report generation
- Fixed: Excel report sheet title invalid character

### Frontend (Complete Rewrite)
- Migrated from broken Expo mobile app to Expo Web (desktop-first)
- Split-panel login page with branding
- Sidebar navigation with MaterialIcons
- Dashboard: Clock in/out, break management, weekly stats, manager overview
- Timesheets: Table view with filters, approve/reject actions
- Projects: Card grid with CRUD, client association
- Leaves: Request management with type selection
- Users: Table with role management, user creation
- Departments: Card grid with CRUD
- Clients: Table with CRUD
- Activities: Card grid with billable toggle
- Profile: View and edit personal info
- Full French localization

### Backend Testing
- All 15 core endpoints passing (100%)
- 25/30 comprehensive tests passing (83.3%)
- Auth, CRUD, clock in/out, approval flows verified
