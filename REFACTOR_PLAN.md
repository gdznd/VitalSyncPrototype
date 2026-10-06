VitalSync Frontend Refactoring Plan
Version 1.0
Status: Approved for Execution
Project Phase: Feature Freeze → Targeted Frontend Refactoring → Interview-Ready Prototype
1. Purpose
The VitalSync prototype has reached Feature Freeze.
The objective of this refactor is not to redesign the software or introduce new functionality.
The objective is to perform a targeted reorganization of the existing frontend so that the interview-ready prototype can be connected to a focused backend without unnecessary production-scale engineering.
The refactor should improve maintainability and make the frontend easier to integrate with backend services while preserving all approved clinical workflows.
The refactor shall preserve:
- Existing user experience.
- Existing workflows.
- Existing navigation.
- Existing clinical behavior.
- Existing mock-data behavior until the corresponding workflow is connected to the prototype backend.
- Provider-assigned Goals and Personal Wellness Goals remain distinct workflows with their documented ownership and visibility rules.
No feature additions are permitted during this phase without stakeholder approval.
2. Success Criteria
The refactor is considered successful only if all of the following are true.
Functional
- All features listed in the Feature Contract Matrix remain operational.
- No user workflow changes.
- No visual regressions.
- No navigation regressions.
- Mock data continues functioning.
Technical
- App.tsx responsibilities reduced.
- Components modularized.
- Types centralized.
- Utilities extracted.
- Services introduced.
- Build succeeds without errors.
- No duplicated logic introduced.
Documentation and Feature Authority

The **Feature Contract Matrix (XLSX) is the authoritative feature contract** for required product features and behavior.

Use this authority order when checking or resolving requirements:

1. Feature Contract Matrix (XLSX)
2. Explicit stakeholder/adviser decisions
3. ARCHITECTURE.md
4. WORKFLOW.md
5. REFACTOR_PLAN.md

If a discrepancy is found, stop the affected implementation step and resolve it against the Feature Contract Matrix and explicit stakeholder/adviser decisions. Do not silently remove, redefine, or exclude a feature because a derived document is stale or incorrect.

Approved functionality that is missing or was incorrectly removed must be restored before the refactor can be considered feature-preserving; restoring such approved functionality is a correction, not a new feature.

---

3. Ground Rules
These rules are mandatory.
DO
✔ Extract responsibilities.
✔ Improve maintainability.
✔ Preserve workflows.
✔ Preserve the distinction between inactive clinical monitoring and continued patient account access.
✔ Preserve behavior.
✔ Improve readability.
✔ Reduce coupling.
DO NOT
✘ Redesign screens.
✘ Add features.
✘ Remove features.
✘ Change navigation.
✘ Change workflow order.
✘ Change business logic.
✘ Perform backend implementation as part of the frontend refactor.
4. Current Architecture
(Reference ARCHITECTURE.md)
Current dashboard architecture:
App.tsx

├── Domain Models
├── Mock Database
├── Business Logic
├── Registry
├── Patient Workspace
├── Messages
├── Goals
├── History
├── Navigation
├── Modal Controllers
└── Shared UI
Current portal architecture:
App.tsx

↓

AppShell

↓

Pages

↓

Storage Layer
Only the dashboard requires significant architectural decomposition.
Goals Preservation Rule

During refactoring, preserve the existing separation between:

- **Provider-assigned goals** — doctor-controlled; patient can view/track but cannot modify the provider goal definition or status.
- **Personal Wellness Goals** — patient-created/managed; doctors cannot see them; patient may cancel them.

Do not merge these into a single behavior model merely for code reuse.

Inactive Patient Access Preservation Rule

During refactoring, preserve the distinction between clinical monitoring status and account access:

- Archiving monitoring does not deactivate the patient's VitalSync account.
- Inactive patients retain access to personal lifestyle self-management.
- Personal history, progress, and Personal Wellness Goals remain available while inactive.
- Provider-controlled monitoring functions are suspended while inactive.
- Provider-assigned goals transition out of active monitoring and should display the approved patient-facing transition/completion state.
- Inactive messaging remains limited to the patient's previous/established doctor conversation.
- Reactivation restores the active monitoring relationship.

Do not implement an inactive state as a full Patient Portal lockout.

---

5. Refactor Strategy
The project will follow an inside-out refactoring approach.
Why?
Business logic must remain stable while presentation is modularized.
Changing infrastructure first minimizes merge conflicts and preserves application behavior.
The refactor proceeds from the most stable layers toward the most volatile layers.
Order:
Types

↓

Utilities

↓

Shared Components

↓

Feature Components

↓

Views

↓

Hooks

↓

Services

↓

