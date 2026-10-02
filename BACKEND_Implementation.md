# VitalSync Backend Implementation (V1)

**Status:** V1 backend integration has passed the manual checks listed below. This is an interview-prototype milestone, not a claim that every item in `BACKEND.md` is complete.

**Snapshot:** `test-branch` at `b8c1f9a` (`integration 2 | Unusable`), compared with `origin/main`. The working tree also has a local modification to `backend/.env`; no secret values are included in this document.

## 1. Architecture

```text
Doctor Dashboard (Vite, localhost:5173) ─┐
                                         ├─ Django REST API (localhost:8000) ─ PostgreSQL
Patient Portal (Vite, localhost:5174) ───┘
```

- The active API is Django REST Framework in `backend/api/` and `backend/vitalsync_api/`.
- Django loads configuration from `backend/.env` and connects to PostgreSQL using `DATABASE_URL`.
- PostgreSQL itself is a separate database service. Start/check the PostgreSQL Windows service (for example, from Windows Services); pgAdmin is a client for managing the database, not the Django API.
- The React apps send bearer JWTs to Django. Django identifies the account and role from the token, then enforces patient/provider access in API views.
- PostgreSQL tables are mapped by Django models with `managed = False`. Django does not create or alter these domain tables through ordinary model migrations.
- `backend/schema.sql` is a schema snapshot for a **new, empty database**. Do not run it against the existing V1 database; its `CREATE TABLE` statements are not an upgrade script.
- `backend/src/` and the Node/Express files are leftover/legacy backend code. The integration described here runs through Django, not `npm run dev` in `backend/`.

## 2. Backend File Map

| File | Purpose / V1 change |
|---|---|
| `backend/manage.py` | Django command entry point. |
| `backend/requirements.txt` | Python dependencies for Django REST Framework, PostgreSQL, JWT, bcrypt, CORS, and dotenv. |
| `backend/.gitignore` | Ignores Python virtual environments, bytecode, test cache, and build output. |
| `backend/api/apps.py` | Django app registration. |
| `backend/api/models.py` | Unmanaged Django mappings for users, profiles, monitoring relationships, logs, goals, and messages. |
| `backend/api/authentication.py` | Validates bearer JWTs and resolves the authenticated database account. |
| `backend/api/views.py` | Health check, login, doctor registration, current-user response, and patient password change. |
| `backend/api/patients.py` | Doctor registry, patient invitation/account creation, patient detail, visibility, follow-up, archive, and reactivation. |
| `backend/api/logs.py` | Patient log create/read and authorized doctor log reads. Stores structured payloads plus UI display fields. |
| `backend/api/goals.py` | Provider-assigned goal read/write, restricted to authorized doctors; patient read-only endpoint. |
| `backend/api/personal_goals.py` | Patient-owned personal-goal create/read/update; doctor access is denied. |
| `backend/api/messaging.py` | Patient-safe provider directory and persisted patient-provider conversations. |
| `backend/api/migrations/0001_add_personal_goal_details.py` | Adds personal-goal date/instructions columns to an existing schema. It is not a full initial schema migration. |
| `backend/api/migrations/__init__.py` | Django migration package marker. |
| `backend/vitalsync_api/settings.py` | Django, PostgreSQL URL, CORS, JWT, SMTP, and Patient Portal URL configuration. Loads `backend/.env`. |
| `backend/vitalsync_api/urls.py` | Registers the `/api/...` endpoints. |
| `backend/vitalsync_api/asgi.py`, `backend/vitalsync_api/wsgi.py` | Django ASGI/WSGI entry points. |
| `backend/schema.sql` | Snapshot of the V1 PostgreSQL domain tables, including the legacy `vitals` table. Contains schema only, not patient rows. |
| `backend/src/routes/auth.ts`, `backend/src/routes/patients.ts` | Modified legacy Express routes. They are not the routes served by the current Django API. |
| `backend/.env` | Local database/JWT/SMTP settings. It is sensitive, currently locally modified, and must not be copied into this guide or shared. See Security below. |

## 3. Frontend Files Changed for Integration

### Doctor Dashboard

