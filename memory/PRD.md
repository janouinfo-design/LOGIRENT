# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile/Web App
- Admin Web Back-office (Super Admin & Agency Admin)
- Future: Driver/Agent App

## Core Architecture
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas (logirent) - cluster0.isugn1l.mongodb.net
- **Storage**: MinIO Object Storage (via emergentintegrations)

## Migration Status (March 18, 2026)
- **312 documents migrated** from dev → MongoDB Atlas
- **333 data corrections** applied (null safety, type normalization)
- **100% relations verified** (all references valid)
- **3 orphan records cleaned** (test data remnants)
- Backup system in place with 7-day rotation

## Database: logirent (MongoDB Atlas)

| Collection | Docs | Description |
|---|---|---|
| agencies | 15 | Rental agencies |
| users | 93 | All users (admin + client) |
| vehicles | 35 | Vehicle fleet |
| reservations | 58 | Bookings |
| contracts | 22 | Signed PDF contracts |
| contract_templates | 6 | Per-agency templates |
| notifications | 71 | In-app alerts |
| payment_transactions | 26 | Stripe sessions |
| push_tokens | 3 | Push notification tokens |
| password_resets | 2 | Reset requests |

## Scripts

| Script | Purpose |
|---|---|
| scripts/migrate.py | Full migration (export/normalize/import/verify) |
| scripts/backup.py | Backup/restore/reset |
| scripts/seed_demo.py | Insert realistic demo data |
| scripts/cron_backup.sh | Daily automated backup |
| scripts/GUIDE_MIGRATION.md | Complete documentation |
| scripts/GUIDE_DEPLOIEMENT_VPS.md | VPS deployment guide |

## Test Credentials
- Super Admin: test@example.com / password123
- Agency Admin: admin-geneva@logirent.ch / LogiRent2024
- Client: client1@test.com / test1234

## Pending Issues
1. Resend Domain Verification (P2) - logirent.ch

## Upcoming Tasks
1. Push Notifications (P1)
2. Driver/Agent Application (P2)
3. App Store Deployment (P3)
