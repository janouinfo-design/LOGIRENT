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

## Critical Fixes Applied (March 19, 2026)

### 1. Project Isolation (LogiRent vs LogiTime)
- Cleaned all contamination from LogiTrak/RentDrive in .env, database.py, DB data
- 44 contaminated accounts removed, test_database dropped

### 2. Port 8001 Conflict
- Created `scripts/backend.sh` — unified backend manager
- All scripts and guides updated to use it

### 3. Environment Consistency (Local vs VPS vs Production)
Root cause found and fixed:
- `NewClientModal.tsx` and `contract-template.tsx` used wrong env var (`EXPO_PUBLIC_API_URL || REACT_APP_BACKEND_URL`) instead of `EXPO_PUBLIC_BACKEND_URL`
- Both files migrated to use centralized `api` from `axios.ts`
- `email.py` hardcoded URL `https://logirent.ch` → now reads `APP_URL` from env
- Added `GET /api/version` endpoint for deployment verification
- Created `scripts/check_deploy.sh` — verifies git sync, env, services, data
- Created `scripts/WORKFLOW_DEPLOIEMENT.md` — step-by-step GitHub → VPS guide

### Files Modified:
- `frontend/src/components/agency/NewClientModal.tsx` — migrated from fetch+wrong env to axios
- `frontend/app/agency-app/contract-template.tsx` — migrated from fetch+wrong env to axios
- `backend/server.py` — added /api/version endpoint
- `backend/utils/email.py` — app_url configurable via env

### New Files:
- `scripts/check_deploy.sh` — deployment verification
- `scripts/WORKFLOW_DEPLOIEMENT.md` — deployment workflow

## Migration Toolkit

| Script | Purpose |
|---|---|
| `backend.sh` | Unified backend manager (start/stop/restart/status/logs) |
| `check_deploy.sh` | Deployment coherence verification |
| `env_loader.py` | Shared .env loader |
| `01_install_mongodb.sh` | Installs MongoDB 7.0 (sudo) |
| `02_migrate_data.sh` | Runs migration |
| `migrate_to_local.py` | Core migration Atlas -> local |
| `03_update_env.sh` | Updates .env with confirmation |
| `04_verify.sh` | Post-migration checks |
| `rollback.sh` | Restores .env backup |
| `backup.py` | Backup/restore/reset/status |
| `seed_demo.py` | Demo data seeder |
| `cron_backup.sh` | Daily cron backup |

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
