# VitalSync Workflow

## 1. Purpose

This document defines the intended end-to-end workflows of the VitalSync Doctor Dashboard and Patient Portal.

The Feature Contract Matrix is the primary source of truth for feature/workflow coverage between the two applications before backend development. The current prototype uses mock/local state; backend, authentication, persistence, and production data synchronization are not yet implemented.

## 2. Workflow Principles

- VitalSync uses two role-specific applications:
  - **Doctor Dashboard** — clinic and patient-management workspace.
  - **Patient Portal** — patient-facing logging, progress, goals, messaging, and profile workspace.
- Workflows are organized around the patient and their monitoring lifecycle.
- Doctor-side patient management begins from the Patient Registry.
- A selected patient opens a patient workspace containing **Overview**, **Messages**, **Goals**, and **History**.
- Patient records can be archived when monitoring ends and reactivated when monitoring is needed again.
- Patient visibility is controlled by the doctor using:
  - **Assigned Only**
  - **Selected Doctors**
  - **All Doctors**
- Team communication is separate from patient communication.
- Patient goals have two distinct types:
  - **Provider-assigned goals** — assigned and controlled by the doctor for the patient's monitoring plan.
  - **Personal Wellness Goals** — created and managed by the patient for themselves; these are not visible to doctors.
- These two goal types must not be conflated. The Feature Contract Matrix is the source of truth for their required behavior.
- Prototype behavior is implemented with mock/local data. Backend integration should preserve these workflows rather than redesign them.

---

# 3. Doctor Dashboard Workflow

## 3.1 Doctor Login / Patient Account Creation

**Primary driver:** Doctor → Patient

1. The doctor initiates the patient-account workflow.
2. A patient account is created/added for monitoring.
3. The patient receives the account/access information through the intended communication channel.
4. The patient uses the received credentials/account information to access the Patient Portal.

### Current prototype defaults

The Feature Contract Matrix records the following prototype/default assumptions:

- A Unique ID is generated for the patient.
- Default patient type is **Outpatient**.
- Default visibility is **Assigned Only**.
- Default follow-up is 7 days after assignment.
- Default priority is **Low** when the default follow-up is 7 days away.
- Care focus defaults to `--`.
- Multiple care focuses are intended to be supported in the future/current workflow direction.

Authentication and persistent account creation remain backend responsibilities.

---

## 3.2 Patient Registry

**Primary driver:** Doctor

The Patient Registry is the doctor's entry point for active patient monitoring.

1. Doctor opens **Patient Registry**.
2. Active patients are displayed.
3. Doctor may switch between:
   - Outpatient
   - Inpatient
4. Doctor may search patients by name.
5. Doctor selects a patient.
6. The patient is opened in the Patient Workspace.

Only active patients are displayed in the active registry.

---

## 3.3 Add New Patient

**Primary driver:** Doctor

1. Doctor selects **Add patient**.
2. Doctor chooses **Add New Patient**.
3. Doctor enters the patient's information.
4. The system creates a patient record and places the patient into active monitoring.
5. The patient becomes available in the Patient Registry.

The current prototype supports patient name and email and has support for a contact number in the patient creation flow.

---

## 3.4 Add Existing Patient / Reactivate Monitoring

**Primary driver:** Doctor → Patient

This workflow is used when an existing inactive patient needs monitoring again.

1. Doctor selects **Add patient**.
2. Doctor chooses **Add Existing Patient**.
3. Doctor searches inactive patients by name.
4. Active patients are excluded from the inactive-patient search.
5. Search results show:
   - Patient name
   - Unique ID
   - Patient status
   - Managing doctor when applicable
6. Doctor selects a patient from the results.
7. A confirmation step appears.
8. On confirmation, the patient's Unique ID is auto-filled.
9. Doctor confirms reactivation.
10. The patient's monitoring becomes active again.

The patient's existing account and history remain available; reactivation changes the monitoring state rather than creating a duplicate patient account.

---

## 3.5 Team

**Primary driver:** Doctor / Clinic Team

The **Team** area is for internal communication between doctors and/or medical staff.