Backend Integration
6. Phase 0 – Repository Preparation
Objectives
- Remove obsolete files.
- Remove abandoned scaffolds.
- Confirm build passes.
- Freeze feature set.
Checklist
☐ Repository clean
☐ No unused files
☐ Build passes
☐ ARCHITECTURE.md is the current architecture document
☐ Feature Contract Matrix updated and frozen for this prototype phase
☐ WORKFLOW.md consistent with Feature Contract Matrix
☐ BACKEND.md prepared for the backend developer
☐ ARCHITECTURE.md consistent with Feature Contract Matrix
☐ Approved feature gaps verified against current code
☐ No approved feature is removed or redefined by the refactor plan
Status: Complete — final documentation/code consistency audit and frontend refactor Phases 1–4 are complete.
7. Phase 1 – Centralize Types
Goal
Remove duplicated interfaces from components.
Create
shared/

types/

patient.ts

doctor.ts

activity.ts

goal.ts

message.ts

history.ts
Tasks
☐ Extract Patient
☐ Extract Doctor
☐ Extract Activity
☐ Extract Monitoring History
☐ Extract/define Goal interfaces without conflating provider-assigned and Personal Wellness Goals
☐ Export shared interfaces
Verification
☐ Build passes
☐ No duplicate interfaces
8. Phase 2 – Extract Utilities
Create
shared/

utils/
Candidates
- followUpPriority.ts
- dateFormatter.ts
- initials.ts
- priorityColor.ts
Verification
☐ Utility functions contain no React.
9. Phase 3 – Shared Components
Create
components/common
Candidates
NoticeBanner
SearchBox
StatusBadge
Card
Modal
SectionHeader
Verification
☐ Components reusable.
☐ No business logic.
10. Phase 4 – Dashboard Components
Extract
AddPatientModal

PatientRegistry

PatientCard

PatientProfile

MessagesView

HistoryView

DoctorPicker

RecentActivitySummary

TeamView

Goals-related components and configuration UI, according to the actual current implementation
Rule
One component.
One responsibility.
11. Phase 5 – Views
Create
views/

Registry/

Workspace/

Team/
Views coordinate components.
Views do not own business logic.
12. Phase 6 – Custom Hooks
Create
hooks/
Candidates
usePatientRegistry

useWorkspace

useMessages

usePatientSelection

useFollowUp
Hooks own state.
Components render UI.
13. Phase 7 – Services
Create
services/

patientService.ts

activityService.ts

messageService.ts
During this phase the services still use mock data.
No backend yet.
Only the API surface changes.
14. Phase 8 – Backend Integration Readiness
Replace
useState

↓

Service Calls

↓

API

↓

Database
UI should require minimal modification.
15. Dependency Order
This order is mandatory.
Repository

↓

Types

↓

Utilities

↓

Shared Components

↓

Feature Components

↓

Views

↓

Hooks

↓

Services

↓

Backend
No phase begins until the previous phase passes verification.
16. Verification Checklist
After every phase:
☐ npm run build
☐ No TypeScript errors
☐ No new lint errors or warnings introduced by the current phase
☐ UI unchanged
☐ Feature Contract requirements preserved; no requirements removed or redefined
☐ Architecture preserved
☐ Manual smoke test completed
17. Merge Rules
Every pull request must satisfy:
- Single objective.
- Small scope.
- Builds successfully.
- No unrelated changes.
- Architecture respected.
Member	Primary Responsibility	Refactor / Development Scope
Member 1 — Doctor Frontend	Doctor Dashboard	Dashboard components, views, hooks, doctor-side services/mock data, doctor workflows
Member 2 — Patient Frontend	Patient Portal	Portal pages, components, hooks, storage abstraction, patient-side services/mock data, patient workflows
Member 3 — Backend	Backend / Integration	API contracts, authentication, database, backend services, frontend integration support; may begin in parallel with frontend refactoring
19. Definition of Done
The frontend refactor is complete when:
- Feature Contract is fully satisfied.
- Architecture matches ARCHITECTURE.md.
- Dashboard no longer relies on a monolithic App.tsx.
- Components have single responsibilities.
- Services abstract data access.
- Backend can replace mock data without changing UI workflows.
20. Post-Refactor Roadmap
Immediately after refactoring:
1. Design API contracts.
2. Implement authentication.
3. Replace mock data with services.
4. Connect backend.
5. Integration testing.
6. User acceptance testing.
7. Bug fixing.
8. Manuscript completion.

Refactor Progress

Update this section after each phase.
Phase 0  ██████████   100%

Phase 1  ██████████   100%

Phase 2  ██████████   100%

Phase 3  ██████████   100%

Phase 4  ██████████   100%

Phase 5  ██████████   100%

Phase 6  ░░░░░░░░░░   0%

Phase 7  ░░░░░░░░░░   0%

Phase 8  ░░░░░░░░░░   0%
Update it after each phase.
