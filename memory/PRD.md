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

## Critical Fix: Project Isolation (March 19, 2026)
Complete decontamination of LogiRent from LogiTime/LogiTrak/RentDrive:

### What was cleaned:
| Area | Contamination Found | Fix Applied |
|---|---|---|
| `backend/.env` | `JWT_SECRET=rentdrive-...`, `SENDER_EMAIL=contact@logitrak.ch` | Changed to `logirent-...` and `contact@logirent.ch` |
| `backend/database.py` | Fallbacks to `rentdrive` and `logitrak.ch` | Replaced with `logirent` values |
| `frontend/agencies.tsx` | Placeholder `logitrak.fr` | Changed to generic `api.navixy.com` |
| Database users | 5 LogiTrak accounts, 35 test accounts, 3 duplicates | All deleted |
| Database roles | `employee`, `manager` (LogiTime roles) | Removed |
| `test_database` | 312 orphan documents | Entire DB dropped |
| Migration data | Old JSON exports with contaminated data | Deleted (will be regenerated) |
| Guides | References to logitrak.ch and test_database | Updated |
| Super Admin name | "Omar Bensalem" | Corrected to "Omar El-Nouwairi" |
| Agency duplicate | `logirent-geneva` + `logirent-geneve` | Merged into one |

### Intentionally kept:
- `NAVIXY_API_URL=https://login.logitrak.fr/api-v2` (user's actual GPS service)
- Per-agency Navixy configuration in DB

## Database: logirent (post-cleanup)

| Collection | Docs | Description |
|---|---|---|
| agencies | 4 | Geneva, Lausanne, Zurich, ABICAR |
| users | 21 | 2 super_admin + 6 admin + 13 client |
| vehicles | 13 | Vehicle fleet with photos |
| reservations | 32 | 1 month of demo data |
| contracts | 22 | Signed PDF contracts |
| contract_templates | 7 | Per-agency templates |
| notifications | 13 | In-app alerts |
| payment_transactions | 26 | Stripe sessions |
| push_tokens | 3 | Push notification tokens |
| password_resets | 2 | Reset requests |

## Migration Toolkit (Secure, Modular)

| Script | Purpose | Requires sudo? |
|---|---|---|
| `env_loader.py` | Shared module: loads backend/.env and migration.env | N/A |
| `migration.env.example` | Template for Atlas credentials (copy to migration.env) | N/A |
| `01_install_mongodb.sh` | Installs MongoDB 7.0 on Ubuntu | YES |
| `02_migrate_data.sh` | Wrapper: runs migrate_to_local.py | NO |
| `migrate_to_local.py` | Core migration: Atlas -> local | NO |
| `03_update_env.sh` | Updates backend/.env with confirmation + backup | NO |
| `04_verify.sh` | 6 checks: MongoDB, data, API, login, vehicles, config | NO |
| `rollback.sh` | Restores .env backup, explains data implications | NO |
| `backup.py` | Backup/restore/reset/status | NO |
| `seed_demo.py` | Demo data seeder | NO |
| `cron_backup.sh` | Daily cron backup with 7-day rotation | NO |

## Test Credentials
- Super Admin: superadmin@logirent.ch / LogiRent2024!
- Super Admin: admin@logirent.ch / LogiRent2024!
- Agency Admin: admin-geneva@logirent.ch / LogiRent2024!
- Client: jean.dupont@gmail.com / LogiRent2024!

## Pending Issues
1. Resend Domain Verification (P2) - logirent.ch

## Upcoming Tasks
1. Execute VPS migration using new secure scripts (P0)
2. Push Notifications (P1)
3. Driver/Agent Application (P2)
4. App Store Deployment (P3)

## 3rd Party Integrations
- Stripe (Payments)
- Resend (Email) - SENDER_EMAIL: contact@logirent.ch
- Navixy (GPS Tracking) - via logitrak.fr (intentional, user's GPS service)
- OpenAI via emergentintegrations (Emergent LLM Key)
- MinIO Object Storage via emergentintegrations
