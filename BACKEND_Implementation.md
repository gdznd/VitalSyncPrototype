# VitalSync Backend Implementation (V1)

**Status:** The core V1 backend integration, persistence for existing settings/conversation controls, and patient-owned custom activity choices have passed the checks noted below. Patient profile changes, Selected Doctors manager access, inactive-monitoring behavior, doctor profile reads/updates, and doctor self-registration were checked against local PostgreSQL with synthetic changes rolled back. Migrations `0001`–`0006` are now applied to the configured development database `vitalsync_db`. Before applying `0004`–`0006`, a same-server clone `vitalsync_db_backup_20261004_0052` was created and verified by matching public table lists and row counts (10 tables, 34 rows); it is not an off-machine export. Migrations `0004`–`0006` are also present in the isolated database `vitalsync_e2e_test_20261004`. This remains an interview-prototype milestone, not a claim that every item in `BACKEND.md` is complete.

**Snapshot:** V1 baseline is `test-branch` at `28c4aa6` (`Backend Integration V1`), compared with `origin/main`. Follow-up priority and server-filtered log updates are currently uncommitted in `doctor-dashboard/src/App.tsx`, `doctor-dashboard/src/lib/api.ts`, `doctor-dashboard/src/components/RecentActivitySummary.tsx`, and `backend/api/logs.py`. Patient profile and inactive-monitoring changes have been round-trip checked against the local database.

**Current worktree update:** Hardcoded doctor activity-feed data and fabricated monitoring-history rows were removed. Monitoring episodes now reflect patient creation/reactivation, archive, and active care-focus changes; doctor notes, one-to-one doctor Team messages, and per-doctor patient reminder preferences use API endpoints and database tables. Existing doctor/patient account settings and per-conversation pin/filter controls are persisted through authenticated endpoints, and doctor defaults are used when creating patients. Built-in activity choices are served by the API; custom activity choices are stored per patient and can be used in the patient's persisted activity logs. Authenticated password changes now work for doctors and patients. Migrations `0004`–`0006` have now been applied to both the configured development database and isolated E2E database. Django checks, 33 automated tests, both frontend production builds, and targeted PostgreSQL/API smoke checks pass. After the configured-database migration, reminder GET returned `200`; doctor note create/list/delete, two-doctor Team send/read, conversation-preference persistence, and important-message payload checks passed in a rolled-back transaction. The configured database currently has one doctor, no pre-existing notes, no pre-existing Team messages, and no reminder preferences; smoke-test records were rolled back. The Django API has been restarted and `/api/health` returns `200`; browser verification remains next. The checked-in endpoint tests are mocked unit/API-view tests; earlier browser smoke checks used synthetic test records. Notification preferences do not send or schedule notifications. The new settings/activity UI flows still need browser verification.

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
| `backend/api/models.py` | Unmanaged Django mappings for users, profiles, monitoring relationships, logs, goals, messages, notes, history episodes, reminders, and account/conversation preferences. |
| `backend/api/authentication.py` | Validates bearer JWTs and resolves the authenticated database account. |
| `backend/api/views.py` | Health check, login, doctor registration, current-user response, and authenticated doctor/patient password changes. |
| `backend/api/patients.py` | Doctor registry, patient invitation/account creation, patient detail, visibility, follow-up, archive, and reactivation. The managing doctor remains authorized in `Selected Doctors`. |
| `backend/api/profiles.py` | Patient-owned profile reads/updates and reauthenticated login-email change; signed-in doctor profile reads/updates without allowing account email edits. |
| `backend/api/logs.py` | Patient log create/read and authorized doctor log reads. Supports optional validated `start_date`, `end_date`, and `type` filters. Stores structured payloads plus UI display fields. |
| `backend/api/goals.py` | Provider-assigned goal read/write, restricted to authorized doctors; preserves stored statuses and suspends updates/patient-facing goals while monitoring is inactive. |
| `backend/api/personal_goals.py` | Patient-owned personal-goal create/read/update; doctor access is denied. |
| `backend/api/messaging.py` | Patient-safe provider directory and persisted patient-provider conversations; inactive patients retain only the managing-doctor conversation. |
| `backend/api/records.py` | Authorized monitoring-history reads, doctor-private notes, one-to-one doctor Team messages, reminder preferences, and monitoring-episode lifecycle helpers. |
| `backend/api/preferences.py` | Role-specific account settings and owner-scoped conversation pin/filter preferences, with server-side access checks and input validation. |
| `backend/api/activity_types.py` | Returns built-in activity choices and reads/adds custom activity choices scoped to the authenticated patient. |
| `backend/api/migrations/0001_add_personal_goal_details.py` | Adds personal-goal date/instructions columns to an existing schema. It is not a full initial schema migration. |
| `backend/api/migrations/0002_patient_profile_fields.py` | Adds patient-editable contact and health-measure fields to an existing V1 schema. |
| `backend/api/migrations/0003_doctor_profile_phone.py` | Adds the existing Doctor Dashboard profile phone field to an existing V1 schema. |
| `backend/api/migrations/0004_persist_activity_history_and_doctor_records.py` | Adds monitoring history, doctor notes, doctor-to-doctor messages, and reminder-preference tables; backfills current monitoring episodes without inventing start dates. Applied to configured development and isolated E2E databases. |
| `backend/api/migrations/0005_persist_user_and_conversation_preferences.py` | Adds account settings and owner-scoped conversation preferences. Applied to configured development and isolated E2E databases. |
| `backend/api/migrations/0006_patient_activity_types.py` | Adds the patient-owned custom activity-choice table and case-insensitive per-patient uniqueness. Applied to configured development and isolated E2E databases. |
| `shared/goalEvaluator.ts` | Single frontend goal evaluator imported by both apps; unsupported goal/metric combinations remain unevaluated. |
| `backend/api/migrations/__init__.py` | Django migration package marker. |
| `backend/vitalsync_api/settings.py` | Django, PostgreSQL URL, CORS, JWT, SMTP, and Patient Portal URL configuration. Loads `backend/.env`. |
| `backend/vitalsync_api/urls.py` | Registers the `/api/...` endpoints, including account and conversation preferences. |
| `backend/vitalsync_api/asgi.py`, `backend/vitalsync_api/wsgi.py` | Django ASGI/WSGI entry points. |
| `backend/schema.sql` | Snapshot of the PostgreSQL domain tables for a fresh database, including history/notes/team-message/reminder and preference tables plus legacy `vitals` table. Contains schema only, not patient rows. |
| `backend/src/routes/auth.ts`, `backend/src/routes/patients.ts` | Modified legacy Express routes. They are not the routes served by the current Django API. |
| `backend/.env` | Local database/JWT/SMTP settings. It is sensitive, currently locally modified, and must not be copied into this guide or shared. See Security below. |