1. Doctor remains in the clinic-level workspace.
2. Doctor selects **Team** from the visible clinic navigation.
3. Doctor selects a team member.
4. Doctor communicates with another doctor or medical staff member through the team conversation.

Team messaging is distinct from patient messaging.

The current prototype contains a Team view and exposes **Team** in the clinic-level `mode-nav`.

---

# 4. Doctor Patient Workspace

## 4.1 Opening a Patient

1. Doctor selects a patient from the Patient Registry.
2. VitalSync opens that patient's workspace.
3. The navigation changes to the patient context.
4. Available patient-context sections are:
   - **Overview**
   - **Messages**
   - **Goals**
   - **History**
5. **Return to Registry** exits the patient workspace and returns to the Patient Registry.

The selected patient remains the context for these patient-specific views.

---

## 4.2 Patient Overview

**Primary driver:** Doctor

The Overview provides the doctor with the patient's monitoring information and current activity.

The doctor can view/edit relevant patient information, including:

- Unique ID
- Patient type
- Follow-up date
- Priority level
- Care focus
- Visibility/assignment information
- Recent activity
- Today's log information

### Follow-up workflow

1. Doctor selects/changes the patient's follow-up date.
2. VitalSync updates the follow-up date.
3. Priority is derived from the follow-up date:
   - Past due → **High**
   - Within 3 days → **Medium**
   - More than 3 days away → **Low**

The prototype calculates this priority locally.

### Recent activity

The Overview contains a **Recent Activity Summary** showing recent patient submissions/check-ins.

The activity view supports selectable periods such as:

- Today
- Past 3 days
- Past week
- Past month

The Feature Contract Matrix identifies the existence/details of the activity summary as an area that may still require confirmation.

---

## 4.3 Patient Visibility

**Primary driver:** Doctor

The doctor controls which other doctors can access the patient.

Available visibility options:

1. **Assigned Only**
2. **Selected Doctors**
3. **All Doctors**

When **Selected Doctors** is chosen:

1. Doctor selects the visibility option.
2. A doctor-selection control opens.
3. Doctor selects the permitted doctors.
4. The selected doctors are stored as the patient's visibility assignment.

The visibility control is intended to remain doctor-controlled.

---

## 4.4 Patient Messaging

**Primary driver:** Both doctor and patient

Patient messaging is a private communication channel between a doctor and patient.

### Doctor side

1. Doctor opens a patient's **Messages** view or chooses **Contact**.
2. Doctor opens the secure conversation.
3. Doctor reviews previous messages.
4. Doctor sends a message.
5. Messages remain part of the patient's communication history.

The prototype also includes conversation-list behavior such as latest-message previews and unread indication.

### Patient side

1. Patient opens **Messages**.
2. Patient selects an available assigned provider.
3. Patient reviews the private conversation.
4. Patient sends a message to the provider.

The intended workflow allows communication with one or multiple assigned doctors/providers. The patient does not control which providers are assigned to the patient; provider assignment/visibility is controlled from the doctor/clinic side.

---

## 4.5 Patient History

**Primary driver:** Doctor

1. Doctor opens a patient's **History** view.
2. VitalSync displays relevant monitoring episodes.
3. Current and previous monitoring records can be reviewed.
4. Historical records remain available after a monitoring episode is archived.

The prototype represents history as monitoring episodes containing information such as:

- Care focus
- Monitoring period
- Assigned clinician
- Status
- Notes
- Adherence

History access is restricted to the assigned/authorized care workflow.

---

# 5. Archive and Reactivation Lifecycle

VitalSync treats monitoring status as a lifecycle rather than deleting the patient account.

## 5.1 Active Monitoring

An active patient:

- Appears in the active Patient Registry.
- Can have monitoring activity recorded.
- Can have follow-up information updated.
- Can have visibility assignments managed.
- Can participate in patient communication.

## 5.2 Archive Monitoring

**Primary driver:** Doctor

1. Doctor opens the patient's workspace.
2. Doctor selects **Archive monitoring**.
3. A confirmation step should prevent accidental archival.
4. The monitoring record becomes inactive/archived.
5. The patient's account and historical information remain available.
6. The patient is removed from the active monitoring registry.