| File | Purpose / V1 change |
|---|---|
| `doctor-dashboard/src/lib/api.ts` | New authenticated API client for login, doctor registration, patients, logs, goals, messages, visibility, follow-up, and monitoring lifecycle. |
| `doctor-dashboard/src/App.tsx` | Replaces the local doctor-account mock with API authentication; fetches registry, providers, goals, logs, and messages; sends patient mutations to Django. The UI still has some mock overview/history content (see Remaining Work). |
| `doctor-dashboard/src/components/LoginPage.tsx` | Uses API login and registration instead of browser-only doctor registration. |
| `doctor-dashboard/src/components/RecentActivitySummary.tsx` | Reads the selected patient's logs from the API rather than local/generated log fallback data. |
| `doctor-dashboard/src/PrototypeExtras.addons.css` | Small associated UI style adjustment. |
| `doctor-dashboard/vite.config.ts` | Pins the development server to port `5173` with `strictPort: true`. |
| `doctor-dashboard/package-lock.json` | Dependency lockfile changed; no backend logic is implemented here. |

### Patient Portal

| File | Purpose / V1 change |
|---|---|
| `patient-portal/src/lib/api.ts` | New authenticated API client for patient identity, logs, goals, providers, messages, and password change. |
| `patient-portal/src/App.tsx` | Restores the authenticated patient session and requires a password change for temporary-password accounts. |
| `patient-portal/src/components/AppShell.tsx` | Connects the authenticated patient identity/logout behavior to the app shell. |
| `patient-portal/src/pages/ChangePasswordPage.tsx` | New first-login/change-password workflow backed by the API. |
| `patient-portal/src/pages/LoginPage.tsx` | Uses backend authentication. |
| `patient-portal/src/pages/HomePage.tsx` | Reads patient logs and posts new logs to the backend. |
| `patient-portal/src/pages/SummaryPage.tsx` | Uses backend log data for the patient summary. |
| `patient-portal/src/pages/GoalsPage.tsx` | Separates backend provider goals (read-only to patient) from patient-owned personal goals. |
| `patient-portal/src/pages/MessagesPage.tsx` | Uses provider directory and persisted patient-provider conversation APIs. |
| `patient-portal/src/pages/SettingsPage.tsx` | Small settings-page integration adjustment; appearance preferences remain local UI preferences. |
| `patient-portal/src/lib/storage.ts` | Deleted obsolete local mock storage for logs/goals/provider goals after those workflows moved to the API. |
| `patient-portal/vite.config.ts` | Pins the development server to port `5174` with `strictPort: true`. |
| `patient-portal/package-lock.json` | Dependency lockfile changed; no backend logic is implemented here. |

## 4. Setup on Windows

### Prerequisites

- PostgreSQL Server installed and running, with a V1-compatible database.
- Python 3.12 recommended for the checked environment.
- Node.js and npm for the two frontends.
- Local configuration in `backend/.env`. Keep secrets private; use your own local values.

### Install PostgreSQL and create a fresh V1 database

Each developer needs a local PostgreSQL server. pgAdmin is optional and is only a GUI client; installing/opening pgAdmin does not itself start the database server.

