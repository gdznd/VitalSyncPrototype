# VitalSync Backend Guide

## Purpose and prototype boundary

Build the smallest persistent backend that makes the existing Doctor Dashboard and Patient Portal behave as one **interview-ready qualitative-research prototype**. The goal is to replace the two applications' separate mock/local data with one authorized source of truth while preserving the approved workflows.

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

Both are React/Vite applications. Neither calls an API today.

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

### Identity and isolation limitations that the backend must fix

- Patient Portal login is only `useState(false)` in `App.tsx`; it does not identify a patient. The active patient is selected through `vitalsync_current_patient_id`, defaulting to `VS-0002` (John Dela Cruz).
- Doctor login matches email and plaintext password against locally stored mock accounts. It sets `currentDoctor` for display but the registry and most records remain the same regardless of the signed-in doctor.
- The dashboard's patient visibility values are editable in UI but are not used to restrict which patient records a doctor can list/open.
- The patient provider roster and messages are static. Replies are simulated, not persisted.

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

- Doctor self-registration is required for MVP and is separate from patient account provisioning.
- Persisted/editable public doctor profile fields: name, specialty/role, clinic/organization, about/professional description, credentials/license, initials, display color.
- Patient-facing doctor profile is read-only and excludes provider email, phone, and editing controls.
- Doctor account email remains the authentication identity.
- **Broader Doctor Settings:** For MVP backend persistence, only the approved public professional doctor profile fields above require persistence. Broader non-clinical UI preferences or cosmetic settings (such as theme or display preferences) do not require backend persistence for MVP unless explicitly required by the Feature Contract Matrix.

**Patient profile**

Field ownership and permissions:

- **Patient-editable:** Phone number, email address (subject to appropriate authentication/account restrictions; changing login email is an account/authentication operation, not an ordinary profile-field edit), home address, emergency contact, date of birth, weight, height.
- **Doctor-managed:** Patient name (patient does not directly edit the canonical patient name through Patient Portal profile editing), care focus, patient type, monitoring status/detail, priority, follow-up date, managing doctor, visibility, selected doctors.

**Date of Birth / Age:**
- Date of birth is the source of truth.
- Age is derived from DOB and is not independently editable/stored as a user-entered field.
- Patient can edit DOB.

**Persistent Photos:**
- Persistent food-photo upload/storage is deferred from MVP.
- Persistent profile-picture storage is deferred from MVP.
- No media-storage infrastructure is required for MVP.

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
| Selected Doctors | The managing doctor plus explicitly selected additional doctors. The managing doctor ALWAYS retains access and cannot remove their own access through the Selected Doctors list. |
| All Doctors | Every authenticated doctor in this prototype |

Patient-facing provider availability must be derived from the same relationship/visibility data, not from the current static provider list. Patients cannot add or remove providers themselves.

**Archive/Reactivation and Provider Goals:**
- Archiving a patient preserves provider-goal records and their existing lifecycle status.
- Do not automatically change goals to Paused, Completed, or Cancelled because of archiving.
- Provider-goal workflow is suspended/hidden while inactive and restored on reactivation.
- Archiving does not delete the patient account, historical logs, messages, goals, or monitoring history. Reactivation locates the existing patient by their unique ID and restores active monitoring rather than creating a duplicate account.

While inactive, preserve the workflow invariant:

- patients retain personal lifestyle self-management, history, progress, and personal goals;
- provider-controlled monitoring functions are suspended;
- provider-assigned goals remain preserved with their existing lifecycle status while inactive;
- patient messaging is limited to the previous/established doctor conversation.

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
  extra?: string
}
```

The Portal currently records the following input behavior:

- Food: meal type, one or more food item strings, optional description. Image preview/upload is deferred from MVP.
- Medication: one or more medicine name/dosage/unit entries are concatenated into `detail`.
- Activity: activity name, minutes, optional calories; duration is serialized as `"N minutes"` in `detail`.
- Sleep: sleep time, wake time, calculated duration, quality; duration/quality are serialized into `extra`.
- Stress and social: free-text or guided answers joined with ` || `.
- Habit: Alcohol, Cigarettes, Vape, Gambling, and Recreational drugs, currently condensed into display strings.

The backend must preserve structured data for the listed workflows. Store the fields required by actual forms in typed log payloads/records and return a UI-compatible projection.

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

### Personal Wellness Goals

Current personal-goal shape is the provider-goal shape without `assignedBy` and evaluator configuration. Patients create them from templates or a custom form and may edit, pause/resume, or cancel them. They are private to the patient and **never visible to doctors**.

Do not merge personal and provider goals into one permission model just because their fields resemble each other. A shared storage/table implementation is possible only if ownership, source (`personal` vs `provider`), and server-enforced access rules remain unambiguous. The current personal-goal progress bar is manually stored as `progressPercent`; it is not governed by the provider-goal automatic evaluation rules.

### Messages

The current Patient Portal has one-to-one conversations with a static assigned-provider subset and message objects shaped as:

```ts
{ id: number, sender: 'patient' | 'doctor' | 'nurse', text: string, time: string, important: boolean }
```

The Doctor Dashboard has a separate prototype message view/state. Neither side persists or shares messages.

For the backend, model a private patient-provider conversation and its messages. Each message needs at least conversation identity, sender account identity, text/body, timestamp, and the current `important` flag. Determine sender role from the authenticated account, not a request value. A patient may access only conversations with providers made available through their assignment/visibility; an authorized provider may access only their permitted patient conversations. Team messaging is separate from patient messaging and is not part of this implementation.

The patient UI's pinning, notification-filter dropdown, simulated typing, unread dots, and automatic reply are presentation/prototype behavior—not backend requirements. Realtime delivery, typing, push notifications, and group chats are deferred.

### Summaries and follow-ups

Patient and doctor summaries must be derived from the same authorized patient logs. The existing displays calculate meals logged/missed, medication-entry count, activity minutes and favorites, average sleep, reflection/habit counts, date-filtered history, and simple encouraging observations.

The Doctor Dashboard's `RecentActivitySummary` first reads `vitalsync_logs_v1`, then falls back to legacy/generated logs. The backend integration must remove that fallback for connected views: no invented default data may be presented as the patient's submitted history. Empty states are preferable to fabricated logs.

Follow-up currently consists of a patient `followUpDate`; the dashboard computes priority from it: past = High, due within three days = Medium, otherwise Low. Persist the date. The derived priority can remain frontend logic or be returned by the server, but only one source should drive the display. No appointment scheduling workflow is currently specified.

## Minimum API/service responsibilities

Exact URL names and framework are implementation choices. Provide a clear service surface that supports the following authorized operations.

| Area | Required responsibility |
| --- | --- |
| Auth/session | Sign in/out and identify the authenticated account and role; bootstrap the correct patient or doctor context. Doctor creates patient account via email with secure temporary password (first-login password change); support Patient Portal Change Password workflow via email verification code (short-lived, single-use, secure verification and update). Separate from doctor self-registration. |
| Doctor profile | Return/edit the signed-in doctor's dashboard profile as supported (name, specialty/role, clinic/organization, about/professional description, credentials/license); return a restricted patient-safe profile only to patients authorized to view that provider. (Broader non-clinical UI settings persistence excluded for MVP). |
| Patient profile/registry | Doctors list/open only patients they are authorized to access. Patients read/update only their own approved profile fields (including editable DOB). |
| Monitoring relationship | Create/add an active patient monitoring relationship, update visibility/selected doctors (retaining managing doctor access), archive (preserving goals and lifecycle status), reactivate by existing unique ID, and expose active/inactive state. |
| Provider directory | Return only providers available to the authenticated patient under the assignment/visibility rules, including patient-safe profile fields. |
| Logs | Patient creates/lists their own logs; authorized doctors list a selected patient's logs with date range/filter support. |
| Summaries | Return logs/aggregates from the same patient data for both apps; never substitute generated mock logs. |
| Provider goals | Authorized doctor creates, lists, updates lifecycle/definition for an authorized patient; patient reads assigned goals only. (Backend stores records without calculating progress in MVP). |
| Personal goals | Patient-only create/read/update/cancel; never expose them in doctor APIs or summaries. |
| Messages | List/create messages in authorized private patient-provider conversations; stable chronological ordering and persisted timestamps. |
| Follow-up | Authorized doctor reads/updates the patient's follow-up date; dashboard can derive or receive priority. |

Where useful, provide a patient-workspace/doctor-patient-detail read model so a dashboard screen does not need a waterfall of requests. This is an optimization, not permission to create a second source of truth. Every response must apply the same server-side authorization rules.

## Role isolation checklist

### Patient

- Can authenticate as exactly one patient account.
- Can read/write only their own logs, personal goals, and approved profile fields.
- Can read, but not alter, provider goals assigned to them.
- Can read only authorized providers and private conversations with those providers.
- Cannot access another patient's identifiers, logs, messages, goals, monitoring status, or provider-selection controls.
- Cannot see other patients or any doctor-only monitoring/registry data.

### Doctor

- Can authenticate as their own doctor profile.
- Can see only patients allowed by that patient's monitoring visibility.
- Can manage provider goals, follow-up, monitoring lifecycle, and visibility only for an authorized patient.
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

- Realtime sockets, typing synchronization, live unread delivery, push notifications, and email/SMS delivery.
- Group chats/team chat.
- Offline sync/conflict resolution.
- ML/SVM, risk scoring, advanced analytics, or clinical decision support.
- A clinical-success/failure conclusion from goal attainment.
- Production-grade compliance certification, audit/compliance systems, enterprise tenancy, high-availability, or scale architecture.
- Food-photo persistence / media storage infrastructure.
- New logging types, appointment scheduling, medication prescribing, or clinical records not present in the current scope.
- Functional dark-mode/settings polish and profile-picture work.
- Forgot-password workflow (out of scope for MVP).

Basic secure password handling, authenticated sessions, authorization checks, input validation, and server-side data persistence are not “production extras”; they are the minimum needed to correct the prototype's current identity and isolation failure.

## Definition of done for this backend prototype

The backend is ready for the interview prototype when all of the following are demonstrable:

- Signing in as different doctors returns different, server-authorized data; it no longer shows Jamie's data after Rafael signs in merely because UI state changed.
- Signing in as a patient establishes that patient's identity without a browser-selected demo ID.
- Patient visibility (`Assigned Only`, `Selected Doctors`, `All Doctors`) is enforced by the server for registry access, patient workspace access, provider availability, and patient-provider messaging, with managing doctor access always retained under Selected Doctors.
- A patient-created lifestyle log persists and becomes visible in the authorized doctor's activity/history/summary using the same underlying record; there are no generated fallback logs in connected views.
- Provider goals can be managed by an authorized doctor and viewed/tracked—but not edited or lifecycle-managed—by the assigned patient (with progress evaluated on the frontend).
- Personal goals are visible and mutable only to their owning patient.
- Patient-safe provider profiles are served from provider data and visible only for authorized assigned/involved providers.
- Messages persist and remain private to the authorized patient/provider pair.
- Archive retains the patient account/history, preserves provider goals and existing lifecycle status without automatic modification, and reactivation uses the existing unique ID and restores monitoring without duplication.
- Inactive-monitoring behavior follows the documented access rules.
- Follow-up date persists and priority behavior remains consistent with the dashboard.
- Both applications use the agreed service/API contracts without direct localStorage as their authoritative data source.
- The team has manually exercised the core interview paths with at least two doctors and more than one patient, including a denied-access check.

## Decisions needed before or during implementation

*(All core architectural and feature decisions are resolved. No blocking decisions remain for MVP backend implementation.)*

Do not let any unresolved item block the core authorized data flow. Record the decision, implement the minimal approved version, and keep unapproved expansion out of the prototype.
