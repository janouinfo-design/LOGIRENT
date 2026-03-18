# LogiRent - Product Requirements Document

## Original Problem Statement
Build a complete car rental solution named "LogiRent" with:
- Client Mobile/Web App
- Admin Web Back-office (Super Admin & Agency Admin)
- Future: Driver/Agent App

## Core Architecture
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (local on VPS or Atlas)
- **Storage**: MinIO Object Storage (via emergentintegrations)

## Migration Toolkit (Updated March 18, 2026)
Fully refactored migration scripts — secure, modular, step-by-step:

| Script | Purpose | Requires sudo? |
|---|---|---|
| `env_loader.py` | Shared module: loads backend/.env and migration.env | N/A |
| `migration.env.example` | Template for Atlas credentials (copy to migration.env) | N/A |
| `01_install_mongodb.sh` | Installs MongoDB 7.0 on Ubuntu | YES |
| `02_migrate_data.sh` | Wrapper: runs migrate_to_local.py | NO |
| `migrate_to_local.py` | Core migration: Atlas → local (reads from migration.env) | NO |
| `03_update_env.sh` | Updates backend/.env with confirmation + backup | NO |
| `04_verify.sh` | 6 checks: MongoDB, data, API, login, vehicles, config | NO |
| `rollback.sh` | Restores .env backup, explains data implications | NO |
| `backup.py` | Backup/restore/reset/status (reads backend/.env) | NO |
| `seed_demo.py` | Demo data: 2 agencies, 12 users, 12 vehicles, 31 reservations | NO |
| `cron_backup.sh` | Daily cron backup with 7-day rotation | NO |

### Security improvements (v2):
- Zero hardcoded credentials in any script
- Atlas URL read from `scripts/migration.env` (gitignored)
- All Python scripts load from `backend/.env` via `env_loader.py`
- No dangerous fallbacks (no Atlas URL, no `test_database`)
- Step-by-step execution (no monolithic root script)
- Confirmation prompts before destructive operations
- Automatic .env backup before modification

## Database: logirent

| Collection | Docs | Description |
|---|---|---|
| agencies | 4 | Rental agencies |
| users | 66 | All users (admin + client) |
| vehicles | 13 | Vehicle fleet |
| reservations | 58 | Bookings |
| contracts | 22 | Signed PDF contracts |
| contract_templates | 6 | Per-agency templates |
| notifications | 75 | In-app alerts |
| payment_transactions | 26 | Stripe sessions |
| push_tokens | 3 | Push notification tokens |
| password_resets | 2 | Reset requests |

## Test Credentials
- Super Admin: superadmin@logirent.ch / LogiRent2024!
- Agency Admin: admin-geneva@logirent.ch / LogiRent2024!
- Client: jean.dupont@gmail.com / LogiRent2024!

## Pending Issues
1. Resend Domain Verification (P2) - logirent.ch

## Upcoming Tasks
1. Push Notifications (P1)
2. Driver/Agent Application (P2)
3. App Store Deployment (P3)

## 3rd Party Integrations
- Stripe (Payments)
- Resend (Email)
- Navixy (GPS Tracking)
- OpenAI via emergentintegrations (Emergent LLM Key)
- MinIO Object Storage via emergentintegrations