The Feature Contract Matrix describes archived monitoring records as retaining monitoring start/end dates and other historical information.

Deletion of historical monitoring records is not established as a current workflow.

## 5.3 Reactivate Monitoring

**Primary driver:** Doctor → Patient

1. Doctor starts the Add Existing Patient workflow.
2. Doctor searches inactive patients.
3. Doctor selects and confirms the existing patient.
4. The existing account is reactivated for monitoring.
5. The patient returns to the active monitoring workflow.

## 5.4 Inactive Patient Portal Access

Archiving a patient's active lifestyle monitoring does **not** deactivate the patient's VitalSync account.

An inactive patient may continue using the Patient Portal for personal lifestyle self-management.

### Inactive patient access

- The patient can still log into the Patient Portal.
- The patient can continue recording lifestyle information for themselves.
- Personal history remains available.
- Personal progress/summary remains available for self-monitoring.
- Personal Wellness Goals remain available and patient-managed.
- The patient is no longer under active doctor monitoring until reactivation.
- Provider-controlled monitoring functions are suspended while the patient is inactive.

### Provider-assigned Goals

When the patient is inactive, provider-assigned goals are no longer active monitoring tasks.

The Goals area should communicate the transition with a supportive message such as:

> **“You’ve completed your active lifestyle monitoring. Keep up the great work!”**

The exact final UI wording may be refined without changing the underlying workflow.

### Messages

While inactive, the patient's messaging access is limited to their previous doctor/established doctor conversation.

The patient cannot independently add new doctors or staff to their available provider conversations while inactive.

### Reactivation

When a doctor reactivates the patient's monitoring:

1. The existing patient account remains in use.
2. The patient returns to active monitoring.
3. Provider-controlled monitoring functions become active again.
4. Provider assignment/visibility and provider communication follow the active monitoring workflow.

The inactive state therefore represents **inactive clinical monitoring**, not an inactive patient account.

---

# 6. Doctor Goals → Patient Workflow

**Primary driver:** Doctor → Patient

Goals are part of the patient's active monitoring plan.

1. Doctor selects a patient.
2. Doctor assigns monitoring goals to the patient.
3. The patient receives/displays the assigned goals in the Patient Portal.
4. Patient works toward the assigned goals during active monitoring.
5. Goal progress/winning conditions are reflected in the patient-facing workflow.

### Goal ownership and authority

**Provider-assigned goals** are authoritative within the doctor's monitoring plan.

- The doctor assigns and controls the provider goal definition, target, frequency, dates, instructions, and status.
- The patient can view and track progress toward provider-assigned goals.
- The patient does not edit, pause, complete, cancel, archive, or delete provider-assigned goals.

**Personal Wellness Goals** are separate patient-owned goals.

- The patient creates and manages these goals for themselves.
- Doctors cannot see personal wellness goals.
- The patient may cancel a personal wellness goal at any time.
- Personal Wellness Goals must remain separate from provider-assigned goals in the data model and UI.

### Provider Goal Evaluation MVP

Provider-assigned goals may use automated progress and target-attainment evaluation when corresponding structured patient log data is available.

- **MVP Evaluation Types:**
  - Nutrition/Food → structured indicator
  - Physical Activity → duration
  - Sleep → duration
  - Medication → qualifying medication occurrence
  - Stress/Social/Habit → assigned reflection submission
  - Custom/unsupported goals → no automatic evaluation
- **Frequency Evaluation Rules:**
  - Daily goals evaluate expected days on which the target is met.
  - Weekdays goals evaluate Monday–Friday expected days.
  - Weekly goals evaluate against the applicable weekly aggregate target.
- **Progress Expression:** Expressed as measurable target attainment (e.g., 5/7 days and 71%).
- **Clinical Boundary:** The system must not determine clinical success or failure. Clinical interpretation remains solely with the doctor.
- **Source Data:** Automated evaluation uses the patient's structured lifestyle logs as the source data (not the Doctor Dashboard mock summary-log store).

