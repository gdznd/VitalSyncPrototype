# VitalSync Backend Guide

## Purpose and prototype boundary

This guide describes the backend feature contract and the current Django/PostgreSQL integration for the VitalSync prototype. The current hosted request path is **Vercel frontends → Django REST Framework API on Render → PostgreSQL on Supabase**. Local development can run Django and use either a configured local PostgreSQL database or the hosted database; see `BACKEND_Implementation.md` for setup and the dated verification record.

The prototype supports synthetic/demo workflows. It is **not an interview-ready research system, production healthcare platform, or authorization to collect participant data**. Ethics approval, research-ready security and privacy review, and confirmation of the remaining research decisions are separate requirements.

Do not add features, workflow variants, analytics, or infrastructure that the current code and contract do not require. Preserve correct identity, role isolation, persistence, server-side access checks, and cross-application consistency.

## Authority and how to resolve conflicts

Use this order when a requirement conflicts:

1. The Feature Contract Matrix (XLSX).
2. Explicit stakeholder/adviser decisions.
3. `WORKFLOW.md`.
4. `ARCHITECTURE.md`.
5. This guide and the refactor plan.
6. Current frontend code, which documents the prototype's present data shapes and limitations.

Do not treat mock values, generated fallback records, or decorative UI controls as backend requirements. When the source materials do not settle a behavior, label it **Decision needed** and ask the team before implementing it.

## Current implementation: what is connected and what remains prototype-only

Both frontends are separate React/Vite applications. The connected production path uses a Django REST Framework API and PostgreSQL: JWT authentication identifies the account, Django enforces roles and patient visibility, and both applications read/write shared server records. The current deployment and verification limits are recorded in `BACKEND_Implementation.md`.

### Connected server-backed workflows

- Doctor registration/login and patient login use the backend `public.users` table and bcrypt password hashes. The app does not use Supabase Auth for these accounts.
- Patient profiles, doctor profiles, monitoring relationships/visibility, follow-up dates, monitoring history, logs, provider goals, personal goals, patient-provider messages, doctor Team messages, notes, settings/preferences, reminders, and patient activity choices have backend-backed API flows.
- The doctor-only stress-classification endpoint is implemented; it returns an on-request result for an authorized patient's stress reflection without storing the result. See `BACKEND_Implementation.md` and `NLP/NLP.md` for the limited test evidence and intended use.
- The browser stores JWTs for authenticated API requests. This is session-token storage, not the old browser-local source of truth for account or health records.
- Both frontends are deployed on Vercel; the hosted Django service runs on Render and connects to PostgreSQL on Supabase. Brevo is used by Django for transactional email.

### Known legacy/local-only behavior and limitations

- The Doctor Dashboard `PatientGoalsView` still reads `vitalsync_logs_v1` from browser `localStorage` to calculate provider-goal progress. Goal definitions are persisted via the API, but this screen's progress can disagree with the server-backed patient logs or another browser. Replace that read with authorized API logs before treating goal progress as consistently cross-device.
- Personal-goal progress is a patient-owned stored value; it is not calculated from health logs by the backend.
- Notification preferences and reminder settings are persisted preferences only. There is no push, scheduled, or real-time notification delivery.
- The browser's local reminder choice is presentation-only. Do not treat legacy localStorage values or generated fallback data as patient-submitted records.
- Patient profiles do not include a sex field. Patient phone/address fields are optional and may be blank. Profile-photo selection is preview-only and is not stored.
- Demo patient accounts created directly by SQL may use non-deliverable `.invalid` login identifiers and demo-only credentials. Such accounts cannot receive invitation/password emails and are not the supported account-provisioning path.

### Identity and authorization boundary

The backend derives the authenticated account and role from the JWT and applies authorization on each request. Do not trust browser-supplied roles, ownership, managing-doctor IDs, `assignedBy` names, or visibility claims. The backend is authoritative for connected identity, access control, and persisted records; the localStorage-based provider-goal progress reader is the explicit exception noted above.

**Security and Backend Boundary Rule:**
- Backend must derive authenticated user and role server-side.
- Do not trust browser-supplied patient IDs, roles, assignedBy values, visibility values, or ownership claims for authorization.
- Backend is the authoritative source for authentication, authorization, patient visibility, ownership, persistence, and cross-application data sharing.

