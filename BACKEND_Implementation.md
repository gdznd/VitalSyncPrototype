# VitalSync Backend: Setup, Daily Use, and Deployment

## 1. How the system fits together

```text
Doctor Dashboard (React/Vite) ─┐
                               ├─ HTTPS JSON API ─> Django REST Framework on Render ─> PostgreSQL on Supabase
Patient Portal (React/Vite) ───┘                              │
                                                             └─ HTTPS email API ─> Brevo
```

| Part | Responsibility | Current location |
|---|---|---|
| Doctor Dashboard | Doctor-facing UI; calls Django for connected data | Local during development; Vercel planned |
| Patient Portal | Patient-facing UI; calls Django for connected data | Local during development; Vercel planned |
| Django REST Framework | Login, JWT authentication, authorization, validation, business rules, and database access | Render: `https://vitalsync-django-api.onrender.com` |
| PostgreSQL | Persistent application data | Supabase |
| Brevo | Sends patient invitation and password-change verification emails | Called by Django over HTTPS |

The frontends must call Django, not Supabase directly. Supabase credentials, Django/JWT secrets, and the Brevo API key are backend-only secrets. A frontend developer only needs the public Django API URL.

This is a synthetic/demo prototype. It is not approved for real participant or clinical data.

### What the three hosted platforms are for

- **Render — runs the Django API.** Use its dashboard to view deploys/logs, restart or redeploy the service, and manage backend environment variables. It does not host the PostgreSQL database.
- **Supabase — hosts PostgreSQL.** Use its dashboard to inspect/manage the database, review migration state, and manage database access. Django is the only application component that should connect to it; do not put database credentials in either frontend.
- **Brevo — delivers transactional email.** Use it to verify the sender and manage the email API key. Django calls Brevo for patient invitations and password-change codes; Brevo does not host the app or database.

The request flow is: frontend → Render/Django → Supabase for data; for email, Django → Brevo. A frontend-only teammate normally needs none of the three provider dashboards.

## 2. Current deployment status

- [x] Django API deployed to Render; health endpoint returns `status: ok` and a database timestamp.
- [x] Render Django API connects to the Supabase PostgreSQL database.
- [x] Supabase schema migrations are applied. Supabase is the database host; it is not running the Django API.
- [x] Automated backend suite: 60 tests pass; Django system check and static collection pass.
- [x] Reported manual Render checks: doctor login/registry, patient-to-doctor data round trip, patient isolation, visibility, goals, messaging, archive/reactivate, invitation email, and password-change verification email.
- [x] Both local frontends have an ignored `.env.local` configured to call the Render API.
- [ ] Confirm any credentials exposed in earlier screenshots/messages have been rotated or revoked; update Render/local configuration with the replacements.
- [ ] Deploy both frontends to Vercel. Afterward update Render's `CORS_ALLOWED_ORIGINS` and `PATIENT_PORTAL_URL` to the exact deployed URLs.
- [ ] Before any research use, meet the ethics, privacy, security, and research-ready requirements. Until then, use only synthetic/demo data.

The live API base URL to give the frontend team is:

```text
https://vitalsync-django-api.onrender.com/api
```

Render's Free web service can sleep after inactivity; the first request after sleep may be delayed. Use this deployment for demo/testing, not as a production healthcare service.

## 3. Inviting teammates to service accounts

Only invite a teammate when their task requires access to that provider's dashboard. Frontend developers can build and test against the public API URL; they do not need Supabase database credentials, the Brevo API key, or Render environment-variable access. Never share an owner's login or send secrets in chat.

### Render