1. Install PostgreSQL for Windows from the [official PostgreSQL Windows download page](https://www.postgresql.org/download/windows/). Include PostgreSQL Server and optionally pgAdmin.
2. During setup, set a password for the `postgres` database superuser and keep it private. Use port `5432` unless that port is already occupied. Leave the PostgreSQL Windows service set to start automatically if that is appropriate for the machine.
3. Confirm the `postgresql-x64-<version>` service is running in Windows Services. You do not need to keep pgAdmin open for the service to run.
4. In pgAdmin, connect to the local server (`localhost`, port `5432`, user `postgres`) and create an empty database named `vitalsync_db` owned by `postgres`.
5. Select `vitalsync_db`, open Query Tool, load `backend/schema.sql`, and execute it against this **new, empty database only**. This creates the V1 tables. It does not add demo accounts or patient rows. It also creates the legacy `vitals` table, which Django V1 does not use.
6. Configure `backend/.env` with a `DATABASE_URL` pointing to this database and a private `JWT_SECRET`. The database password in the URL must be URL-encoded if it contains reserved URL characters.
7. From `backend/`, run `manage.py migrate` for a fresh database to create Django's built-in framework tables and migration bookkeeping, then run `manage.py check`. Do not run `schema.sql` against the existing shared V1 database. Back it up and review migrations before making changes to an existing database.
8. Start Django and confirm `http://localhost:8000/api/health` returns `"status": "ok"`.
9. On an empty database, create the first doctor through the Doctor Dashboard's **Create one** registration flow. Create patient accounts through the dashboard's **Add Patient** flow. Patient invitations require working SMTP/Ethereal configuration.

PostgreSQL is separate from the backend API: `cd backend; npm run dev` starts the legacy Express API, not PostgreSQL. V1 uses PostgreSQL Server + Django `runserver` + the two frontend dev servers.

### Do teammates need a full database dump?

No. Do not send or commit a copy of a live database: it can contain credentials, personal information, messages, or other sensitive rows. For a clean V1 setup, share the schema file `backend/schema.sql` plus this setup guide. `schema.sql` creates an empty schema; it does not contain account passwords, patient records, logs, goals, or messages. There is currently no checked-in Django development seed script. Each developer can register a doctor and create synthetic test patients through the UI. If repeatable demo rows become necessary, add a separate, reviewed fixture/seed script containing synthetic data only rather than distributing a database dump.

**Fresh-install result:** the app starts with an empty registry and no patient data; it does not copy your local V1 database. The first developer creates a doctor account with **Create one** in the Doctor Dashboard, then creates patients through **Add Patient**. Patient invitations require their own SMTP/Ethereal configuration. There are no shared starter credentials in this V1 setup.

### Backend

Start PostgreSQL separately before Django. `cd backend; npm run dev` is **not** the PostgreSQL startup command: `backend/package.json` runs `tsx watch src/index.ts`, which starts the leftover Express API (default port `5000`) and makes its own database connection. Do not start that legacy server for V1; the frontends use Django on port `8000`.

From the repository root, use the existing Windows virtual environment if it is present:

```powershell
cd backend
.\.venv-win\Scripts\python.exe manage.py check
.\.venv-win\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

If `.venv-win` does not exist on a new machine, create it and install the listed dependencies:

```powershell
cd backend
py -3.12 -m venv .venv-win
.\.venv-win\Scripts\python.exe -m pip install -r requirements.txt
.\.venv-win\Scripts\python.exe manage.py check
.\.venv-win\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Check database connectivity at `http://localhost:8000/api/health`. Expected response includes `"status": "ok"`.

Django printed a warning about 18 unapplied built-in admin/auth/contenttypes/session migrations during V1 testing. The tested API uses custom PostgreSQL tables and JWT authentication. Do not run `migrate` against the V1 database casually; first decide whether Django admin/session tables are needed and back up the database.

### Environment configuration

Django loads `backend/.env` when the process starts. Required/configurable keys include:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database>
JWT_SECRET=<private-random-secret>
DJANGO_DEBUG=true
PATIENT_PORTAL_URL=http://localhost:5174
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=<Ethereal-mailbox-user>
SMTP_PASS=<Ethereal-mailbox-password>
```

Never put real values in documentation or chat. Restart Django after changing SMTP/database/JWT environment values; an already-running process continues using the values loaded at startup. `python.terminal.useEnvFile` is not required for Django to load this file.

For patient-invitation testing, Ethereal captures outgoing email in the mailbox configured by `SMTP_USER`; use a test recipient you can access. The `PATIENT_PORTAL_URL` must match the portal's active URL.

### Frontends

Run each app in a separate terminal from the repository root:

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

Configured URLs are `http://localhost:5173` (Doctor Dashboard) and `http://localhost:5174` (Patient Portal). `strictPort` makes Vite stop with an error if that port is already occupied. Stop a duplicate server with `Ctrl+C` before starting another one; do not edit the port just to hide a duplicate process.

## 5. V1 Manual Verification Checklist

Manual acceptance testing was completed on 2026-10-02. Test-only records were removed afterward.

- [x] Django check passes; health endpoint confirms PostgreSQL connection.
- [x] Doctor login succeeds; session and database-backed registry survive refresh.
- [x] Patient login succeeds; session survives refresh.
- [x] Doctor-created patient invitation appears in the configured Ethereal mailbox and contains login email, temporary password, portal URL, and instructions.
- [x] Temporary-password patient is forced to change password; after change, the database flag is false.
- [x] Follow-up update survives refresh; the original test date was restored.
- [x] Patient food log is persisted in PostgreSQL and appears in the authorized doctor's History/summary.
- [x] Provider goal persists after refresh, appears to the patient as an assigned target, and has no patient-side edit/pause/cancel controls.
- [x] Personal goal persists for its patient, is absent from doctor UI, and doctor API access returns `403`.
- [x] Patient-to-doctor message and doctor reply persist and appear after refresh on both sides.
- [x] `Assigned Only`: unassigned doctor sees no patient; direct unauthorized reads return `404`.
- [x] `Selected Doctors`: selected test doctor sees John; removing selection removes access.
- [x] `All Doctors`: test doctor sees John; restoring `Assigned Only` removes access.
- [x] Archive removes John from active registry while patient login/data remain; reactivation restores active registry without duplication.
- [x] Second patient sees none of John's logs/goals; doctor view for that patient shows only that patient's data.
- [x] Temporary doctors, invitation test patient, and exact test logs/goals/messages were removed. John is restored to active monitoring, `Assigned Only`, with no selected doctors.

Some presentation elements remain hardcoded demo UI, including the dashboard's "Today's log" card and parts of the doctor overview/activity/monitoring-history displays. Do not treat those as persisted patient-submitted data.

## 6. Remaining Work / Checklist

These are not hidden failures in the checks above; they are outstanding integration scope or decisions from `BACKEND.md`.

- [ ] Add/agree on doctor self-profile and patient self-profile API read/update behavior; current profile pages still show hardcoded data.
- [ ] Replace or clearly isolate hardcoded doctor overview/activity/monitoring-history metrics so they cannot be mistaken for backend data.
- [ ] Get a researcher/adviser decision for provider-goal state when monitoring is archived (pause/complete/archive); do not invent a clinical transition.
- [ ] Confirm patient profile fields and edit permissions before storing height, weight, address, conditions, or other profile data.
- [ ] Decide whether food photos are deferred or need an approved upload approach; browser object URLs are not persisted.
- [ ] Decide whether password recovery is in scope; current recovery UI is a mock, not a real recovery service.
- [ ] Confirm one canonical provider-goal evaluator across both frontends; evaluation is currently frontend-side.
- [ ] Verify the log date-range/filter contract if server-side filtering is required; current doctor summary filters fetched data client-side.
- [ ] Rehearse the complete interview workflow on a fresh database and a clean machine; the `schema.sql` snapshot has not yet been validated as a full restore procedure.
- [ ] Add automated API tests for auth, access denial, patient isolation, and mutations; V1 verification above is manual.
- [ ] Do a final adviser/Feature Contract audit before calling the prototype fully complete.

## 7. Security and Data Handling

- `backend/.env` contains database, JWT, and SMTP credentials. It is tracked by Git and currently locally modified; treat its credentials as exposed if this branch was pushed/shared. Rotate them, remove the file from Git's index (an ignore rule alone does not untrack an existing file), and provide a placeholder-only `.env.example` before wider sharing. Do not paste secrets into this guide.
- A test Ethereal message may remain in the mailbox after its database test account has been deleted.
- An existing orphan `jane.doe@vitalsync.com` patient user with no patient profile was observed during testing. It was not created by the V1 acceptance test and was left untouched.
- All V1 records used in manual checks were synthetic demo/test data, not participant data.

## 8. Related Specifications

This implementation guide supplements, and does not replace, the project requirements:

- `BACKEND.md` - backend responsibilities, authority, scope, decisions, and definition of done.
- `BACKENDREADME.txt` - backend developer brief and patient temporary-password requirement.
- `WORKFLOW.md` - approved workflows.
- `ARCHITECTURE.md` - system architecture.
- `CLAUDE.md` - current prototype boundary and research constraints.
