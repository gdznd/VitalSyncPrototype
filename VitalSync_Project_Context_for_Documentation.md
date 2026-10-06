# VitalSync — Project Context for Documentation

> Handoff/context reference for a separate ChatGPT conversation focused on the VitalSync capstone manuscript, especially Capstone 2 revisions to Chapters 1–5.
>
> This is not a replacement for the Feature Contract Matrix, Workflow, Architecture, or source code. Those remain authoritative where applicable.

## 1. Project Identity

**Project:** VitalSync

**Purpose:** A Lifestyle Medicine monitoring platform designed around the workflow of healthcare providers caring for individual patients.

The current system has two role-specific applications:

1. **Doctor Dashboard** — web application for physicians/healthcare staff.
2. **Patient Portal** — Progressive Web App (PWA) for patients.

The project is currently a capstone prototype/MVP, with backend integration planned after the frontend/prototype phase.

## 2. Capstone 1 → Capstone 2 Context

Chapters 1–5 already existed as part of the **Capstone 1 project proposal**. For Capstone 2, those chapters will be revised because the system changed substantially through stakeholder-driven iterations.

The project underwent **five rounds of stakeholder interviews**, with each round producing meaningful revisions to workflow, UI, information architecture, and/or system direction.

The adviser meeting brief was prepared before the adviser showcase. It documented Version 4 as the latest fully implemented prototype at that time, while fifth-round recommendations were pending implementation. **Do not treat that historical Version 4 status as the current status if later project context or implementation supersedes it.**

## 3. Evolution Through Five Iterations

### Iteration 1
Initial prototype based on the original proposal.

### Iteration 2 — Lifestyle Medicine Alignment

Stakeholder feedback emphasized applicable Lifestyle Medicine pillars rather than identical logs for every patient.

The documented six pillars were:

- Nutrition
- Physical Activity
- Sleep
- Stress
- Social Connectedness
- Smoking and Alcohol

Doctors could determine which pillars were applicable for each patient. The system became more individualized.

### Iteration 3 — Major Workflow Redesign

Described in the adviser brief as the most significant redesign.

Major changes:

- Compliance module removed.
- Patient Registry reorganized.
- Doctors create patient accounts directly.
- Add New Patient and Add Existing Patient introduced.
- Active/Inactive monitoring introduced.
- Completed monitoring patients are archived rather than deleted.
- Archived patients can be reactivated.
- Patient logging redesigned into doctor-configurable Lifestyle Medicine logs.
- Physical activity simplified to minutes.
- Sleep redesigned around sleep quality.
- Goal pages simplified.
- Patient progress status indicators introduced.

Outcome: the project shifted from a feature-centered dashboard to a **patient-centered workflow**.

### Iteration 4 — Workflow Refinement

Further changes included:

- Contact number during patient registration.
- Searchable inactive patients for reactivation.
- Duplicate-active-patient safeguards.
- Separate Team messaging for doctors/staff.
- Follow-up scheduling moved into the patient overview.
- Priority tied to upcoming follow-up schedule.
- Configurable Recent Activity Summary.
- Expanded patient visibility management for multi-provider clinics.

### Iteration 5 — Current Direction

A fifth stakeholder interview was completed. The adviser brief described its recommendations as pending implementation at that time. Later development continued beyond that brief, so current implementation status must come from the latest project context and actual code.

## 4. Major Architectural Evolution

The documented evolution includes:

- **Original native Patient Mobile App → Patient Progressive Web App (PWA)**
- **Doctor Mobile App → removed**
- Feature-centered dashboard → **Patient Registry → Patient Workspace**
- Manual priority → priority based on follow-up schedule
- Compliance module → removed
- Generic patient logging → **doctor-configured Lifestyle Medicine logging**
- Static patient list → **Active / Inactive monitoring lifecycle**
- Analytics emphasis → **patient-centered workflow**

## 5. Current System Scope

### Doctor Dashboard

Core areas include:

- Authentication/account access
- Patient Registry
- Active/inactive patient management
- Add New Patient
- Add Existing Patient
- Patient Workspace
- Patient Overview
- Provider/Doctor-assigned Goals
- Follow-up scheduling
- Patient priority/monitoring information
- Patient History
- Doctor–Patient Messaging
- Team Messaging
- Archive / Reactivate lifecycle
- Recent Activity Summary
- Patient visibility management
- Doctor settings/profile

### Patient Portal

Core areas include:

