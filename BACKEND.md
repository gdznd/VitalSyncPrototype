# VitalSync Backend Guide

## Purpose and prototype boundary

Build the smallest persistent backend that makes the existing Doctor Dashboard and Patient Portal behave as one **interview-ready qualitative-research prototype**. The V1 Django/PostgreSQL integration now connects the main login, registry, logging, goals, and messaging flows; see `BACKEND_Implementation.md` for the verified implementation snapshot and remaining work. This guide remains the feature and authorization contract for continuing that integration.

This is not a production-healthcare platform brief. Do not add features, workflow variants, analytics, or infrastructure that the current code and contract do not require. The prototype needs correct identity, role isolation, persistence, access checks, and cross-application consistency for the interview flows.

The frontend refactor and backend work may proceed in parallel. The frontend should replace direct localStorage/mock reads with a service/API layer; it must not have to redesign screens or workflows to use the backend.

## Authority and how to resolve conflicts

Use this order when a requirement conflicts:

1. The Feature Contract Matrix (XLSX).
2. Explicit stakeholder/adviser decisions.
3. `WORKFLOW.md`.
4. `ARCHITECTURE.md`.
5. This guide and the refactor plan.
6. Current frontend code, which documents the prototype's present data shapes and limitations.

Do not treat mock values, generated fallback records, or decorative UI controls as backend requirements. When the source materials do not settle a behavior, label it **Decision needed** and ask the team before implementing it.

## Current implementation: what is real and what is only a prototype

### Separate applications, separate local state

Both are React/Vite applications. The V1 integration connects core workflows to the Django API; the bullets below describe the original pre-integration prototype state and remaining mock surfaces, not the complete current implementation.

- The Patient Portal stores logs, personal goals, provider goals, and the selected demo patient in browser `localStorage`.
- The Doctor Dashboard stores provider goals and doctor accounts in browser `localStorage`; its patient registry, follow-ups, visibility, messages, and profiles are mostly in component state or hard-coded data.
- Therefore, sharing a browser/origin can make selected data appear shared, but there is no actual cross-application persistence, authentication, or authorization.

The important local keys are:

| Key | Current content | Limitation to replace |
| --- | --- | --- |
| `vitalsync_logs_v1` | All patient lifestyle logs, each stamped with `patientUniqueId` | Patient-local only; loose `any[]` data |
| `vitalsync_goals_v1` | Personal wellness goals | Patient-local only |
| `vitalsync_provider_goals_v1` | Provider-assigned goals | Shared browser key, not an authorized clinical source |
| `vitalsync_current_patient_id` | Current demo patient ID; defaults to `VS-0002` | A manual demo selector, not patient authentication |
| `vitalsync_doctor_accounts_v1` | Mock doctor accounts, including plaintext passwords | Not secure/authenticated; registration is local |
| `vitalsync_doctor_summary_logs_<name>` | Generated/legacy doctor-summary fallback logs | Must not be treated as submitted patient data |
| `vitalsync_last_reminder` (session storage) | Last randomly selected wellness reminder | Presentation-only; no backend responsibility |

### Original prototype identity and isolation limitations

The V1 integration addresses these limitations for connected workflows. Use the implementation guide to distinguish completed flows from remaining mock surfaces.

- Patient Portal login is only `useState(false)` in `App.tsx`; it does not identify a patient. The active patient is selected through `vitalsync_current_patient_id`, defaulting to `VS-0002` (John Dela Cruz).
- Doctor login matches email and plaintext password against locally stored mock accounts. It sets `currentDoctor` for display but the registry and most records remain the same regardless of the signed-in doctor.
- The dashboard's patient visibility values are editable in UI but are not used to restrict which patient records a doctor can list/open.
- The patient provider roster and messages are static. Replies are simulated, not persisted.

The backend must derive the current user and their role from authenticated server-side identity. It must never trust a patient ID, doctor ID, role, visibility value, or `assignedBy` name supplied by the browser for authorization.