## 3. Frontend Files Changed for Integration

### Doctor Dashboard

| File | Purpose / V1 change |
|---|---|
| `doctor-dashboard/src/lib/api.ts` | Authenticated API client for login, doctor self-registration/profile, patients, logs, goals, patient and Team messages, notes, monitoring history, reminders, account/conversation preferences, visibility, follow-up, and monitoring lifecycle. |
| `doctor-dashboard/src/App.tsx` | Replaces local doctor-account and record mocks with API-backed registry, patient edits, providers, goals, logs, patient/Team messages, notes, monitoring history, reminder settings, and conversation preferences. Follow-up priority handles past, due-soon, future, and unset dates; the Today’s log card reads actual API logs. |
| `doctor-dashboard/src/components/DoctorSettingsPage.tsx` | Loads/saves existing doctor workspace, notification, and appearance settings through the API; clinic is persisted on the doctor profile and password changes use the authenticated API endpoint. |
| `doctor-dashboard/src/components/LoginPage.tsx` | Uses API login and registration instead of browser-only doctor registration. |
| `doctor-dashboard/src/components/DoctorProfilePage.tsx` | Loads and saves the authenticated doctor's profile through Django; account email is read-only. |
| `doctor-dashboard/src/components/RecentActivitySummary.tsx` | Reads authorized patient logs from the API and requests server-side date ranges for the selected timeframe; summary metrics remain derived in the frontend. |
| `doctor-dashboard/src/PrototypeExtras.addons.css` | Small associated UI style adjustment. |
| `doctor-dashboard/vite.config.ts` | Pins the development server to port `5173` with `strictPort: true` and permits imports from the repository's shared evaluator. |
| `doctor-dashboard/package-lock.json` | Dependency lockfile changed; no backend logic is implemented here. |

### Patient Portal

