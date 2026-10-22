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
| Doctor Dashboard | Doctor-facing UI; calls Django for connected data | Local development and Vercel Production: `https://vital-sync-prototype-doctor-dashboard.vercel.app/` |
| Patient Portal | Patient-facing UI; calls Django for connected data | Local development and Vercel Production: `https://vital-sync-prototype-patient-portal.vercel.app/` |
| Django REST Framework | Login, JWT authentication, authorization, validation, business rules, and database access | Render service `vitalsync-nlp-test-api` |
| PostgreSQL | Persistent application data | Supabase |
| Brevo | Sends patient invitations, password-change codes, and doctor-registration verification emails | Called by Django over HTTPS |

The frontends must call Django, not Supabase directly. Supabase credentials, Django/JWT secrets, and the Brevo API key are backend-only secrets. A frontend developer only needs the public Django API URL.

This is a synthetic/demo prototype. It is not approved for real participant or clinical data.

### What the three hosted platforms are for

- **Render — runs the Django API.** Use its dashboard to view deploys/logs, restart or redeploy the service, and manage backend environment variables. It does not host the PostgreSQL database.
- **Supabase — hosts PostgreSQL.** Use its dashboard to inspect/manage the database, review migration state, and manage database access. Django is the only application component that should connect to it; do not put database credentials in either frontend.
- **Brevo — delivers transactional email.** Use it to verify the sender and manage the email API key. Django calls Brevo for patient invitations, password-change codes, and doctor-registration verification; Brevo does not host the app or database.

The request flow is: frontend → Render/Django → Supabase for data; for email, Django → Brevo. A frontend-only teammate normally needs none of the three provider dashboards.

### Core backend code, in plain language

The browser sends an HTTP request to Django. Django checks the request and the signed-in account, uses Django's ORM to read or write PostgreSQL, then returns JSON. These are the main pieces of that path:

#### 1. Database connection — configuration, not the database itself

In [`settings.py`](./backend/vitalsync_api/settings.py):

```python
DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL"),
        conn_max_age=int(os.getenv("DB_CONN_MAX_AGE", "60")),
        conn_health_checks=True,
    )
}
```

**What it does:** Django reads `DATABASE_URL` from the private backend environment and uses it for database connections. Locally it can point to local PostgreSQL; Render points to the hosted Supabase PostgreSQL database. This setting connects the API to the database; it does not create the database or its tables. Keep the URL and all signing keys out of source code and frontend settings.

#### 2. URL routing — API layer

In [`urls.py`](./backend/vitalsync_api/urls.py):

```python
path("api/logs", lifestyle_logs, name="lifestyle-logs"),
path(
    "api/patients/<int:patient_id>/stress-classification",
    stress_classification,
    name="stress-classification",
),
```

**What it does:** Django matches an incoming URL and HTTP method to the Python function that handles it. These are API routes—not database tables. For example, `/api/logs` is handled by `lifestyle_logs`; the stress-classification route is handled by `stress_classification`.

#### 3. Login and request authentication — API/security layer

The login handler in [`views.py`](./backend/api/views.py) checks the submitted password against its stored bcrypt hash and signs a time-limited JWT:

```python
if not account or not bcrypt.checkpw(password.encode(), account.password_hash.encode()):
    return Response({"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

token = jwt.encode(
    {"id": account.id, "email": account.email, "role": account.role,
     "iat": issued_at, "exp": issued_at + timedelta(hours=24)},
    settings.JWT_SECRET,
    algorithm="HS256",
)
```

For later requests, [`authentication.py`](./backend/api/authentication.py) validates the Bearer token and retrieves the account from the database. [`settings.py`](./backend/vitalsync_api/settings.py) makes this authentication class and `IsAuthenticated` the default for API views; login and other intentionally public endpoints explicitly override that default. **A valid token identifies the account; endpoint code must still check role and access to the requested patient.**

#### 4. Database models — ORM mapping to PostgreSQL tables

In [`models.py`](./backend/api/models.py), a representative model is:

```python
class LifestyleLog(models.Model):
    patient = models.ForeignKey(PatientProfile, models.DO_NOTHING, blank=True, null=True)
    type = models.CharField(max_length=20)
    date = models.DateField()
    detail = models.TextField(blank=True, null=True)
    payload = models.JSONField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "lifestyle_logs"
```