The current Render Hobby/Free workspace does **not** support adding team members. Do not share the Render login. The workspace owner can manage deployments and environment variables; frontend teammates can work through GitHub and use the API URL. If multiple people must administer the Render service, review the current workspace plan and upgrade only if the team approves the cost, then invite their individual accounts from workspace **Settings → Team members** with the least-privileged role available. See [Render team members](https://render.com/docs/team-members).

Use the Render dashboard when deploying the Django service, checking build/runtime logs, or changing its environment variables. Keep all backend secrets in that service's environment settings; do not add them to frontend settings or Git.

### Supabase

Invite a teammate using their own Supabase account from the organization **Team** settings. Choose the narrowest role the plan supports. Supabase project-scoped roles are plan-limited; on plans without that option, an organization-level role may grant broader access than intended. Only the backend/database maintainer should need dashboard access, and access to the dashboard does not mean sharing the database password. See [Supabase access control](https://supabase.com/docs/guides/platform/access-control).

To invite: open the Supabase organization dashboard, go to **Organization Settings → Team**, invite the teammate's own account email, and choose the least-privileged role available on the current plan. Confirm the scope before sending: organization-wide access can expose other projects too. Do not share the database password as a substitute for an invitation.

### Brevo

If a teammate must manage sender verification or transactional-email settings, invite their individual account through Brevo's user/team access settings if available on the current plan. Give only the access required for that task. Keep the API key in Render; do not share it with frontend developers. If the plan does not support suitable separate users, have the account owner manage Brevo. Verify current plan permissions in Brevo before inviting.

Use Brevo to verify the sender address/domain and create or revoke API keys. Put the key only in Render's `BREVO_API_KEY` environment variable. A teammate does not need the API key to build or configure a frontend.

When a teammate leaves or no longer needs access, remove their provider-account membership and rotate any secret they were authorized to use if it may have been exposed.

## 4. First-time setup on a developer device

### Requirements

- Git and Node.js/npm compatible with the Vite projects.
- Python 3.12 is recommended only if you need to run or test Django locally.
- Access to the repository and the public API URL.

### Set up the local frontends to use the deployed API

Clone the repository and check out the shared working branch (currently `test-branch`). In **each** frontend folder, create a file named `.env.local`:

`doctor-dashboard/.env.local`

`patient-portal/.env.local`

Put this in both files:

```dotenv
VITE_API_BASE_URL=https://vitalsync-django-api.onrender.com/api
```

Save the files. They are intentionally gitignored and must be created separately on each developer device. Do not put a database URL, Django secret, JWT secret, or Brevo key in a frontend environment file.

Install each frontend's dependencies once (or again after dependency changes):

```powershell
cd doctor-dashboard
npm ci
```

```powershell
cd patient-portal
npm ci
```

`package-lock.json` files are committed, so `npm ci` installs the recorded dependency versions.

## 5. Daily use: local frontends + hosted backend

The usual current workflow does **not** need local PostgreSQL or a local Django server. Render runs Django and Django connects to Supabase online.

Open two terminals from the repository root:

```powershell
cd doctor-dashboard
npm run dev
```

```powershell
cd patient-portal
npm run dev
```

Open:

- Doctor Dashboard: `http://localhost:5173`
- Patient Portal: `http://localhost:5174`
- API health check: `https://vitalsync-django-api.onrender.com/api/health`

Vite reads `.env.local` only at startup. If you edit it while a dev server is running, stop that server with `Ctrl+C` and run `npm run dev` again.

The current Render CORS setting permits the local frontend origins above. Browser requests go from the local frontend to the remote Render API, then Django reads/writes Supabase. Email is sent by Django through Brevo. Reload the page to verify persisted changes.

## 6. Optional: run Django locally

Only do this when you are developing or debugging the backend itself. The local frontends normally use Render as described above.

From `backend/`, create a Python virtual environment, install backend requirements, and make a private `.env` from the tracked example:

```powershell
cd backend
py -3.12 -m venv .venv-win
.\.venv-win\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` with private, machine-specific values. At minimum provide separate `DJANGO_SECRET_KEY` and `JWT_SECRET` values and a valid `DATABASE_URL`. For a local Django server that sends email, configure the SMTP fields for a test mail service such as Ethereal. Never commit or share this file.

To use the local Django server, set `VITE_API_BASE_URL=http://localhost:8000/api` in both frontend `.env.local` files, restart both Vite servers, then run:

```powershell
.\.venv-win\Scripts\python.exe manage.py check
.\.venv-win\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

The API health URL is `http://localhost:8000/api/health`. Django's development server is for local development only; Render uses Gunicorn.

### Database migration safety

The shared Supabase database is already migrated. Do **not** run `migrate` as part of daily startup, on every developer device, or in Render's build command.

When a backend change adds or alters a model/field:

1. Create and review the migration in development.
2. Back up the intended database and review `manage.py migrate --plan`.
3. Coordinate with the backend owner, then apply the migration to Supabase once.
4. Other developers pull the code; they do not re-apply an already recorded migration.

`backend/schema.sql` is a reference snapshot, not a script to run manually over the existing database.

## 7. Render configuration reference

The existing Render Web Service uses:

| Setting | Value |
|---|---|
| Repository branch | `test-branch` |
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt && python manage.py collectstatic --no-input` |
| Start Command | `gunicorn vitalsync_api.wsgi:application --bind 0.0.0.0:$PORT` |

Render environment variables are entered in the Render dashboard, not committed to Git:

| Variable | Purpose |
|---|---|
| `DJANGO_DEBUG=false` | Production debug setting |
| `DJANGO_SECRET_KEY` | Private Django signing secret |
| `JWT_SECRET` | Separate private token-signing secret |
| `DATABASE_URL` | Private Supabase Session pooler PostgreSQL URL (port 5432, SSL required) |
| `DJANGO_ALLOWED_HOSTS` | Render API hostname, without `https://` |
| `DJANGO_SECURE_SSL_REDIRECT=true` | Require HTTPS |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact frontend origins; currently local origins, later the Vercel origins |
| `EMAIL_BACKEND=api.email_backend.BrevoEmailBackend` | Send hosted email through Brevo HTTPS API |
| `BREVO_API_KEY` | Private Brevo API key |
| `EMAIL_FROM_ADDRESS` | Verified sender email configured in Brevo |
| `PATIENT_PORTAL_URL` | Patient portal URL used in invitation email; currently local, later the Vercel URL |
| `CSRF_TRUSTED_ORIGINS` | Set exact HTTPS origins only if a CSRF-protected browser flow requires them |

Never expose or paste secret values into chat, screenshots, source code, frontend variables, or Git. Rotate any credential that has been exposed.

## 8. Email flow

- Local Django development can use Django's SMTP email backend and a test mailbox such as Ethereal.
- The deployed Render service uses `api.email_backend.BrevoEmailBackend`, which calls Brevo's transactional email endpoint over HTTPS.
- Both patient invitations and password-change verification codes use Django's configured email backend.
- The sender address must be verified in Brevo. The Brevo API key belongs only in Render's `BREVO_API_KEY`.
- Render Free blocks common outbound SMTP ports, which is why hosted email uses the HTTPS API rather than Ethereal SMTP.

## 9. Gitignored files and dependencies

These files/folders are local or generated and are not shared through Git:

| Path/pattern | Why ignored | Tracked alternative |
|---|---|---|
| `backend/.env`, `backend/.env.*` | Private backend configuration/secrets | `backend/.env.example` is deliberately unignored and safe of real credentials |
| `backend/.venv*/` | Local Python virtual environments | Install from `backend/requirements.txt` |
| `backend/__pycache__/`, `*.py[cod]`, `.pytest_cache/`, `backend/staticfiles/`, `dist/` | Python/test/build output | Regenerate with Python tools or `collectstatic` |
| `doctor-dashboard/node_modules/`, `dist/`, `*.local` | Frontend dependencies, build output, and local env files (including `.env.local`) | `package.json` and `package-lock.json`; create `.env.local` on each device |
| `patient-portal/node_modules/`, `dist/`, `.env*.local` | Frontend dependencies, build output, and local env files | `package.json` and `package-lock.json`; create `.env.local` on each device |

Install frontend dependencies with `npm ci` in each frontend directory. Install Django dependencies with `python -m pip install -r requirements.txt` in the backend virtual environment. Do not commit virtual environments, `node_modules`, generated static/build output, `.env` files, database dumps, or secrets.

## 10. Feature scope and safe use

Implemented connected workflows include authentication, profiles, patient registry, visibility/authorization, logs, provider and personal goals, messages, notes, preferences, custom activity choices, reminders, monitoring history, and archive/reactivation.

Not implemented: general password recovery, notification delivery, profile-photo storage, offline sync, real-time updates, push notifications, doctor mobile app, or clinical diagnosis/decision support. The rule-based "Your Journey" text is not AI, NLP, or clinical prediction.

All study-facing records must remain synthetic/demo data until ethics approval and all research-ready requirements are met.

For feature requirements and decisions, consult [BACKEND.md](./BACKEND.md), [WORKFLOW.md](./WORKFLOW.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and [CLAUDE.md](./CLAUDE.md).