| File | Purpose / V1 change |
|---|---|
| `patient-portal/src/lib/api.ts` | Authenticated API client for patient identity, profile, logs, activity choices, goals, providers, messages, account/conversation preferences, and password change. |
| `patient-portal/src/pages/ProfilePage.tsx` | Loads/saves patient-editable fields; age derives from DOB; login-email change is separately reauthenticated. Profile-photo selection remains preview-only. |
| `patient-portal/src/App.tsx` | Restores the authenticated patient session and requires a password change for temporary-password accounts. |
| `patient-portal/src/components/AppShell.tsx` | Connects the authenticated patient identity/logout behavior to the app shell. |
| `patient-portal/src/pages/ChangePasswordPage.tsx` | New first-login/change-password workflow backed by the API. |
| `patient-portal/src/pages/LoginPage.tsx` | Uses backend authentication. |
| `patient-portal/src/pages/HomePage.tsx` | Reads and posts patient logs and loads/adds activity choices through the backend. |
| `patient-portal/src/pages/SummaryPage.tsx` | Uses backend log data for the patient summary. |
| `patient-portal/src/pages/GoalsPage.tsx` | Separates backend provider goals (read-only to patient) from patient-owned personal goals and imports the shared evaluator. |
| `shared/goalEvaluator.ts` | Canonical evaluator used by both frontends; the patient-portal assertion script covers its supported goal cases. |
| `patient-portal/src/pages/MessagesPage.tsx` | Uses provider directory and persisted patient-provider conversation and preference APIs. |
| `patient-portal/src/pages/SettingsPage.tsx` | Loads/saves existing patient appearance, accessibility, language, and notification settings through the API. Notification settings do not deliver notifications. |
| `patient-portal/src/lib/storage.ts` | Deleted obsolete local mock storage for logs/goals/provider goals after those workflows moved to the API. |
| `patient-portal/vite.config.ts` | Pins the development server to port `5174` with `strictPort: true` and permits imports from the repository's shared evaluator. |
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

Earlier manual acceptance testing was completed on 2026-10-02. The supplementary 2026-10-03 checks below used synthetic records in `vitalsync_e2e_test_20261004`; those test records remain isolated from the configured development database.

- [x] Django check passes; health endpoint confirms PostgreSQL connection.
- [x] Doctor login succeeds; session and database-backed registry survive refresh.
- [x] Doctor self-registration persists; duplicate-email registration returns `409`. The synthetic account was rolled back.
- [x] Doctor profile API unit tests cover authenticated GET/PATCH behavior, role denial, and rejection of account-email edits.
- [x] After the verified database backup, apply `0003_doctor_profile_phone.py`; live doctor profile GET/PATCH round-trip passed and its synthetic edit was rolled back.
- [x] Patient login succeeds; session survives refresh.
- [x] Doctor-created patient invitation appears in the configured Ethereal mailbox and contains login email, temporary password, portal URL, and instructions.
- [x] Temporary-password patient is forced to change password; after change, the database flag is false.
- [x] Follow-up update survives refresh; the original test date was restored. Priority follows the documented past / today-through-three-days / later rule; an unset date now explicitly maps to Low.
- [x] Patient food log is persisted in PostgreSQL and appears in the authorized doctor's History/summary.
- [x] Provider goal persists after refresh, appears to the patient as an assigned target, and has no patient-side edit/pause/cancel controls.
- [x] Personal goal persists for its patient, is absent from doctor UI, and doctor API access returns `403`.
- [x] Patient-to-doctor message and doctor reply persist and appear after refresh on both sides.
- [x] `Assigned Only`: unassigned doctor sees no patient; direct unauthorized reads return `404`.
- [x] `Selected Doctors`: selected test doctor sees John; removing selection removes access.
- [x] `All Doctors`: test doctor sees John; restoring `Assigned Only` removes access.
- [x] Archive removes John from active registry while patient login/data remain; reactivation restores active registry without duplication.
- [x] Second patient sees none of John's logs/goals; doctor view for that patient shows only that patient's data.
- [x] Doctor log API filters support validated date bounds and log type; live checks returned the expected rows and rejected malformed dates with `400`.
- [x] Doctor workspace Today’s log card reads backend records and has loading, empty, and error states instead of fabricated breakfast/sleep entries.
- [x] Applied `schema.sql` and migrations 0001–0006 on an isolated PostgreSQL database; verified migrations 0004–0006 and their tables.
- [x] Authenticated API smoke checks against that database cover JWT login, authorized/denied history reads, note create/list/delete and author isolation, Team-message send/read, reminder persistence/authorization, and archive/reactivation history.
- [x] Doctor Dashboard browser smoke checks cover login, registry, monitoring-history display, notes create/reload/delete, Team-message send/reload, and reminder persistence across reload.
- [x] Patient Portal browser smoke check created a synthetic food log, verified it after reload, then confirmed the same record appears in the authorized doctor's workspace and summary.
- [x] Temporary doctors, invitation test patient, and exact test logs/goals/messages were removed. John is restored to active monitoring, `Assigned Only`, with no selected doctors.
- [x] Isolated PostgreSQL/API transaction verified doctor and patient account-preference persistence, conversation-preference reload, doctor defaults on a newly created patient, and `404` for unauthorized patient conversation preferences; all synthetic rows were rolled back.
- [x] Isolated PostgreSQL/API transaction verified built-in activity options are served by the API, custom activity choices persist per patient, duplicate custom names are idempotent, and a saved custom choice can be used in a persisted activity log; all synthetic rows were rolled back.
- [x] Create and verify same-server clone `vitalsync_db_backup_20261004_0052` before migrating the configured database; public table lists and row counts match (10 tables, 34 rows).
- [x] Apply migrations `0004`–`0006` to `vitalsync_db`; verify all seven feature tables and all six API migration records.
- [x] Against `vitalsync_db`, smoke-test reminder GET, Notes CRUD, two-doctor Team send/read, conversation preference persistence, and important-message payloads in a rolled-back synthetic transaction.
- [x] Verify demo data was not silently inserted: the configured database currently has one doctor and no pre-existing doctor notes, Team messages, or reminder preferences.