**What it does:** This Django model maps Python fields to columns in the existing PostgreSQL `lifestyle_logs` table, so API code can query and save log records using the ORM. `managed = False` means Django's normal model migration mechanism does not create/manage this table. The model is the database access map, not the API endpoint itself; the database stores the actual rows.

#### 5. Patient authorization and log persistence — API rules plus database queries

The access helper in [`patients.py`](./backend/api/patients.py) builds the set of patients a doctor is allowed to see:

```python
return MonitoringRelationship.objects.filter(
    Q(managing_doctor_id=doctor_profile_id)
    | Q(visibility="All Doctors")
    | Q(visibility="Selected Doctors",
        selected_doctor_ids__contains=[doctor_profile_id])
).values_list("patient_id", flat=True)
```

`MonitoringRelationship.objects.filter(...)` is an ORM query to PostgreSQL; the access rule is enforced by backend API code, not by the browser. In [`logs.py`](./backend/api/logs.py), `lifestyle_logs` checks the account role, derives a patient's identity from the authenticated account for patient writes, and verifies a doctor's access before returning that patient's logs. A successful patient log submission is saved with `LifestyleLog.objects.create(...)`. So this feature is both an **API operation** and a **database read/write**.

#### 6. Stress classification — doctor-only API and model inference

In [`stress_views.py`](./backend/api/stress_views.py), the endpoint first checks the doctor's role and authorized patient, then retrieves that patient's stress log and calls the classifier:

```python
log = LifestyleLog.objects.filter(
    id=log_id, patient_id=patient.id, type="stress"
).first()
label, result_status = classify_reflection(log.detail or "")
```

[`stress_nlp.py`](./backend/api/stress_nlp.py) preprocesses the reflection and runs the saved SVM model. The endpoint returns the label as JSON; it does not write the classification result back to PostgreSQL. The original stress reflection itself is a database log. This output is a technical prototype result—not a diagnosis or treatment recommendation.

**Source note:** `stress_views.py` still has a comment calling the endpoint “PROPOSED”; that comment is stale. The route is wired in `urls.py` and the feature is implemented and deployed, as described in the deployment status below.

## 2. Current deployment status

The following describes the hosted demo environment as last verified in October 2026; it is not a production or research-ready approval.

- [x] Both frontends are deployed to Vercel Production.
- [x] The Django REST Framework API is deployed on Render as `vitalsync-nlp-test-api`.
- [x] The Render API connects to the main Supabase PostgreSQL database. Supabase hosts the database, not Django.
- [x] The public API health endpoint returned `status: ok` and a database timestamp on October 22, 2026.
- [x] Django sends hosted patient-invitation and password-change verification emails through Brevo's HTTPS API.
- [x] Full backend suite: the latest recorded run reports 72 tests passing, along with `manage.py check`. This is historical test evidence, not a claim that the suite was rerun after every deployment change.
- [x] NLP E2E-01–19 passed on an isolated fictional-data setup on October 14–15, 2026. After switching to the hosted Vercel Production → Render → main Supabase environment, E2E-01, E2E-12, and E2E-13 passed as post-merge smoke checks on October 19. The full 19-case suite was not rerun on the hosted environment.
- [x] On October 21–22, all nine synthetic patient demo-account logins and selected doctor/patient views, logs, goals, messages, monitoring history, registry search, and one stress-classification result were manually exercised. These are targeted demo checks, not comprehensive end-to-end certification.
- [x] The main Supabase database contains synthetic demo accounts and seeded demo records. The nine patient demo accounts were created directly for demonstration and use non-deliverable `.invalid` email identifiers; this is not the normal invitation workflow and is not participant data. Keep demo credentials in the separate local-only credential note, never in these repository documents.
- [ ] The checked device-local frontend `.env.local` files still point to the previous Render hostname; update them to the current API URL before local frontend development against the hosted API. These files are ignored by Git and are not authoritative for the Vercel deployment.
- [ ] Confirm any credentials exposed in earlier screenshots/messages have been rotated or revoked; update hosted/local configuration with replacements.
- [ ] Before any research use, meet ethics, privacy, security, and research-ready requirements and replace demo-only data as appropriate. Until then, use only synthetic/demo data.

