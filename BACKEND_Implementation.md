# VitalSync Backend Implementation Guide

## Overview

VitalSync's connected workflows use a Django REST Framework API and PostgreSQL:

```text
Doctor Dashboard (React/Vite) ─┐
                               ├─ HTTPS-style JSON API + Bearer JWT ─ Django ─ PostgreSQL
Patient Portal (React/Vite) ───┘
```

The API is the shared persistence and authorization layer for accounts, profiles, monitoring relationships, logs, goals, messages, notes, preferences, reminders, and activity choices. It is an interview prototype using synthetic/demo data, not a production healthcare service or a system approved for real participant data.

## Prerequisites

- Windows 10/11
- Python 3.12 recommended
- PostgreSQL Server (pgAdmin is optional; it is only a database client)
- Node.js and npm for the frontends
- A local `backend/.env` copied from `backend/.env.example`, with database and secret settings
- SMTP settings for patient invitations and password-change verification

Do not commit or share `.env`, database dumps, or real credentials. Never use real patient data.

## First-time setup

### 1. Create a local PostgreSQL database

1. Install and start PostgreSQL Server. The default local port is `5432`.
2. Create an empty database, for example `vitalsync_db`.
3. Copy `backend/.env.example` to `backend/.env`, then set machine-local values:

```dotenv
DATABASE_URL=postgresql://<user>:<url-encoded-password>@localhost:5432/vitalsync_db
DJANGO_DEBUG=true
DJANGO_SECRET_KEY=<private-random-secret>
JWT_SECRET=<separate-private-random-secret>
PATIENT_PORTAL_URL=http://localhost:5174
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=<your-ethereal-login>
SMTP_PASS=<your-ethereal-password>
```

`SMTP_*` settings are needed for patient invitations and one-time password-change codes. Ethereal captures mail in the mailbox used as `SMTP_USER`; it does not deliver to the invitation's `To:` address.

The initial Django migration creates the PostgreSQL domain schema from its frozen SQL snapshot and initializes Django's framework tables. `backend/schema.sql` remains a readable schema snapshot; do not run it manually before `migrate` or over an existing database.

### 2. Install and check Django

From PowerShell at the repository root:

```powershell
cd backend
py -3.12 -m venv .venv-win
.\.venv-win\Scripts\python.exe -m pip install -r requirements.txt
.\.venv-win\Scripts\python.exe manage.py migrate
.\.venv-win\Scripts\python.exe manage.py check
```

For a fresh database, `migrate` creates the API schema and Django framework tables. Migration `0000_initial_domain_schema` replaces the previously applied `0001`–`0006` history when Django detects those migrations are already present; `0007` adds the password-change verification table; `0008` records the unmanaged Django model state without creating duplicate tables. Do not run migrations against a shared/existing database without a backup and review.

### 3. Start the API

Keep PostgreSQL running. From `backend/`:

```powershell
.\.venv-win\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Open `http://localhost:8000/api/health`. A healthy response includes `"status": "ok"`.

### 4. Start the frontends when needed

Use separate terminals from the repository root:

```powershell
cd doctor-dashboard
npm install
npm run dev
```

```powershell
cd patient-portal
npm install
npm run dev
```

The dashboard is at `http://localhost:5173`; the patient portal is at `http://localhost:5174`. Install frontend packages only the first time or after dependency changes.

## Supabase-hosted PostgreSQL preparation

The deployment architecture remains React/Vite → Django/DRF → PostgreSQL. Supabase is the PostgreSQL host only; the applications continue to call Django, and no Supabase client, authentication, or data API is introduced.

Before an explicitly approved deployment:

1. Set `DATABASE_URL` from the Supabase PostgreSQL connection settings. Keep the URL private; include `sslmode=require` when required by the chosen Supabase endpoint.
2. Set `DJANGO_DEBUG=false`, a unique `DJANGO_SECRET_KEY`, and a separate unique `JWT_SECRET`. Django refuses to start with debug disabled if the Django secret is missing.
3. Set `DJANGO_ALLOWED_HOSTS` to the API host, `CORS_ALLOWED_ORIGINS` to the deployed frontend origins, and `CSRF_TRUSTED_ORIGINS` where required.
4. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USE_TLS`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` for patient invitations and password-change verification email.
5. Review `manage.py migrate --plan`, back up any existing database, and apply Django migrations only after approval.

**Current status (development Supabase project, empty/synthetic data only):**

- IMPLEMENTED: a Supabase project hosts the development PostgreSQL database. Django connects through the Session pooler (port 5432, `sslmode=require`) and migrations `api` 0000 (squashed), 0007 and 0008 are applied. Doctor registration and patient creation with an invitation email (Ethereal test SMTP) were exercised against it.
- VERIFIED (reported by the backend tester): the manual browser workflow (logs, goals, messaging, visibility, archive/reactivate) was run against Supabase. The Supabase database password was reset after it was exposed during setup, and `DATABASE_URL` was updated.
- NOT DONE: `DJANGO_SECRET_KEY` and `JWT_SECRET` are still placeholders. No hosted Django/frontend deployment exists; the backend runs locally.
- The previous local PostgreSQL database was not migrated into Supabase (fresh start); a local backup exists outside the repository.
- No real participant data is stored. Real data requires the ethics and research-ready requirements above.

### Connecting a new device to the shared Supabase database

The database lives online, so a new device only needs the code and the connection details. Do not run a new Supabase setup or create another project.

1. Clone the repository and check out `test-branch`.
2. In `backend/`, create the virtual environment and install dependencies:
   `py -3.12 -m venv .venv-win`, then `.\.venv-win\Scripts\python.exe -m pip install -r requirements.txt`.
3. Copy `backend/.env.example` to `backend/.env`. `.env` is gitignored, so it never comes with the clone.
4. Get the `DATABASE_URL` (Supabase Session pooler, port 5432, ending in `?sslmode=require`) and the SMTP settings from the project owner through a private channel. Do not commit them, paste them into chats, or share screenshots of them.
5. Do **not** run `manage.py migrate` unless a new migration was added. The tables already exist on Supabase. Check with `manage.py migrate --plan`; it should report nothing to apply.
6. Run `manage.py check`, then `manage.py runserver 127.0.0.1:8000`, then start both frontends as described in Daily startup.

Everyone using the same `DATABASE_URL` shares the same data. If the Supabase password is reset, every device must update its `.env`. Supabase free-tier projects may require the connecting network to allow outbound port 5432.

## Daily startup

1. Start the PostgreSQL Windows service (for example, from Windows Services).
2. Start Django from `backend/`:

```powershell
.\.venv-win\Scripts\python.exe manage.py check
.\.venv-win\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

3. Optionally start the Doctor Dashboard and Patient Portal using `npm run dev` in their folders.
4. Confirm the health endpoint responds before testing connected workflows.

Do **not** use `npm run dev` inside `backend/` to start the active backend. That command starts leftover Express code, not PostgreSQL or the Django REST API.

## How a request is handled

1. A frontend API client sends JSON to `http://localhost:8000/api/...`; authenticated requests include `Authorization: Bearer <token>`.
2. Login checks the submitted credentials against the PostgreSQL account record and returns a signed JWT.
3. `VitalSyncJWTAuthentication` validates the token, loads the account and role, and makes the authenticated account available to the API view.
4. The view validates the request, applies role and patient/doctor visibility rules, then reads or writes PostgreSQL through Django models.
5. The API serializes the result as JSON; the frontend updates its view from that response.

Temporary-password patients are blocked from all other protected resources by `VitalSyncJWTAuthentication`, not only by the Patient Portal routes. They can read their session and use the email-code/password-change endpoints until the backend records a new password.

PostgreSQL is the persistent data store. Django REST Framework is the API and authorization layer. The two React apps are clients; local browser state is not the source of truth for connected records.

