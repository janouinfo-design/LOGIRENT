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

## Critical Fixes Applied

### 1. Project Isolation (March 19, 2026)
Complete decontamination of LogiRent from LogiTime/LogiTrak/RentDrive:
- .env: JWT_SECRET and SENDER_EMAIL cleaned
- database.py: Fallbacks cleaned
- DB: 44 contaminated accounts removed, test_database dropped
- Frontend: Placeholders cleaned
- Super Admin name: "Omar El-Nouwairi"

### 2. Port 8001 Conflict Resolution (March 19, 2026)
- **Root cause**: Multiple launch methods (manual uvicorn + PM2) competing for port 8001
- **Fix**: Created `scripts/backend.sh` — unified backend manager that kills any existing process before starting
- **Updated**: All scripts and guides now reference `backend.sh` instead of direct `pm2 restart`
- **Also fixed**: JWT_SECRET was too short (27 bytes < 32 minimum) → extended to 46 bytes
- **Guide rewritten**: `GUIDE_DEPLOIEMENT_VPS.md` now explicitly forbids manual `uvicorn` launches

## Migration Toolkit (Secure, Modular)

| Script | Purpose |
|---|---|
| `backend.sh` | **UNIFIED backend manager** (start/stop/restart/status/logs) |
| `env_loader.py` | Shared module: loads backend/.env and migration.env |
| `migration.env.example` | Template for Atlas credentials |
| `01_install_mongodb.sh` | Installs MongoDB 7.0 (sudo) |
| `02_migrate_data.sh` | Runs migrate_to_local.py |
| `migrate_to_local.py` | Core migration Atlas -> local |
| `03_update_env.sh` | Updates .env with confirmation |
| `04_verify.sh` | 6 verification checks |
| `rollback.sh` | Restores .env backup |
| `backup.py` | Backup/restore/reset/status |
| `seed_demo.py` | Demo data seeder |
| `cron_backup.sh` | Daily cron backup |

## Database: logirent (143 documents)

| Collection | Docs |
|---|---|
| agencies | 4 |
| users | 21 (2 super_admin + 6 admin + 13 client) |
| vehicles | 13 |
| reservations | 32 |
| contracts | 22 |
| contract_templates | 7 |
| notifications | 13 |
| payment_transactions | 26 |
| push_tokens | 3 |
| password_resets | 2 |

## Test Credentials
- Super Admin: superadmin@logirent.ch / LogiRent2024!
- Agency Admin: admin-geneva@logirent.ch / LogiRent2024!
- Client: jean.dupont@gmail.com / LogiRent2024!

## Upcoming Tasks
1. Execute VPS migration (P0)
2. Push Notifications (P1)
3. Driver/Agent Application (P2)
4. App Store Deployment (P3)
5. Resend Domain Verification (P2)