The currently used hosted API base URL is:

```text
https://vitalsync-nlp-test-api.onrender.com/api
```

The production frontend URLs are:

- Doctor Dashboard: `https://vital-sync-prototype-doctor-dashboard.vercel.app/`
- Patient Portal: `https://vital-sync-prototype-patient-portal.vercel.app/`

Render's Free web service can sleep after inactivity; the first request after sleep may be delayed or time out. Use this deployment for demos/testing, not as a production healthcare service.

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

Clone the repository and check out the shared branch (`main`). In **each** frontend folder, create or update a file named `.env.local`:

`doctor-dashboard/.env.local`

`patient-portal/.env.local`

Put this in both files:

```dotenv
VITE_API_BASE_URL=https://vitalsync-nlp-test-api.onrender.com/api
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

The usual hosted-demo workflow does **not** need local PostgreSQL or a local Django server: Render runs Django and connects to Supabase online. The original local development setup used Django with PostgreSQL; local Django can still connect to a local PostgreSQL database by setting `DATABASE_URL` in the private `backend/.env`. A local database and the hosted Supabase database are separate environments and do not share data automatically.

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
- API health check: `https://vitalsync-nlp-test-api.onrender.com/api/health`

Vite reads `.env.local` only at startup. If you edit it while a dev server is running, stop that server with `Ctrl+C` and run `npm run dev` again.

The Render CORS configuration must allow the exact production Vercel origins and any local frontend origins used by the team. Browser requests go from the frontend to the remote Render API, then Django reads/writes Supabase. Email is sent by Django through Brevo. Reload the page to verify persisted changes.

## 6. Optional: run Django locally

Only do this when you are developing or debugging the backend itself. The local frontends normally use Render as described above. Choose a local PostgreSQL URL for isolated local data, or use the hosted database only when you have a specific need and authorization; never put either database URL in frontend configuration.

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

The shared Supabase database has its application schema applied. Do **not** run `migrate` as part of daily startup, on every developer device, or in Render's build command. For a newly created local PostgreSQL database, review the migration plan and apply the required migrations once to that local database.

When a backend change adds or alters a model/field:

1. Create and review the migration in development.
2. Back up the intended database and review `manage.py migrate --plan`.
3. Coordinate with the backend owner, then apply the migration to Supabase once.
4. Other developers pull the code; they do not re-apply an already recorded migration.

Migration `0009_doctor_email_verification` adds doctor email-verification state and one-time-code storage. It has not been applied to the shared database; coordinate and back up the intended isolated test database before applying it. Do not run this migration against production without an explicit release decision.

`backend/schema.sql` is a reference snapshot, not a script to run manually over the existing database.

## 7. Render configuration reference

The existing Render Web Service uses:

| Setting | Value |
|---|---|
| Repository branch | `main` |
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
| `DATABASE_URL` | Private PostgreSQL connection URL; hosted Render uses the configured Supabase endpoint with SSL |
| `DJANGO_ALLOWED_HOSTS` | Render API hostname, without `https://` |
| `DJANGO_SECURE_SSL_REDIRECT=true` | Require HTTPS |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact production Vercel origins and any approved local frontend origins |
| `EMAIL_BACKEND=api.email_backend.BrevoEmailBackend` | Send hosted email through Brevo HTTPS API |
| `BREVO_API_KEY` | Private Brevo API key |
| `EMAIL_FROM_ADDRESS` | Verified sender email configured in Brevo |
| `PATIENT_PORTAL_URL` | Patient Portal production URL used in invitation email |
| `CSRF_TRUSTED_ORIGINS` | Set exact HTTPS origins only if a CSRF-protected browser flow requires them |

Doctor registration follows the normal email-verification flow. A registrant provides their account details, receives a six-digit code at the supplied address, and must verify that address before signing in. Codes expire after ten minutes; resend requests are rate-limited and verification attempts are capped. Existing accounts are treated as verified by default when the schema migration is applied. Duplicate email registration returns **409 Conflict**. Newly issued login tokens expire after four hours; this does not revoke tokens that were issued before the expiry change.