- Login
- Home / Daily Logging
- Summary
- Provider-assigned Wellness Goals
- Personal Wellness Goals
- Messages
- Profile
- Settings

### Lifestyle Logging

Structured lifestyle logging includes:

- Food
- Medication
- Physical Activity
- Sleep
- Stress reflection
- Social Connectedness reflection
- Habit/vice-related questionnaire/reflection

Important structured requirements:

- Food logging includes structured food/hydration indicators in addition to food-item entry where applicable.
- Medication logging captures medicine name and dosage.
- Physical Activity captures duration/time rather than requiring calorie-burn estimates.
- Sleep captures duration/time.
- Reflections are optional by default, but doctors may assign selected reflection types as monitoring tasks.

## 6. Goals — Important Distinction

VitalSync has **two distinct goal concepts**.

### Provider / Doctor-Assigned Goals

The doctor creates and controls these goals. The patient views and tracks them but cannot redefine the doctor's configuration or independently control the goal lifecycle.

The doctor controls target, frequency, dates/instructions, and lifecycle status.

### Personal Wellness Goals

Created and managed by the patient for themselves. Doctors **do not see personal wellness goals** under the approved workflow. Patients may cancel their own personal goals.

These two concepts must not be merged in the manuscript.

## 7. Goal Evaluation

The prototype includes automated, measurable progress evaluation for applicable provider goals using structured patient lifestyle logs.

The evaluator distinguishes measurable progress/target attainment from manual goal lifecycle status. It does **not** make a clinical judgment about whether a patient has clinically succeeded or failed.

Supported evaluation concepts include:

- Duration
- Indicator
- Occurrence
- Reflection
- None/non-evaluable

Supported frequencies include:

- Daily
- Weekdays
- Weekly

Examples of displayed progress include measurable results such as `5/7 days` or `71%`.

Goals that cannot be reliably evaluated from available structured data are not automatically evaluated. Personal wellness goals are not treated as doctor-controlled provider goals.

## 8. Current Prototype Technical Architecture

### Frontend

**Doctor Dashboard**
- React
- TypeScript
- Vite

**Patient Portal**
- React
- TypeScript
- Vite
- PWA/browser-based implementation

### Prototype Persistence

The current prototype uses **browser localStorage** as a temporary persistence layer.

The main Patient Portal persistence implementation is:

`patient-portal/src/lib/storage.ts`

Important prototype storage keys include:

- `vitalsync_logs_v1`
- `vitalsync_goals_v1`
- `vitalsync_provider_goals_v1`
- `vitalsync_current_patient_id`

The storage layer is separated from UI/business logic so that persistence can later be replaced by a backend.

### Current Prototype Limitation

The Doctor Dashboard and Patient Portal run as separate frontend applications/origins during local development. Their browser localStorage is **not automatically shared**.

This is an acknowledged prototype limitation. Do not describe the current local prototype as having real-time or production-grade cross-application synchronization.

## 9. Planned Production/Backend Direction

Planned backend direction:

- Python
- Django
- Django REST Framework
- PostgreSQL
- Supabase planned for database/authentication services
- Backend authentication/authorization
- API-based communication between the frontend applications and backend

The backend is intended to replace the prototype's local persistence mechanism.

Intended transition:

`React + TypeScript → API → Django/DRF → PostgreSQL`

Do not falsely represent backend synchronization, real authentication, production authorization, or deployment as completed prototype functionality.

## 10. Identity and Access Concepts

The prototype has a patient identity/session foundation. Patient-specific records use a patient identifier such as `patientUniqueId`. The prototype includes a current-patient session concept.

Provider goals, lifestyle logs, and personal goals are associated with the active patient in the prototype.

Production implementation is expected to enforce identity, authentication, authorization, and data isolation through the backend.

## 11. Authoritative Source Hierarchy

Use this hierarchy when writing project documentation:

1. **Feature Contract Matrix** — primary behavioral source of truth.
2. **Explicit stakeholder/adviser decisions** — override assumptions.
3. **Workflow documentation** — explains approved user/process flows.
4. **Architecture documentation** — explains technical organization/intended architecture.
5. **Actual implementation** — shows what is currently implemented.

Do not silently invent or reinterpret features. If documentation conflicts with the Feature Contract Matrix, resolve against the Matrix unless a newer explicit approved decision exists.

## 12. Existing Development Documentation

Important project documents include:

- `Feature Contract.md`
- `VitalSync - FeatureContractMatrix.xlsx`
- `WORKFLOW_UPDATED.md`
- `ARCHITECTURE_UPDATED.md`
- `REFACTOR_PLAN_UPDATED.md`