## Required domain model

Use stable backend IDs internally. The existing `VS-0001`-style `uniqueId` is a patient-facing/clinic-facing identifier and must be unique, but it is not a substitute for an internal primary key. Dates currently use `YYYY-MM-DD`; times use `HH:mm` strings. Preserve these practical API representations unless the integration team agrees on another transport format.

### Accounts and profiles

**Account/User**

- `id`
- role: `doctor` or `patient`
- authentication credentials handled by the chosen backend auth mechanism
- active/authentication status as needed for the prototype

**Password and Account Provisioning Workflows:**
- **Initial Patient Account Provisioning:** Doctor creates the patient account using the patient's email. Patient receives a login email, a secure temporary password (handled securely and not stored as plaintext), and short Patient Portal instructions. Patient changes the password on first login. This is separate from doctor self-registration.
- **Change Password Workflow (Patient Portal Settings):** Supporting the existing Patient Portal Settings UI: Patient clicks "Change Password" → backend generates a one-time verification code → code is sent to the patient's registered email → Patient Portal displays a code-entry UI → patient enters the code → backend verifies the code → if valid, patient is allowed to set/change their password. Verification codes must be short-lived/expiring, single-use, and never exposed through the frontend except via email delivery. Do not store plaintext passwords. *(Note: A "Forgot Password" workflow is out of scope and not an MVP requirement).*

**Doctor profile**

The MVP persists the existing Doctor Dashboard profile workflow:

- editable: name, specialty/role, clinic/organization, professional description (`about`), credential/license text, initials, display color, and the existing dashboard phone field;
- account email is the doctor's authentication identity and is displayed read-only, not edited as profile data;
- the patient-safe provider directory exposes the public profile fields but excludes account email, phone, and editing controls.

Do not add new doctor settings or profile fields beyond the existing workflows. The existing account settings and conversation controls are persisted through the backend: doctors can save clinic, appearance, workspace defaults, and notification preferences; patients can save appearance, accessibility, language, and notification preferences; each account can save per-conversation pin and notification-filter preferences. Doctor defaults are applied when creating a patient. Notification preferences are stored only and do not deliver notifications.

**Patient profile**

Field ownership and permissions:

- **Patient-editable:** phone number, email address through a separate account operation requiring the current password (changing login email is an account/authentication operation, not an ordinary profile-field edit), home address, emergency contact, date of birth, weight, and height.
- **Doctor-managed:** canonical patient name, care focus, patient type (`Out-patient` or `In-patient`), monitoring status/detail, priority, follow-up date, managing doctor, visibility, and selected doctors.

Date of birth is the source of truth. Age is derived from date of birth at display time, is not independently editable, and is not stored as a current demographic value. The legacy `age` database column is not used by the API. `memberSince` may be derived from account creation time; `lastVisit` has no approved persistent source and must not be invented.

Persistent food-photo upload/storage and persistent profile-picture storage are deferred for MVP. No media-storage infrastructure is required for MVP.

### Monitoring relationship, visibility, and lifecycle

Model the clinical-monitoring relationship separately from the patient account. A patient can retain an account while their monitoring is inactive.

At minimum, the model must capture:

- the patient
- managing/established doctor
- active versus archived monitoring status
- visibility: `Assigned Only`, `Selected Doctors`, or `All Doctors`
- the selected-doctor list when visibility is `Selected Doctors`
- follow-up date and care focus as supported by the patient workspace

Authorization rule for doctor access:

| Visibility | Authorized doctor access |
| --- | --- |
| Assigned Only | The managing/assigned doctor only |
| Selected Doctors | The managing doctor plus explicitly selected additional doctors. The managing doctor always retains access and cannot remove their own access through the selected-doctor list. |
| All Doctors | Every authenticated doctor in this prototype |

Patient-facing provider availability must be derived from the same relationship/visibility data, not from the current static provider list. Patients cannot add or remove providers themselves.

**Archive/Reactivation and Provider Goals:**
- Archiving a patient preserves provider-goal records and their existing lifecycle status.
- Do not automatically change goals to Paused, Completed, or Cancelled because of archiving.
- Provider-goal workflow is suspended/hidden while inactive and restored on reactivation.
- Archiving does not delete the patient account, historical logs, messages, goals, or monitoring history. Reactivation locates the existing patient by their unique ID and restores active monitoring rather than creating a duplicate account.