## Required domain model

Use stable backend IDs internally. The existing `VS-0001`-style `uniqueId` is a patient-facing/clinic-facing identifier and must be unique, but it is not a substitute for an internal primary key. Dates currently use `YYYY-MM-DD`; times use `HH:mm` strings. Preserve these practical API representations unless the integration team agrees on another transport format.

### Accounts and profiles

**Account/User**

- `id`
- role: `doctor` or `patient`
- authentication credentials handled by the chosen backend auth mechanism
- active/authentication status as needed for the prototype

**Doctor profile**

The MVP persists the existing Doctor Dashboard profile workflow:

- editable: name, specialty/role, clinic/organization, professional description (`about`), credential/license text, and the existing dashboard phone field;
- account email is the doctor's authentication identity and is displayed read-only, not edited as profile data;
- the patient-safe provider directory exposes the public profile fields but excludes account email, phone, and editing controls.

Do not add new doctor settings or profile fields beyond the existing workflows. The existing account settings and conversation controls are persisted through the backend: doctors can save clinic, appearance, workspace defaults, and notification preferences; patients can save appearance, accessibility, language, and notification preferences; each account can save per-conversation pin and notification-filter preferences. Doctor defaults are applied when creating a patient. Notification preferences are stored only and do not deliver notifications.

**Patient profile**

Patient-editable fields:

- phone number, home address, emergency contact, date of birth, weight, and height;
- email address through a separate account operation requiring the current password (not through the ordinary profile update);
- profile-picture persistent storage is deferred for the MVP. A browser-only preview is not persistent profile data.

Doctor-managed fields:

- canonical patient name, care focus, patient type (`Out-patient` or `In-patient`), monitoring status/detail, priority, follow-up date, managing doctor, visibility, and selected doctors.

Date of birth is the source of truth. Age is derived from date of birth at display time, is not independently editable, and is not stored as a current demographic value. The legacy `age` database column is not used by the API. `memberSince` may be derived from account creation time; `lastVisit` has no approved persistent source and must not be invented.

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

Archiving does not delete the patient account, historical logs, messages, goals, or monitoring history. It changes the monitoring relationship to inactive. Reactivation locates the existing patient by their unique ID and restores active monitoring rather than creating a duplicate account.

When monitoring is archived:

- preserve every provider-goal record and its existing lifecycle status; do not change it to Paused, Completed, or Cancelled;
- suspend/hide provider-goal work and patient-facing provider monitoring while inactive;
- allow the managing doctor to inspect historical goals, but reject goal changes until monitoring is reactivated;
- show no provider goals or general provider roster to the inactive patient; retain the established managing-doctor conversation only.

While inactive, preserve the workflow invariant:

- patients retain personal lifestyle self-management, history, progress, and personal goals;
- provider-controlled monitoring functions are suspended;
- provider-assigned goals retain their stored status and are not active monitoring work;
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

- Food: meal type, one or more food item strings, optional description, and an image preview. The current persisted log only stores joined food items in `detail` and description in `extra`; the preview is an in-memory object URL and is not persisted.
- Medication: one or more medicine name/dosage/unit entries are concatenated into `detail`.
- Activity: activity name, minutes, optional calories; `payload.activity` and numeric `payload.minutes` are the calculation source. `detail` remains display text.
- Sleep: sleep time, wake time, calculated duration, quality; `payload.sleepTime`, `payload.wakeTime`, numeric `payload.durationMinutes`, and `payload.quality` are structured fields. `extra` remains display text.
- Stress and social: free-text or guided answers joined with ` || `.
- Habit: Alcohol, Cigarettes, Vape, Gambling, and Recreational drugs, currently condensed into display strings.

The API stores the structured log payload unchanged. Patient and doctor summaries and the shared goal evaluator read metric values from payload fields, not by parsing display strings. Missing or invalid activity/sleep measurements are omitted from metric calculations; sleep is never defaulted to eight hours. Older sleep payloads with `sleepTime` and `wakeTime` remain calculable without parsing `extra`. Persistent food-photo storage is deferred for the MVP; do not introduce upload endpoints, object storage, image processing, or media infrastructure, and do not persist browser object URLs.

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