These were created primarily to keep implementation and AI coding agents aligned, but they also provide useful source material for the capstone manuscript.

The project does **not** need unnecessary duplicate documentation simply for the sake of having more documents.

## 13. Refactoring

A frontend refactor plan exists, but refactoring was deliberately deferred until after the adviser prototype presentation/feature-freeze stage.

The refactor is intended to reorganize the codebase without redesigning or adding features.

Planned order:

`Types → Utilities → Shared Components → Feature Components → Views → Hooks → Services → Backend Integration`

Do not describe the refactor as completed unless it has actually been completed.

## 14. Deferred / Out-of-Scope Items

Previously identified deferred items include:

- Group chats — future version
- Realtime functionality — future version
- Push notifications — future version
- Offline synchronization — future version
- Machine-learning/SVM functionality — not currently implemented; status/scope must follow the latest adviser-approved decision
- Advanced analytics
- Compliance dashboard
- Compliance module was removed during iteration

Do not claim deferred features are implemented.

## 15. Design Philosophy

The central design shift is:

> From building a dashboard with many features to supporting the workflow of a Lifestyle Medicine physician caring for one patient at a time.

The information architecture therefore centers on:

`Patient Registry → Patient Workspace → Clinical/Monitoring Activities`

rather than treating every dashboard feature as an independent module.

## 16. Testing Methodology Context

The project now needs a formal **Testing Methodology** for the capstone documentation.

It should explain how the finished system will be evaluated rather than simply listing implemented features.

Testing should be traceable to approved features and workflows. Depending on school requirements, categories may include:

- Functional testing
- Integration testing
- System testing
- Usability testing
- User acceptance testing

A test case can include:

- Test ID
- Feature/workflow
- Preconditions
- Action/input
- Expected result
- Actual result
- Pass/Fail
- Remarks/defect

Do not claim testing has passed until it has actually been performed.

## 17. Documentation Chat Rules

The separate documentation-focused ChatGPT conversation should:

1. Treat the Feature Contract Matrix as the behavioral source of truth.
2. Use actual project documents and approved decisions as primary evidence.
3. Distinguish Capstone 1 proposal content from the evolved Capstone 2 system.
4. Explain the five stakeholder-driven iterations accurately.
5. Avoid presenting historical Version 4 status as the current status when later implementation supersedes it.
6. Distinguish prototype functionality from planned production functionality.
7. Never claim backend, real authentication, or cross-app synchronization is implemented unless it actually is.
8. Preserve the distinction between provider goals and personal wellness goals.
9. Avoid inventing features, workflows, stakeholders, metrics, technologies, or research findings.
10. Ask for missing information rather than fabricating it.
11. Keep the manuscript aligned with what the actual system does.
12. Use existing MDs as supporting engineering documentation, not as a substitute for the school's required manuscript structure.
13. Treat the five iterations as part of the project's documented evolution and methodology where appropriate.
14. Avoid unnecessary implementation detail where a higher-level thesis description is more appropriate.
15. Keep the documentation chat focused on **Capstone 2 manuscript/documentation**, while the software-development chat remains focused on implementation.

## 18. Suggested Capstone 2 Documentation Perspective

The manuscript should not imply that the Capstone 1 proposal was the final system.

A useful development narrative is:

`Proposal → Stakeholder Feedback → Iterative Redesign → Prototype Evolution → Current MVP → Testing → Further Implementation/Integration`

The five stakeholder interviews can therefore be documented as an iterative, stakeholder-informed development process.

## 19. Source Note: Adviser Meeting Brief

The attached adviser document is titled:

**“Meeting Brief for Sir Jonathan Bautista — VitalSync Project Evolution (Proposal Current Prototype)”**

It documented the system's evolution and the team's questions before the adviser showcase.

It specifically described Version 4 as the latest fully implemented version at that point, while Version 5 recommendations were awaiting implementation. It should primarily be used for documenting **historical evolution and rationale for changes**. Current implementation status must come from the latest project context, approved Feature Contract Matrix, workflow, architecture, and actual implementation.

## 20. One-Sentence Project Summary

**VitalSync is a patient-centered Lifestyle Medicine monitoring platform consisting of a Doctor Dashboard and Patient Portal PWA, evolved through five stakeholder-driven iterations and designed to support individualized lifestyle monitoring, provider-assigned wellness goals, patient self-management, summaries, and secure communication.**