- [x] 2026-10-04 browser verification against `vitalsync_db` passed: reminders, Notes CRUD, Important/All filters (both sides), custom activity choices, patient/doctor settings and profiles, reminder toggles, Team and patient–doctor messaging, Assigned Only/Selected/All Doctors access, patient logs on both sides, personal and provider goals, follow-up date/priority, and patient-to-patient isolation (synthetic patient VS-0031, now archived).
- Known frontend-only item (not backend): the doctor theme's visual appearance does not re-apply after a full refresh although the selected option persists.

Transient UI state remains frontend-only by design; the existing doctor/patient account settings and conversation preferences now persist. Notification preferences are stored only and do not deliver notifications. The patient profile's lifestyle overview is derived from backend logs; no fabricated global doctor activity feed or monitoring-history claims remain in the dashboard.

## 6. Remaining Work / Checklist

The four scope decisions in the supplied confirmation are settled: frontend-only canonical goal evaluation, persistence of the existing doctor public-profile editing workflow, deferred photo storage, and doctor self-registration. They are not open questions or blockers.

- [x] Back up the configured database as local clone `vitalsync_db_backup_20261003_2330`, then apply migration `0003_doctor_profile_phone.py` and verify the new column/migration record.
- [x] Verify doctor profile GET/PATCH against PostgreSQL in a rolled-back transaction; unit tests cover role denial and account-email rejection.
- [x] Verify doctor self-registration returns success and duplicate email returns `409`, then roll back the synthetic account.
- [x] Remove the hardcoded global activity feed and monitoring-history demo rows; history now reflects persisted monitoring lifecycle events.
- [x] Persist doctor notes, one-to-one doctor Team messages, and per-doctor patient reminder preferences through authorized API endpoints. Reminder preference storage does not implement push notifications.
- [x] Run Django system checks and API tests (33 tests); both frontend production builds and `git diff --check` pass.
- [x] Apply migrations `0004`–`0006` to the configured database only after creating and verifying its same-server backup; retain the isolated E2E migration rehearsal.
- [x] Persist existing doctor/patient settings and per-conversation preferences; validate role-specific fields, partial updates, malformed values, and owner access.
- [x] Rehearse migration `0005_persist_user_and_conversation_preferences.py` and verify settings writes/defaults against the isolated and configured databases.
- [x] Replace the Patient Portal activity chooser's hardcoded/default-only list with API-sourced built-ins and patient-owned custom choices; add migration `0006_patient_activity_types.py`.
- [x] Connect the Doctor Dashboard password-change control to the authenticated password-change API; patient temporary-password behavior remains supported.
- [x] Back up the configured V1 database, apply migration `0002_patient_profile_fields.py`, and verify all five new profile columns.
- [x] Create and verify the pre-migration local database clone; doctor phone/email remain excluded from the patient-safe provider DTO.
- [x] Exercise profile field update and login-email change against the migrated database in a synthetic transaction; roll back the test records afterward.
- Persistent food-photo and profile-picture storage is deferred; current selection is preview-only and must not be represented as saved data.
- [x] Verify archived patients cannot access provider-goal work or the general provider roster, goal rows/statuses remain unchanged, the managing-doctor conversation remains available, and non-managing doctors lose access.
- [x] Consolidate both frontends on `shared/goalEvaluator.ts`; all 10 evaluator assertions pass, both app builds pass, and Django only stores/returns evaluator inputs.
- [ ] Follow-up priority boundary tests (past, today, three days out, four days out, unset): the rule is computed in the doctor dashboard frontend (`followUpPriority`), not the backend, so it is outside backend test scope; it passed manual checks.
- [x] Validate `schema.sql` plus migrations 0001–0006 as a fresh-database setup in the current environment.
- [ ] Restart the local Django API and browser-test reminders, Notes, Team messaging, doctor/patient Settings, conversation filters, and activity-choice persistence after reload.
- [ ] Rehearse the complete interview workflow on a clean machine, including all Patient Portal flows and any environment-specific setup.
- [x] Automated API tests (42 total) cover authentication rejection, role denial, unauthorized-patient denial, patient-scoped log reads, and authorized-patient query composition; mutations are covered by the existing endpoint tests.
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