When monitoring is archived:

- preserve every provider-goal record and its existing lifecycle status; do not change it to Paused, Completed, or Cancelled;
- suspend/hide provider-goal work and patient-facing provider monitoring while inactive;
- allow the managing doctor to inspect historical goals, but reject goal changes until monitoring is reactivated;
- show no provider goals or general provider roster to the inactive patient; retain the established managing-doctor conversation only.

While inactive, preserve the workflow invariant:

- patients retain personal lifestyle self-management, history, progress, and personal goals;
- provider-controlled monitoring functions are suspended;
- provider-assigned goals remain preserved with their existing lifecycle status while inactive and are not active monitoring work;
- patient messaging is limited to the previous/established doctor conversation.

Reactivation restores the provider-management workflow without changing stored provider-goal statuses.

### Lifestyle logs

Current code persists a common display-oriented log shape:

```ts
{
  id: number,
  patientUniqueId: string,
  type: 'food' | 'medication' | 'activity' | 'sleep' | 'stress' | 'social' | 'habit',
  date: 'YYYY-MM-DD',
  time: 'HH:mm',
  title: string,
  detail: string,
  extra?: string,
  payload: Record<string, unknown>
}
```

The Portal currently records the following input behavior:

- Food: meal type, one or more food item strings, optional description. Image preview/upload is deferred from MVP.
- Medication: one or more medicine name/dosage/unit entries are concatenated into `detail`.
- Activity: activity name, minutes, optional calories; `payload.activity` and numeric `payload.minutes` are the calculation source. `detail` remains display text.
- Sleep: sleep time, wake time, calculated duration, quality; `payload.sleepTime`, `payload.wakeTime`, numeric `payload.durationMinutes`, and `payload.quality` are structured fields. `extra` remains display text.
- Stress and social: free-text or guided answers joined with ` || `.
- Habit: Alcohol, Cigarettes, Vape, Gambling, and Recreational drugs, currently condensed into display strings.

The backend must preserve structured data for the listed workflows. The API stores the structured log payload unchanged, stores the fields required by actual forms in typed log payloads/records, and returns a UI-compatible projection. Patient and doctor summaries and the shared goal evaluator read metric values from payload fields, not by parsing display strings. Missing or invalid activity/sleep measurements are omitted from metric calculations; sleep is never defaulted to eight hours. Older sleep payloads with `sleepTime` and `wakeTime` remain calculable without parsing `extra`. Persistent food-photo storage is deferred for the MVP; do not introduce upload endpoints, object storage, image processing, or media infrastructure, and do not persist browser object URLs.

Doctors may read an authorized patient's logs. Patients may create/read their own logs. Current UI has no log editing/deletion workflow, so editing/deletion is out of scope unless the contract confirms it.

### Provider-assigned goals

Provider goals are the doctor's monitoring-plan goals. They are distinct from personal goals.

Current provider-goal shape:

```ts
{
  id: number,
  patientUniqueId: string,
  title: string,
  category: string,
  target: string,
  frequency: 'Daily' | 'Weekdays' | 'Weekly',
  startDate: 'YYYY-MM-DD',
  reviewDate: 'YYYY-MM-DD',
  instructions: string,
  status: 'Active' | 'Paused' | 'Completed' | 'Cancelled',
  progressPercent: number,
  assignedBy: string,
  evaluationType?: 'duration' | 'indicator' | 'occurrence' | 'reflection' | 'none',
  targetValue?: number,
  targetUnit?: string,
  metricKey?: string
}
```

The server must set the assigning doctor from the authenticated actor rather than accepting `assignedBy` as a client-controlled name. Authorized doctors create and manage provider goal definitions/lifecycle. Patients can view and track them but cannot change their definition or status.

**Goal Evaluation Rule:**
- MVP goal evaluation remains frontend/shared canonical evaluator logic.
- Backend stores authoritative structured logs and provider goals.
- Backend does not calculate goal progress in MVP.
- Do not create a new backend evaluation requirement.

Supported evaluation behavior in the shared frontend evaluator:

- `duration` / `activity`: sum numeric `payload.minutes` per expected day, or aggregate weekly activity.
- `duration` / `sleep`: compare `payload.durationMinutes` (or a duration derived from structured sleep/wake times) to the hours target. Missing or invalid values do not count as sleep hours.
- `indicator` / `food`: presence of a food log counts as the current indicator.
- `occurrence` / `medication`: a structured `payload.medications[].name` contains the configured metric key.
- `reflection`: the matching stress/social/habit log type is submitted.
- `none`: custom/unsupported goal; no automatic evaluation.
- Daily evaluates each day in the start-to-review/reference window; Weekdays only Monday–Friday; Weekly calculates the weekly aggregate target.

The displayed result is measurable target attainment (such as `5/7 days`, `71%`), never a clinical determination of success/failure. Goals that cannot be reliably evaluated from available structured data are not automatically evaluated.

### Personal Wellness Goals

Current personal-goal shape is the provider-goal shape without `assignedBy` and evaluator configuration. Patients create them from templates or a custom form and may edit, pause/resume, or cancel them. They are private to the patient and **never visible to doctors**.

Do not merge personal and provider goals into one permission model just because their fields resemble each other. A shared storage/table implementation is possible only if ownership, source (`personal` vs `provider`), and server-enforced access rules remain unambiguous. The current personal-goal progress bar is manually stored as `progressPercent`; it is not governed by the provider-goal automatic evaluation rules.

### Messages

The current Patient Portal has one-to-one conversations with a static assigned-provider subset and message objects shaped as:

```ts
{ id: number, sender: 'patient' | 'doctor' | 'nurse', text: string, time: string, important: boolean }
```

The Doctor Dashboard has a separate prototype message view/state. Neither side persists or shares messages.

Patient-provider conversations persist through the backend and remain private to the authorized patient/provider pair. Sender identity comes from the authenticated account. The Doctor Dashboard's one-to-one doctor-to-doctor Team messages are also persisted, scoped to the sender/recipient pair, and kept separate from patient conversations. Group chat and realtime delivery remain out of scope.

The patient UI's pinning, notification-filter dropdown, simulated typing, unread dots, and automatic reply are presentation/prototype behavior—not backend requirements. Reminder preferences can be stored, but no push notification or scheduled delivery is implemented.

### Summaries and follow-ups

Patient and doctor summaries are derived from the same authorized patient logs. The existing displays calculate meals logged/missed, medication-entry count, activity minutes and favorites, average sleep, reflection/habit counts, date-filtered history, and simple encouraging observations. Activity and sleep metrics use structured payload fields; if valid sleep measurements are unavailable the display says "No data" instead of showing a fabricated average.

The Doctor Dashboard's `RecentActivitySummary` reads authorized patient logs from the API and derives its summaries from those returned records. Connected views must not substitute legacy/generated logs; empty states are preferable to fabricated logs.

Monitoring history records real lifecycle events (monitoring start/reactivation, archive, and active care-focus change); unknown legacy dates remain unknown. Doctor notes are private to their author. The dashboard's reminder toggle persists a per-doctor/per-patient preference only; it does not schedule or send a notification.

Follow-up currently consists of a patient `followUpDate`; the dashboard computes priority from it: past = High, due within three days = Medium, otherwise Low. Persist the date. The derived priority can remain frontend logic or be returned by the server, but only one source should drive the display. No appointment scheduling workflow is currently specified.

## Minimum API/service responsibilities

Exact URL names and framework are implementation choices. Provide a clear service surface that supports the following authorized operations.