The complete goal-setting workflow remains a prototype/mock-data workflow until backend persistence and synchronization are implemented.

---

# 7. Patient Portal Workflow

## 7.1 Login

1. Patient receives/accesses their VitalSync account.
2. Patient opens the Patient Portal.
3. Patient enters login credentials.
4. Successful authentication opens the patient home page.
5. Unauthenticated users are redirected to the login page.

The current prototype uses client-side sign-in state. Production authentication is a backend responsibility.

---

## 7.2 Home / Daily Logging

**Primary driver:** Patient → Doctor

1. Patient opens **Home**.
2. Patient records daily lifestyle information.
3. Submitted logs become part of the patient's monitoring data.
4. The doctor is intended to receive/view those logs through the Doctor Dashboard.
5. Doctor-side daily-log/activity information should correspond to the patient's submitted data.

The Feature Contract Matrix specifically requires the patient logs and doctor-facing daily logs/activity summary to mirror one another.

Medication presets may be configured by the doctor for patient use.

### Structured Daily Logging

Under PLogs1, daily logging utilizes structured fields and requirements:

- **Food:** Food items plus structured food/hydration indicators.
- **Medication:** Medicine name and dosage.
- **Physical Activity:** Activity duration/time rather than calorie-burn estimates.
- **Sleep:** Sleep duration/time.
- **Lifestyle reflections:** Optional by default; doctors may assign selected reflection types as monitoring tasks.
- **Evaluation & Views:** Structured log data supports corresponding doctor-facing activity/summary views and applicable automated goal-progress evaluation.

---

## 7.3 Summary

**Primary driver:** Patient → Doctor

1. Patient opens **Summary**.
2. VitalSync summarizes the patient's activity/progress during monitoring.
3. The patient reviews their progress.
4. The corresponding doctor-facing summary should reflect the same underlying patient activity.

The Doctor Dashboard and Patient Portal summaries should remain consistent rather than representing unrelated calculations.

---

## 7.4 Goals

**Primary driver:** Doctor → Patient / Patient → Self

The Patient Portal's Goals area contains two distinct goal types.

### Provider-assigned goals

1. Doctor assigns goals during patient monitoring.
2. Patient opens **Goals**.
3. Patient views the goals assigned by the doctor.
4. Patient works toward those goals.
5. Progress/winning conditions are reflected in the goal workflow (using automated evaluation against structured lifestyle logs when available, expressed as measurable target attainment).
6. The patient cannot modify the provider-assigned goal definition or status.

### Personal Wellness Goals

1. Patient opens **Goals**.
2. Patient creates a personal wellness goal for themselves, using the available goal templates or build-your-own flow.
3. Patient configures and manages the personal goal.
4. Progress/winning conditions are reflected where applicable.
5. Patient may cancel a personal wellness goal at any time.
6. Personal Wellness Goals are not visible to doctors.

---

## 7.5 Messages

**Primary driver:** Both

1. Patient opens **Messages**.
2. Patient sees assigned/involved providers available for communication.
3. Patient selects a provider.
4. Patient reviews the private conversation.
5. Patient sends a message.
6. Doctor receives and can respond through the Doctor Dashboard.

Provider availability is determined by assignment/visibility rather than by the patient independently managing their provider list.

---

## 7.6 Profile

**Primary driver:** Patient

The Patient Profile allows the patient to view/edit their own appropriate profile information and review their lifestyle overview.

The profile should remain consistent with patient information visible to authorized doctors.

The Feature Contract Matrix specifies that:

- **Member since** represents account creation.
- **Last visit** represents the latest follow-up.
- **Primary Physician** may change when another doctor activates/reactivates the patient's monitoring.
- The patient's health summary can contain patient-editable information such as weight and height.
- Conditions are assigned by the doctor through care focus.

---

# 8. Cross-Application Workflows

## 8.1 Patient Data Flow