## Important code paths

**Login signs a short-lived JWT** (`backend/api/views.py`):

```python
token = jwt.encode(
    {"id": account.id, "email": account.email, "role": account.role,
     "iat": issued_at, "exp": issued_at + timedelta(hours=24)},
    settings.JWT_SECRET,
    algorithm="HS256",
)
```

The frontend stores the returned token and sends it on authenticated API requests.

**Authentication resolves the account from the token** (`backend/api/authentication.py`):

```python
claims = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
account = UserAccount.objects.get(id=claims["id"], role=claims["role"])
return account, claims
```

Invalid or expired tokens are rejected. API views separately enforce the role and resource-level access.

**Patient logs are scoped to the signed-in patient or an authorized doctor** (`backend/api/logs.py`):

```python
patient = PatientProfile.objects.filter(user_id=request.user.id).first()
logs = LifestyleLog.objects.filter(patient_id=patient.id)
```

For doctor reads, the API first checks the requested patient against the doctor's authorized patient IDs; unauthorized patient records return `404`. The same principle is applied across other protected resources.

**The frontend API client adds the bearer token** (`doctor-dashboard/src/lib/api.ts`; the Patient Portal has its own client):

```typescript
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
```

## Files changed: where to look

This is a practical map of the integration, not a full Git change log.

| Area | Main files | Why they changed |
|---|---|---|
| Django API | `backend/api/views.py`, `patients.py`, `profiles.py`, `logs.py`, `goals.py`, `personal_goals.py`, `messaging.py`, `records.py`, `preferences.py`, `activity_types.py` | Implement login and account flows, persistence, validation, serialization, and role/ownership/visibility checks for connected features. |
| Django configuration and schema | `backend/api/models.py`, `backend/api/authentication.py`, `backend/api/migrations/0000`, `0007`, `0008`, `backend/vitalsync_api/settings.py`, `urls.py`, `backend/schema.sql` | Map PostgreSQL tables, restrict temporary-password JWTs, configure the API from environment variables, register endpoints, and provide initial, incremental, and state-only migrations. |
| Doctor Dashboard | `doctor-dashboard/src/lib/api.ts`, `App.tsx`, `components/DoctorSettingsPage.tsx`, `components/DoctorProfilePage.tsx`, `components/LoginPage.tsx`, `components/RecentActivitySummary.tsx` | Replace browser-only/fabricated data with API reads and writes; keep authorized doctor workflows and settings connected to the backend. |
| Patient Portal | `patient-portal/src/lib/api.ts`, `App.tsx`, `components/AppShell.tsx`, `pages/LoginPage.tsx`, `ProfilePage.tsx`, `HomePage.tsx`, `SummaryPage.tsx`, `GoalsPage.tsx`, `MessagesPage.tsx`, `SettingsPage.tsx`, `ChangePasswordPage.tsx`, `lib/storage.ts` | Connect authentication, patient profile/logs/goals/messages/settings to the API and remove obsolete local mock storage. |
| Shared behavior | `shared/goalEvaluator.ts`, `shared/logMetrics.ts` | Keep supported goal evaluation and structured activity/sleep metrics consistent across both frontends; Django stores and returns the goal/log payloads. |
| Developer/research docs | `BACKEND.md`, `BACKEND_Implementation.md`, `BACKENDREADME.txt`, `WORKFLOW.md`, `ARCHITECTURE.md`, `CLAUDE.md` | Keep the requirements, workflows, architecture, prototype boundaries, and setup/verification guidance aligned. This implementation guide explains how to run and understand the current integration; it does not replace the feature contract or research approvals. |

## Demo accounts and a safe demo flow

There are **no shared starter accounts, seeded demo users, or universal passwords**. A fresh database is empty:

1. Open the Doctor Dashboard and register the first synthetic doctor using **Create one**. Use an email/password you control locally; there is no built-in default password.
2. Sign in as that doctor and use **Add Patient** to create a synthetic patient. The patient invitation contains the patient login and temporary password.
3. For invitation and password-change testing, check the Ethereal mailbox configured by `SMTP_USER` (not the test recipient's Ethereal address). At first login, the patient must request and verify the emailed code before setting a password.
4. Sign in to the Patient Portal with the invitation credentials, then verify that patient logs/messages/goals are private to that patient and that the authorized doctor sees only accessible records.
5. Use only synthetic records. Archive test patients when finished; do not place reusable passwords or local database credentials in this guide.

Accounts created in one developer's local database do not exist in a teammate's fresh database. Create local demo accounts rather than sharing a database dump or relying on credentials from another machine.

## Verification and current boundaries

- Django system check passes; the focused backend test suite has **58 passing tests**, including login/registration, patient provisioning, authorization, lifecycle, ownership, messaging, structured logs, temporary-password enforcement, and the email-code password-change flow.
- The 2026-10-04 manual browser run passed the 20 persistence, authorization, and cross-role checks recorded during integration, including patient-to-patient isolation.
- Notification preferences persist but do not send notifications. General password recovery, photo storage, offline sync, real-time updates, push notifications, and a doctor mobile app are not implemented.
- The doctor's selected theme preference persists, but the visual theme does not re-apply after a full browser refresh; that is a frontend issue.
- Clean-machine rehearsal and the adviser/Feature Contract audit remain group/research checks, not backend implementation blockers.
- This prototype is not approved for real participant data. Research/ethics requirements and system-readiness review must be satisfied first.

For feature requirements and decisions, see `BACKEND.md`. For approved workflow and system context, see `WORKFLOW.md`, `ARCHITECTURE.md`, and `CLAUDE.md`.

---

## Quick summary checklist: backend additions and V1 → V2 changes

In this checklist, **V1** and **V2** refer to the project's first and second implementation iterations (the work before and after the two implementation sessions). They do not name backend technologies or releases. This guide describes the current Django REST Framework + PostgreSQL implementation.

### Backend capabilities added or connected

- [x] Django REST Framework API connected to PostgreSQL.
- [x] JWT login for doctor and patient accounts, doctor self-registration, patient registered-email one-time-code password change, and current-password-confirmed doctor password change. Temporary-password patients are restricted from protected resources until completion.
- [x] Persistent patient and doctor profiles, patient registry, doctor/patient authorization, visibility settings, follow-up dates, and archive/reactivation.
- [x] Persistent patient lifestyle logs, provider-assigned goals, and patient-owned personal goals.
- [x] Persistent patient–doctor conversations, doctor-to-doctor Team messages, doctor notes, and monitoring history.
- [x] Persistent account settings, per-conversation preferences, doctor reminder preferences, and patient-owned custom activity choices.
- [x] Server-checked access rules keep patient records scoped to the patient and authorized doctors.
- [x] Django initial/squashed migration, incremental migration 0007, and state-only migration 0008 support fresh-database schema creation, existing-database upgrades, and migration-state consistency; `backend/schema.sql` remains a reference snapshot.
- [x] Focused API tests and earlier browser verification cover contract-critical persistence and authorization flows; current API tests use mocked persistence rather than a cloud/database deployment.

### Main changes from V1 to V2

- [x] Replaced browser-only/mock data for connected workflows with authenticated API reads and writes.
- [x] Replaced fabricated dashboard activity/history with persisted records and monitoring lifecycle data.
- [x] Added database persistence for workflows that previously existed only in app state, including settings, conversation controls, notes, reminders, Team messages, and custom activity choices.
- [x] Added server-side role, ownership, and doctor–patient visibility enforcement rather than relying on frontend filtering alone.
- [x] Kept the two React frontends as clients and placed shared persistence/authentication in Django + PostgreSQL.
- [x] Preserved explicitly deferred features as out of scope: general password recovery, push-notification delivery, photo storage, offline sync, real-time updates, and a doctor mobile app.

All study-facing records must remain synthetic/demo data until research and ethics requirements are met.