| Area | Required responsibility |
| --- | --- |
| Auth/session | Sign in/out and identify the authenticated account and role; bootstrap the correct patient or doctor context. Doctors self-register through the existing Doctor Dashboard account-creation flow. Doctor-created patient accounts use email invitations with secure temporary passwords. Patients change their password after receiving and verifying a short-lived one-time code sent to their registered email; temporary-password patients can access only session identification and the email-code/password-change endpoints until the password is changed. Doctors confirm their current password for password changes. General password recovery is outside this MVP. |
| Doctor profile | Persist/edit the signed-in doctor's approved dashboard profile (name, specialty/role, clinic/organization, about/professional description, credentials/license, initials, display color); return a restricted patient-safe profile only to patients authorized to view that provider. |
| Patient profile/registry | Doctors list/open only patients they are authorized to access. Patients read/update only their own approved profile fields (including editable DOB). |
| Monitoring relationship | Create/add an active patient monitoring relationship, update visibility/selected doctors (retaining managing doctor access), archive (preserving goals and lifecycle status), reactivate by existing unique ID, and expose active/inactive state. |
| Provider directory | Return only providers available to the authenticated patient under the assignment/visibility rules, including patient-safe profile fields. |
| Logs | Patient creates/lists their own logs; authorized doctors list a selected patient's logs with date range/filter support. |
| Activity choices | Serve built-in activity choices from the API and persist custom activity choices per authenticated patient; never share one patient's custom choices with another. |
| Summaries | Return logs/aggregates from the same patient data for both apps; never substitute generated mock logs. |
| Provider goals | Authorized doctor creates, lists, updates lifecycle/definition for an authorized patient; patient reads assigned goals only. (Backend stores records without calculating progress in MVP). |
| Personal goals | Patient-only create/read/update/cancel; never expose them in doctor APIs or summaries. |
| Messages | List/create messages in authorized private patient-provider conversations; stable chronological ordering and persisted timestamps. |
| Doctor records | Persist monitoring lifecycle history, doctor-private notes, one-to-one doctor Team messages, and reminder preferences, with server-side authorization. Reminder storage does not imply push-notification delivery. |
| Account/conversation preferences | Persist the existing doctor and patient settings and per-conversation pin/filter controls for the authenticated owner. Enforce role-specific fields and conversation access; doctor defaults apply to newly created patients. Notification preferences are storage-only. |
| Follow-up | Authorized doctor reads/updates the patient's follow-up date; dashboard can derive or receive priority. |

Where useful, provide a patient-workspace/doctor-patient-detail read model so a dashboard screen does not need a waterfall of requests. This is an optimization, not permission to create a second source of truth. Every response must apply the same server-side authorization rules.

## Role isolation checklist

### Patient

- Can authenticate as exactly one patient account.
- Can read/write only their own logs, personal goals, and approved profile fields.
- Can read the built-in activity choices and manage only their own custom activity choices.
- Can read, but not alter, provider goals assigned to them.
- Can read only authorized providers and private conversations with those providers.
- Cannot access another patient's identifiers, logs, messages, goals, monitoring status, or provider-selection controls.
- Cannot see other patients or any doctor-only monitoring/registry data.

### Doctor

- Can authenticate as their own doctor profile.
- Can see only patients allowed by that patient's monitoring visibility.
- Can manage provider goals, follow-up, monitoring lifecycle, and visibility only for an authorized patient.
- Can read that patient's monitoring history and manage their own private notes and reminder preference.
- Can list/send one-to-one Team messages with another registered doctor; these remain distinct from patient conversations.
- Cannot access a patient's personal wellness goals.
- Can message only an authorized patient through the private patient-provider conversation.
- Cannot gain access by changing an ID in the URL/request body.

## Frontend integration contract

Preserve UI vocabulary where practical: `patientUniqueId`, `Assigned Only`, goal statuses, frequencies, and the existing log types. Stable IDs may change from numeric local IDs to backend IDs, so frontend code must stop assuming `Date.now()` identifiers are globally meaningful.

The original integration order is retained as implementation history:

1. Authenticated session/context and role bootstrap.
2. Doctor registry plus server-enforced visibility and monitoring lifecycle.
3. Patient identity/profile and assigned-provider directory.
4. Lifestyle logs and consistent patient/doctor summaries.
5. Provider goals and personal-goal isolation.
6. Messaging and persisted follow-up updates.
7. Remove/disable mock fallback paths only after the connected endpoint is verified.

Connected flows should use the API rather than browser-local copies. The known exception is the Doctor Dashboard provider-goal progress calculation described above; it still reads `vitalsync_logs_v1` and must be replaced with an authorized API log source. Seeded demonstration accounts/data are acceptable for demos only when clearly synthetic and managed as seed data, not client-side mock state.

## Explicitly out of scope