```text
Doctor Dashboard
      │
      ├── Patient account / monitoring
      ├── Patient information
      ├── Follow-up
      ├── Visibility / provider assignment
      └── Goals
             │
             ▼
       Patient Portal
             │
             ├── Daily logs
             ├── Summary
             ├── Assigned goals
             └── Messages
             │
             ▼
       Doctor Dashboard
             │
             ├── Activity / logs
             ├── Summary
             ├── Progress monitoring
             └── Patient communication
```

The exact production synchronization mechanism is a backend concern and is not implemented in the current prototype.

---

## 8.2 Doctor Assignment / Visibility

```text
Doctor
  ↓
Select patient
  ↓
Set visibility
  ├── Assigned Only
  ├── Selected Doctors → choose doctors
  └── All Doctors
  ↓
Authorized doctors/providers can access or communicate
according to the resulting assignment
```

---

## 8.3 Monitoring Lifecycle

```text
Create / Add Patient
        ↓
Active Monitoring
        ↓
Monitor logs, activity, goals, follow-up
        ↓
Archive Monitoring
        ↓
Historical Record Retained
        ↓
Reactivate if monitoring is needed again
        ↓
Active Monitoring
```

---

# 9. Workflow Invariants

The following behaviors should remain stable during frontend refactoring and later backend integration.

### Patient context

- Selecting a patient opens the patient's workspace.
- Patient workspace contains Overview, Messages, Goals, and History.
- Returning from the patient workspace returns to the Patient Registry.

### Patient lifecycle

- Active and inactive monitoring states are distinct.
- Archiving monitoring does not delete the patient account/history.
- Reactivation uses the existing patient account rather than creating a duplicate.
- An inactive patient retains access to the Patient Portal for personal lifestyle self-management.
- Personal history, progress, and Personal Wellness Goals remain available while inactive.
- Provider-controlled monitoring functions are suspended while inactive.
- Inactive messaging access is limited to the patient's previous doctor/established doctor conversation.

### Visibility

- Visibility is doctor-controlled.
- Supported values are Assigned Only, Selected Doctors, and All Doctors.
- Selected Doctors requires an explicit doctor selection.

### Messaging

- Patient messaging is private.
- Team messaging is separate from patient messaging.
- Patients communicate with providers made available through their assignment/visibility.

### Goals

- Provider-assigned goals are the authoritative goals for the doctor's monitoring plan.
- Patients can view and track provider-assigned goals but cannot modify their definition or status.
- Personal Wellness Goals are patient-owned and managed separately from provider-assigned goals.
- Doctors cannot see Personal Wellness Goals.
- Patients may cancel their own Personal Wellness Goals at any time.
- Goal progress/winning conditions follow automated target-attainment evaluation (MVP rules across nutrition, physical activity, sleep, medication, and reflections, respecting daily/weekdays/weekly frequency rules).
- The system must not determine clinical success or failure; clinical interpretation remains with the doctor.

### Data consistency

- Patient logs shown to doctors should correspond to the patient's submitted logs.
- Patient and doctor summaries should reflect the same underlying activity.
- Doctor profile information shown to patients should mirror the relevant doctor profile data.

### Backend boundary

The prototype should be able to transition from:

```text
UI
 ↓
Refactored Frontend
 ↓
Mock / Local Data
```

to:

```text
UI
 ↓
Refactored Frontend
 ↓
Service Layer
 ↓
API
 ↓
Database
```

without changing the established user workflows.

---

# 10. Prototype vs Backend Status

The current prototype demonstrates the workflow using mock/local state.

The Feature Contract Matrix currently marks backend and testing work as incomplete. Backend work will need to implement the persistent versions of the same workflows, including:

- Authentication
- Patient accounts
- Patient/doctor assignments
- Visibility
- Monitoring records
- Follow-ups
- Goals
- Patient logs
- Summaries
- Messaging
- Profiles
- Archive/reactivation

Backend development should treat this workflow document and the Feature Contract Matrix as behavioral references rather than introducing a separate workflow model.

---

# 11. Deferred Features

The Feature Contract Matrix Parking Lot explicitly defers:

- **Group chats** → v2
- **Realtime updates** → v2
- **Push notifications** → v2
- **Offline sync** → v3

These are not part of the current core workflow and should not be introduced during the current frontend refactor unless separately approved.
