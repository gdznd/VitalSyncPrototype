# VitalSync

VitalSync is an **interview-ready qualitative-research prototype** for a Lifestyle Medicine clinic. It consists of two role-specific web applications:

- **Doctor Dashboard** — for patient monitoring, provider-assigned goals, patient activity summaries, messaging, follow-up, visibility, and monitoring lifecycle.
- **Patient Portal** — for daily lifestyle logging, activity summaries, provider-assigned goals, personal wellness goals, messaging, and profile management.

The current system is a frontend prototype using mock/local data. A backend is being developed to provide authenticated identity, server-enforced authorization, persistent data, and shared data between the two applications.

> **Prototype status:** Interview-ready frontend prototype → backend integration in progress  
> **Not production-ready:** VitalSync is not currently a production healthcare platform.

---

## Repository Structure

```text
VitalSyncPrototype/
├── doctor-dashboard/       # Doctor Dashboard React/Vite application
├── patient-portal/         # Patient Portal React/Vite application
│
├── BACKEND.md              # Backend implementation guide
├── ARCHITECTURE.md         # System architecture and technical structure
├── WORKFLOW.md             # Approved user workflows
├── REFACTOR_PLAN.md        # Frontend refactoring plan
├── FeatureContractMatrix.xlsx
│                           # Authoritative feature contract
└── README.md               # Repository overview
```

---

## Core Prototype Features

### Doctor Dashboard

- Doctor authentication prototype
- Patient registry
- Patient monitoring workspace
- Patient visibility and doctor assignment
- Provider-assigned goals
- Patient activity and lifestyle summaries
- Doctor-patient messaging
- Team messaging
- Follow-up tracking
- Patient archive/reactivation workflow
- Doctor profile

### Patient Portal

- Patient login prototype
- Home and daily lifestyle logging
- Food logging
- Medication logging
- Physical activity logging
- Sleep logging
- Stress reflections
- Social connectedness reflections
- Habit questionnaire
- Activity summary
- Provider-assigned goals
- Personal Wellness Goals
- Doctor/provider messaging
- Provider profiles
- Patient profile and settings

---

## Goal Model

VitalSync intentionally separates two types of goals.

### Provider-Assigned Goals

Goals created and managed by an authorized doctor as part of the patient's monitoring plan.

Patients can:

- View assigned goals
- Track measurable progress

Patients cannot:

- Modify the goal definition
- Change its lifecycle status

### Personal Wellness Goals

Goals created and managed by the patient for their own wellness.

Personal goals are private to the patient and are **not visible to doctors**.

---

## Current Architecture

VitalSync currently consists of two separate React/Vite applications using TypeScript.

The prototype currently uses browser-local/mock data for selected workflows. This allows the frontend workflows and interface to be demonstrated independently while the backend is developed.

The planned backend will become the shared source of truth for:

- Authentication and identity
- Role-based authorization
- Patient monitoring relationships
- Patient visibility
- Lifestyle logs
- Provider-assigned goals
- Personal goals
- Messaging
- Follow-ups
- Provider profiles
- Archive/reactivation

See [`BACKEND.md`](./BACKEND.md) for the backend implementation scope.

---

## Documentation

The project documentation follows this authority structure:

1. **Feature Contract Matrix** — authoritative feature and workflow contract
2. **Stakeholder/adviser decisions**
3. [`WORKFLOW.md`](./WORKFLOW.md) — approved user workflows
4. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system architecture
5. [`REFACTOR_PLAN.md`](./REFACTOR_PLAN.md) — frontend refactoring plan
6. [`BACKEND.md`](./BACKEND.md) — backend implementation guide

The Feature Contract Matrix is the primary source of truth for approved functionality.

When documentation or implementation conflicts with the Matrix or an explicit stakeholder decision, the higher-level source takes precedence.

---

## Development

### Prerequisites

- Node.js
- npm

Each frontend application has its own package configuration.

### Doctor Dashboard

```bash
cd doctor-dashboard
npm install
npm run dev
```

### Patient Portal

```bash
cd patient-portal
npm install
npm run dev
```

The applications may run on separate local development ports.

---

## Prototype Data

The current frontend prototype uses browser-local/mock data for selected workflows.

Important prototype storage includes:

- `vitalsync_logs_v1`
- `vitalsync_goals_v1`
- `vitalsync_provider_goals_v1`
- `vitalsync_current_patient_id`

These values are **not the final backend data source**.

Generated/fallback demonstration data must not be treated as real submitted patient history once a connected backend workflow is implemented.

---

## Backend Integration

Backend development is being performed against the existing frontend workflows rather than redesigning them.

The backend MVP is intended to provide:

- Authenticated user identity
- Doctor/patient role isolation
- Server-enforced patient visibility
- Persistent patient lifestyle logs
- Provider/personal goal separation
- Authorized patient-provider messaging
- Patient monitoring lifecycle
- Follow-up persistence
- Patient-safe provider profiles
- Shared data between the Doctor Dashboard and Patient Portal

See [`BACKEND.md`](./BACKEND.md) for the detailed backend assignment.

---

## Out of Scope

The current prototype does not include:

- Realtime messaging
- Push notifications
- Group chats
- Offline synchronization
- ML/SVM or advanced analytics
- Clinical decision support
- Clinical success/failure determinations from goal progress
- Production-scale infrastructure
- Enterprise tenancy
- Production compliance/certification systems
- Appointment scheduling
- Medication prescribing
- Additional clinical record systems outside the approved scope

These may be considered separately but are not part of the current interview-ready prototype target.

---

## Project Status

VitalSync is currently transitioning from a **feature-frozen frontend prototype** toward an **interview-ready integrated prototype**.

Current priorities:

1. Preserve the approved frontend workflows.
2. Refactor the frontend into a maintainable structure.
3. Develop the MVP backend.
4. Connect both frontend applications to the backend.
5. Verify identity, authorization, persistence, and cross-application consistency.
6. Conduct manual interview-path testing.

The goal is a focused research prototype that demonstrates the intended Lifestyle Medicine clinic workflows—not a production healthcare information system.
