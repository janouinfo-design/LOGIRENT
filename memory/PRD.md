# LogiRent - PRD

## What's Been Implemented

### Navixy Per-Agency Config (Feb 27, 2026)
- Each agency has its own `navixy_api_url` and `navixy_hash` fields
- Editable from Super Admin → Agences → edit pencil icon → "Configuration Navixy GPS" section
- Tracking page uses agency-specific config, falls back to global .env config
- LogiRent Geneva configured with live Navixy connection (26 trackers)

### Excel Client Import (Feb 27, 2026)
- Admin → Utilisateurs → "Importer Excel" button
- Supports .xlsx, .xls, .csv with flexible column mapping
- Default password: LogiRent2024

### AI Document Verification (Feb 26, 2026)
- GPT-5.2 Vision auto-verifies ID cards and driver's licenses
- Rejects fake/invalid documents with explanation

### Navixy GPS Integration (Feb 26, 2026)
- Real-time GPS tracking of 26 vehicles
- Admin "Suivi GPS Flotte" page with OpenStreetMap

### Document Upload Fix (Feb 26, 2026)
- Base64/JSON upload (web + native), camera option, compression

### Previously Completed
- Multi-Agency Architecture, Calendar System, Core Features (Auth, Vehicles, Reservations, Stripe, Email)

## Remaining Tasks
- P2: Notifications (in-app + push)
- P3: App Store Deployment
- P4: Driver/Agent Application
- P5: Advanced Statistics & Dashboards

## Credentials
- Super Admin: test@example.com / password123
- Client: client1@test.com / test1234
- Imported clients: LogiRent2024