Never expose or paste secret values into chat, screenshots, source code, frontend variables, or Git. Rotate any credential that has been exposed.

## 8. Email flow

- Local Django development can use Django's SMTP email backend and a test mailbox such as Ethereal.
- The deployed Render service uses `api.email_backend.BrevoEmailBackend`, which calls Brevo's transactional email endpoint over HTTPS.
- Patient invitations, patient password-change verification codes, and doctor-registration verification codes use Django's configured email backend.
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

Implemented connected workflows include authentication, profiles, patient registry, visibility/authorization, logs, provider and personal goals, messages, notes, preferences, custom activity choices, reminders, monitoring history, and archive/reactivation. The stress-classification endpoint is also implemented and integrated into the doctor-facing journey view.

There is one known cross-device integration gap: provider-goal definitions are stored through the API, but the Doctor Dashboard `PatientGoalsView` calculates progress from the browser's legacy `vitalsync_logs_v1` localStorage entry instead of fetching the authorized patient's API logs. As a result, progress on that screen can be stale or differ by browser. This does not make the backend log data local-only; it is a frontend calculation-source inconsistency that remains to be fixed.

Personal-goal progress is stored as a value and is not calculated from logged activity by the backend. Notification settings and reminders are stored preferences, not delivered notifications.

Not implemented: general password recovery, notification delivery, profile-photo storage, offline sync, real-time updates, push notifications, doctor mobile app, or clinical diagnosis/decision support. The rule-based "Your Journey" text is not AI, NLP, or clinical prediction.

All study-facing records must remain synthetic/demo data until ethics approval and all research-ready requirements are met.

### Stress NLP/SVM module (implemented prototype feature)

- Four-class stress-only model (`NO_STRESS`, `MILD_STRESS`, `MODERATE_STRESS`, `HIGH_STRESS`), trained on the supplied v1.0 simulated dataset. The dataset contains English, Filipino, and mixed texts; claimed language support is English only. Model and metadata: `backend/api/nlp_model/stress_svm.joblib` / `.json`; rebuild with `python -m api.nlp_model.export_model <dataset.csv> <C>` from `backend/`.
- Endpoint: `POST /api/patients/<id>/stress-classification` with `{"log_id": n}`. It is doctor-only and limited to authorized patients. The response includes `label`, `status`, and `model_version`, without a confidence value. The result is returned on request and is not stored; reflection text is not logged by the classifier endpoint.
- The Doctor Dashboard requests classification for the patient's latest stress reflection and displays the result in Your Journey. The Patient Portal does not show the classification. This is not a diagnosis, risk score, treatment recommendation, or automated clinical decision.
- Merged to `main` in PR #2 at `b6321bc` on October 18, 2026. E2E-01–19 passed on an isolated fictional-data setup on October 14–15. After the deployment environment changed to Vercel Production → Render `vitalsync-nlp-test-api` → main Supabase, post-merge E2E-01, E2E-12, and E2E-13 smoke checks passed on October 19; the full 19-case suite was not rerun on that hosted environment.
- `manage.py check` and all 72 backend tests passed in the latest recorded automated run. The 12 API-view tests use mocked data and cover valid, blank, short, model-unavailable, and authorization cases; they are not live-database or deployed end-to-end tests.
- During the October 21–22 synthetic demo checks, one submitted stress reflection displayed “No Stress.” This verifies only that specific path/result; it does not verify all four labels or clinical validity.
- Results are technical performance on simulated data (test accuracy 0.676, macro-F1 0.577), not clinical validity. See `NLP/NLP.md` for the master document and `docs/DEPLOYED-FRONTEND-WORKFLOW-VERIFICATION-2026-10-11.md` for dated workflow evidence.
- Requires `scikit-learn`, `numpy`, `scipy`, `joblib` (added to `requirements.txt`); `scikit-learn` is constrained to `>=1.9,<1.10` for model compatibility.

For feature requirements and decisions, consult [BACKEND.md](./BACKEND.md), [WORKFLOW.md](./WORKFLOW.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and [CLAUDE.md](./CLAUDE.md).