Supported evaluation behavior in the shared frontend evaluator:

- `duration` / `activity`: sum numeric `payload.minutes` per expected day, or aggregate weekly activity.
- `duration` / `sleep`: compare `payload.durationMinutes` (or a duration derived from structured sleep/wake times) to the hours target. Missing or invalid values do not count as sleep hours.
- `indicator` / `food`: presence of a food log counts as the current indicator.
- `occurrence` / `medication`: a structured `payload.medications[].name` contains the configured metric key.
- `reflection`: the matching stress/social/habit log type is submitted.
- `none`: custom/unsupported goal; no automatic evaluation.
- Daily evaluates each day in the start-to-review/reference window; Weekdays only Monday–Friday; Weekly calculates the weekly aggregate target.

The displayed result is measurable target attainment (such as `5/7 days`, `71%`), never a clinical determination of success/failure. **MVP decision:** both frontends use the canonical shared frontend evaluator in `shared/goalEvaluator.ts`; the backend persists and returns authorized structured goals and logs but does not calculate progress. Goals that cannot be reliably evaluated from available structured data are not automatically evaluated.

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
| Auth/session | Sign in/out and identify the authenticated account and role; bootstrap the correct patient or doctor context. Doctors self-register through the existing Doctor Dashboard account-creation flow. Patients change their password after receiving and verifying a one-time code sent to their registered email; doctors confirm their current password. A doctor-created patient account sends login email, a secure temporary password, and short Patient Portal instructions; a temporary-password patient can access only session identification and the email-code/password-change endpoints until the password is changed. General password recovery is outside this MVP. |
| Doctor profile | Persist/edit the signed-in doctor's approved dashboard profile; return a restricted patient-safe profile only to patients authorized to view that provider. |
| Patient profile/registry | Doctors list/open only patients they are authorized to access. Patients read/update only their own approved profile fields. |
| Monitoring relationship | Create/add an active patient monitoring relationship, update visibility/selected doctors, archive, reactivate by existing unique ID, and expose active/inactive state. |
| Provider directory | Return only providers available to the authenticated patient under the assignment/visibility rules, including patient-safe profile fields. |
| Logs | Patient creates/lists their own logs; authorized doctors list a selected patient's logs with date range/filter support. |
| Activity choices | Serve built-in activity choices from the API and persist custom activity choices per authenticated patient; never share one patient's custom choices with another. |
| Summaries | Return logs/aggregates from the same patient data for both apps; never substitute generated mock logs. |
| Provider goals | Authorized doctor creates, lists, updates lifecycle/definition for an authorized patient; patient reads assigned goals only. |
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

The backend teammate should agree API DTOs and error behavior with both frontend members before broad integration. Preserve UI vocabulary where practical: `patientUniqueId`, `Assigned Only`, goal statuses, frequencies, and the existing log types. Stable IDs may change from numeric local IDs to backend IDs, so frontend code must stop assuming `Date.now()` identifiers are globally meaningful.

Suggested integration order:

1. Authenticated session/context and role bootstrap.
2. Doctor registry plus server-enforced visibility and monitoring lifecycle.
3. Patient identity/profile and assigned-provider directory.
4. Lifestyle logs and consistent patient/doctor summaries.
5. Provider goals and personal-goal isolation.
6. Messaging and persisted follow-up updates.
7. Remove/disable mock fallback paths only after the connected endpoint is verified.

During the transition, local data is a migration aid only. Do not merge browser-local and server records indefinitely, and do not call localStorage authoritative after a backend record exists. Seeded demonstration accounts/data are acceptable for interviews if clearly managed as seed data, not client-side mock state.

## Explicitly out of scope

