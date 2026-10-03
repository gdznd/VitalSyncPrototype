# CLAUDE.md — VitalSync

VitalSync is a capstone research project (Opeleña, Sermon, Velos). This repository contains:
- the VitalSync prototype application;
- working documents used to revise the capstone proposal.

This root file is the **project-wide source of working rules**. It applies to all subfolders. If a subfolder's instruction file (for example, leftover template files) conflicts with this file, this file takes precedence.

## Sources of truth

| Role | Source |
|---|---|
| Research baseline | `Proposal_Document-Opeleña_et_al (1).pdf` (the original proposal). Revisions to it are not final until the adviser approves them. |
| Implementation baseline | This repository at its current commit. A newer version counts only when the lead researcher explicitly provides it. Unfinished refactor work that isn't in the repository does not count. |
| Feature contract (development) | `VitalSync - FeatureContractMatrix.xlsx`, then `WORKFLOW.md`, `ARCHITECTURE.md`, `BACKEND.md` |
| Research-revision working documents | `docs/PAPER-IMPLEMENTATION-AUDIT.md`, `docs/PAPER-UPDATE-QUESTIONS.md`, `docs/PAPER-UPDATE-PLAN.md` |

## The three-state rule

When discussing any of the following topics, clearly distinguish three states:
- project status
- implementation status
- planned architecture or features
- research methodology
- research scope
- manuscript or proposal claims
- participant or study information

The three states are:

1. **CURRENTLY IMPLEMENTED** — exists in this repository. Cite the source file.
2. **PLANNED / TO BE IMPLEMENTED** — agreed direction that is not built yet.
3. **REQUIRES RESEARCHER / GROUPMATE / ADVISER CONFIRMATION** — undecided.

Never blur these states together. Ordinary coding discussion and conversation do not need a literal label on every sentence. In research documents, every unresolved item must be labeled **PROPOSED / FOR ADVISER REVIEW**.

## Current prototype (implemented)

### Applications and data

- **Patient side:** `patient-portal/`. React 18 + TypeScript + Vite, configured as an installable PWA (`vite-plugin-pwa`), with `react-router-dom`.
- **Doctor side:** `doctor-dashboard/`. React 19 + TypeScript + Vite web dashboard. Most of its logic is in `src/App.tsx`.
- **Backend:** a V1 Django REST Framework API backed by PostgreSQL is implemented in `backend/`. Both frontends use JWT-authenticated API flows for core connected workflows. This is an interview-prototype integration, not a production healthcare system.
- **Authentication:** the backend authenticates doctor and patient accounts, stores bcrypt password hashes, and requires temporary-password patients to change their password. Patient account invitations use email. Doctors self-register through the existing dashboard flow; general password recovery is outside the MVP.
- **Shared data:** connected logs, goals, messages, patient registry, monitoring relationships/history, doctor notes, and existing account/conversation preferences are persisted through the backend. Built-in activity choices are served by the API and custom activity choices are patient-owned backend records. Consult `BACKEND_Implementation.md` for remaining browser and full-workflow verification.
- **Profile integration:** patient contact/health fields and date-of-birth-derived age are connected to PostgreSQL. Doctor profile GET/PATCH is also connected; migrations `0002`–`0006` are applied to the configured local database. Before migrations 0004–0006, a same-server clone was verified as `vitalsync_db_backup_20261004_0052`; before migration 0003, the earlier same-server clone is `vitalsync_db_backup_20261003_2330`. Profile-photo selection is preview-only and is not stored.
- **All study-facing data must remain synthetic/demo until ethics and research-ready requirements are met.** Never describe prototype records as participant data or claim the prototype has collected real participant data.

### Features present in the code

Being in the code does not make a feature a research variable.
- Food, medication, activity, and sleep logging.
- Stress and social reflections, and a habits/substance questionnaire.
- Patient and doctor summaries, including "Your Journey" observations.
- Provider-assigned goals with rule-based target attainment (`shared/goalEvaluator.ts`), shared by both frontends.
- Personal wellness goals.
- Persisted one-to-one doctor–patient messaging for authorized conversations and one-to-one doctor Team messages.
- Persisted doctor/patient settings, per-conversation pin/filter preferences, and patient-owned custom activity choices. Notification preferences are stored only; delivery is not implemented.
- Server-enforced visibility and selected-doctor authorization.
- Archive/reactivate while preserving patient accounts/history. Provider-goal statuses remain unchanged; inactive monitoring suspends provider-goal work.
- Monitoring history derived from persisted monitoring lifecycle episodes.
- A follow-up date with derived follow-up priority.

### Not implemented

- NLP/SVM, stress classification, and alerts. A mock alert panel exists in `App.tsx` but is never rendered.
- A compliance report.
- Offline sync.
- Real-time updates.
- Push notifications.
- A doctor mobile app.
- Any React Native/Expo code. `patient-portal/AGENTS.md`, `patient-portal/CLAUDE.md`, `patient-portal/LICENSE`, and `patient-portal/.claude/settings.json` are leftover Expo template files and do not describe this project.

## Planned final system