- Realtime sockets, typing synchronization, live unread delivery, push notifications, and notification email/SMS delivery. Email delivery for patient invitations and password-change verification codes remains in scope.
- Group chat.
- Offline sync/conflict resolution.
- Risk scoring, advanced analytics, or clinical decision support. The implemented four-class stress classifier is a separate, doctor-only technical prototype; it is not a diagnosis, risk score, treatment recommendation, or clinical decision-support feature.
- A clinical-success/failure conclusion from goal attainment.
- Production-grade compliance certification, audit/compliance systems, enterprise tenancy, high-availability, or scale architecture.
- Persistent food-photo and profile-picture storage for this MVP.
- Food-photo persistence / media storage infrastructure.
- New logging types, appointment scheduling, medication prescribing, or clinical records not present in the current scope.
- New settings features, broader settings-page redesign, or functional dark-mode/settings polish beyond persistence of the existing controls.
- Forgot-password workflow (out of scope for MVP).

Basic secure password handling, authenticated sessions, authorization checks, input validation, and server-side data persistence are not “production extras”; they are the minimum needed to correct the prototype's current identity and isolation failure.

## Definition of done for this backend prototype

These are acceptance criteria for the connected synthetic-data prototype, not evidence of research readiness or clinical suitability. Current deployment and dated verification evidence are in `BACKEND_Implementation.md`. The criteria below describe the intended behavior; the known localStorage provider-goal progress exception remains unresolved:

- Signing in as different doctors returns different, server-authorized data; it no longer shows Jamie's data after Rafael signs in merely because UI state changed.
- Signing in as a patient establishes that patient's identity without a browser-selected demo ID.
- Patient visibility (`Assigned Only`, `Selected Doctors`, `All Doctors`) is enforced by the server for registry access, patient workspace access, provider availability, and patient-provider messaging, with managing doctor access always retained under Selected Doctors.
- A patient-created lifestyle log persists and becomes visible in the authorized doctor's activity/history/summary using the same underlying record; there are no generated fallback logs in connected views.
- Built-in activity choices are served by the API, and custom activity choices persist for their patient owner only.
- Provider goals can be managed by an authorized doctor and viewed/tracked—but not edited or lifecycle-managed—by the assigned patient (with progress evaluated on the frontend).
- Personal goals are visible and mutable only to their owning patient.
- Patient-safe provider profiles are served from provider data and visible only for authorized assigned/involved providers.
- Monitoring history is based on persisted monitoring lifecycle events, and no unknown legacy date or adherence value is fabricated.
- Doctor notes are private to their author; one-to-one doctor Team messages persist between registered doctors.
- Per-doctor patient reminder preferences persist, but do not imply notification delivery.
- Existing doctor/patient account settings and conversation pin/filter preferences persist across reloads; doctor defaults are applied to newly created patients.
- Doctor self-registration and editing of the approved doctor public profile persist in PostgreSQL; account email remains an authentication identity field.
- Patient password changes require a one-time code sent to the registered email and verified by the backend; temporary-password patients cannot use other protected resources until the new password is set. Doctors continue to confirm their current password. General password recovery remains out of scope.
- Messages persist and remain private to the authorized patient/provider pair.
- Archive retains the patient account/history, preserves provider goals and existing lifecycle status without automatic modification, and reactivation uses the existing unique ID and restores monitoring without duplication.
- Inactive-monitoring behavior preserves provider-goal rows and statuses, hides patient-facing provider-goal work, prevents goal changes until reactivation, limits messaging to the established doctor, and follows the documented access rules.
- Follow-up date persists and priority behavior remains consistent with the dashboard.
- Both applications use the agreed service/API contracts for connected records; provider-goal progress must also use authorized API logs rather than direct localStorage.
- The team has manually exercised the core interview paths with at least two doctors and more than one patient, including a denied-access check.

## Confirmed implementation decisions

- Goal evaluation remains in one canonical shared frontend evaluator; Django persists and returns its structured inputs.
- Doctor self-registration is part of the MVP, using the existing Doctor Dashboard registration flow. No separate admin-created-doctor workflow is required.
- The existing doctor profile editing workflow persists the approved profile fields; account email is not editable as profile data, and provider phone/email are not exposed in the patient-safe directory.
- Persistent food-photo and profile-picture storage are deferred. Existing previews are not saved.
- Patient password changes use a registered-email one-time verification code. Temporary-password patients are restricted server-side to the password-change workflow until successful completion.
- Doctors retain the existing current-password-confirmed password change. No unauthenticated password-recovery flow is added.

Persisting the existing settings controls is a development-scope decision, not a research-scope change. It does not authorize adding new profile or settings fields.