- Realtime sockets, typing synchronization, live unread delivery, push notifications, and notification email/SMS delivery. Email delivery for patient invitations and password-change verification codes remains in scope.
- Group chat.
- Offline sync/conflict resolution.
- ML/SVM, risk scoring, advanced analytics, or clinical decision support.
- A clinical-success/failure conclusion from goal attainment.
- Production-grade compliance certification, audit/compliance systems, enterprise tenancy, high-availability, or scale architecture.
- Persistent food-photo and profile-picture storage for this MVP.
- New logging types, appointment scheduling, medication prescribing, or clinical records not present in the current scope.
- New settings features or broader settings-page redesign beyond persistence of the existing controls.

Basic secure password handling, authenticated sessions, authorization checks, input validation, and server-side data persistence are not “production extras”; they are the minimum needed to correct the prototype's current identity and isolation failure.

## Definition of done for this backend prototype

The backend is ready for the interview prototype when all of the following are demonstrable:

- Signing in as different doctors returns different, server-authorized data; it no longer shows Jamie's data after Rafael signs in merely because UI state changed.
- Signing in as a patient establishes that patient's identity without a browser-selected demo ID.
- Patient visibility (`Assigned Only`, `Selected Doctors`, `All Doctors`) is enforced by the server for registry access, patient workspace access, provider availability, and patient-provider messaging.
- A patient-created lifestyle log persists and becomes visible in the authorized doctor's activity/history/summary using the same underlying record; there are no generated fallback logs in connected views.
- Built-in activity choices are served by the API, and custom activity choices persist for their patient owner only.
- Provider goals can be managed by an authorized doctor and viewed/tracked—but not edited or lifecycle-managed—by the assigned patient.
- Personal goals are visible and mutable only to their owning patient.
- Patient-safe provider profiles are served from provider data and visible only for authorized assigned/involved providers.
- Monitoring history is based on persisted monitoring lifecycle events, and no unknown legacy date or adherence value is fabricated.
- Doctor notes are private to their author; one-to-one doctor Team messages persist between registered doctors.
- Per-doctor patient reminder preferences persist, but do not imply notification delivery.
- Existing doctor/patient account settings and conversation pin/filter preferences persist across reloads; doctor defaults are applied to newly created patients.
- Doctor self-registration and editing of the approved doctor public profile persist in PostgreSQL; account email remains an authentication identity field.
- Patient password changes require a one-time code sent to the registered email and verified by the backend; temporary-password patients cannot use other protected resources until the new password is set. Doctors continue to confirm their current password. General password recovery remains out of scope.
- Messages persist and remain private to the authorized patient/provider pair.
- Archive retains the patient account/history; reactivation uses the existing unique ID and restores monitoring without duplication.
- Inactive-monitoring behavior preserves provider-goal rows and statuses, hides patient-facing provider-goal work, prevents goal changes until reactivation, and limits messaging to the established doctor.
- Follow-up date persists and priority behavior remains consistent with the dashboard.
- Both applications use the agreed service/API contracts without direct localStorage as their authoritative data source.
- The team has manually exercised the core interview paths with at least two doctors and more than one patient, including a denied-access check.

## Confirmed implementation decisions

- Goal evaluation remains in one canonical shared frontend evaluator; Django persists and returns its structured inputs.
- Doctor self-registration is part of the MVP, using the existing Doctor Dashboard registration flow. No separate admin-created-doctor workflow is required.
- The existing doctor profile editing workflow persists the approved profile fields; account email is not editable as profile data, and provider phone/email are not exposed in the patient-safe directory.
- Persistent food-photo and profile-picture storage are deferred. Existing previews are not saved.
- Patient password changes use a registered-email one-time verification code. Temporary-password patients are restricted server-side to the password-change workflow until successful completion.
- Doctors retain the existing current-password-confirmed password change. No unauthenticated password-recovery flow is added.

Persisting the existing settings controls is a development-scope decision, not a research-scope change. It does not authorize adding new profile or settings fields.