- **Planned architecture:** React/Vite frontend → **Django + Django REST Framework** backend → **PostgreSQL (Supabase)**. TiDB is **not** part of the plan.
- **Next development stage:** continue backend integration and verification, following `BACKEND.md` and the current status in `BACKEND_Implementation.md`.
- **Research-ready requirements** (must be met before any real participant data is collected or used):
  - authentication;
  - authorization and role isolation;
  - a persistent database;
  - patient/doctor data separation;
  - server-enforced visibility;
  - appropriate security and data protection;
  - working messaging and logging;
  - removal or replacement of demo data where appropriate.
- Always distinguish the **current prototype** from the **research-ready / planned final system**.
- Do not remove planned architecture from the manuscript just because the prototype does not implement it yet.

## Research status

Nothing in this section is final.

### Methodology

- Moving toward **qualitative evaluation**.
- The specific design (for example, qualitative descriptive, case study, or developmental/evaluative) is **not approved**.
- Present design options for adviser discussion; do not pick one.

### Research questions

- **Not approved.**
- Candidate sets may be drafted for adviser discussion only.
- They must be grounded in real VitalSync features. Do not invent variables, constructs, or features.

### NLP/SVM

- **Not in the current functional research scope.**
- Do not add it to the architecture, methodology, database, or evaluation unless the adviser explicitly reinstates it.

### "Your Journey" observations

- This is rule-based summary text generated from recent logs.
- **Never** describe it as NLP, machine learning, SVM, AI, clinical prediction, or a diagnostic component.
- It may be described as a prototype or future-development concept.

### Priority

- Use **"follow-up priority"** or **"monitoring priority."**
- It is derived from the follow-up date (`doctor-dashboard/src/App.tsx`, `followUpPriority`).
- **Never** describe it as stress classification, AI risk prediction, or automated clinical prioritization.

### SUS / NASA-TLX

- **Unresolved.** Do not keep or remove them silently.
- The implications of each option may be explained.

### Feature scope

- Keep three groups separate:
  - features present in the prototype;
  - core features proposed for research evaluation;
  - supporting features that may not be evaluated on their own.
- The split needs adviser approval.

### Participants

- **Not final.**
- Possible groups:
  - eligible adult/general users for the patient-side experience;
  - physicians/healthcare professionals for the provider-side experience.
- Composition, number, eligibility, and whether actual patients are required all need approval.
- Do not name classmates, relatives, or other groups as participants.

### Study site and recruitment

- **Do not assume a formal site.** Do not name SPMC, a hospital, or a clinic as the site.
- Partner and MOA arrangements are not yet clarified.

### Participant workflow

- There is no final workflow.
- A proposed sequence may be drafted as PROPOSED / FOR ADVISER REVIEW:
  recruitment → consent → account/access → system interaction → evaluation/interview → data collection.
- Duration, activities, devices, and interview timing all need adviser approval.

### Qualitative data collection and analysis

- These are options only:
  - individual semi-structured interviews;
  - focus groups;
  - recording and transcription;
  - coding;
  - thematic analysis.
- None of them is final.

### Ethics

- **Not approved.**
- Real participant data will be collected only after both the ethics requirements and the research-ready system requirements are met.

## Immediate research deliverable

The next deliverable is an **Adviser Discussion Document**. It is **not** a rewrite of Chapters 1–3.

It will contain:
1. candidate qualitative research designs;
2. 2–3 candidate research-question sets;
3. proposed participant/user groups;
4. a proposed participant workflow;
5. a proposed qualitative data-collection procedure;
6. a proposed qualitative analysis procedure;
7. SUS/NASA-TLX options;
8. a proposed split between research-evaluated features and supporting prototype features;
9. recruitment and setting options;
10. remaining decisions that need adviser approval.

Every unresolved item must be labeled **PROPOSED / FOR ADVISER REVIEW**.

## Working principles

- Never invent research data, participant information, ethics approval, study results, or implementation details.
- When auditing manuscript claims against the repository, trace each claim to actual source files whenever possible.
- Keep existing research terminology and decisions unless they are explicitly changed.
- Do not assume every prototype feature belongs in the research scope.
- If a repository change does not affect a manuscript section, leave that section unchanged.
- Do not rewrite Chapters 1–3 until the outstanding adviser decisions are resolved.
- Keep research-document changes separate from application-code changes. Do not mix them in one task or one commit.
- Do not make broad refactors or unrelated improvements without asking.
- Before modifying important files, explain what will change and why.
- When uncertain, name the uncertainty and ask instead of guessing.

## Development commands

Each app is installed and run separately.
- **Doctor dashboard:** `cd doctor-dashboard && npm install && npm run dev`. Lint with `npm run lint` (oxlint).
- **Patient portal:** `cd patient-portal && npm install && npm run dev`.
- **Backend checks:** from `backend/`, run `.\.venv-win\Scripts\python.exe manage.py check` and `.\.venv-win\Scripts\python.exe manage.py test api.tests`.
- **Other tests:** `patient-portal/src/lib/goalEvaluator.test.ts` is a standalone assertion script; no patient-portal test runner is configured.
