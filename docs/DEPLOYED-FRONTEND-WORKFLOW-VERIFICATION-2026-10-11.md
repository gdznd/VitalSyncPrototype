# VitalSync Deployed Frontend Workflow Verification

**Test date:** 2026-10-11  
**Test environment:** deployed Vercel applications, connected to the deployed Django API and Supabase PostgreSQL  
**Data:** synthetic/demo accounts and records only  
**Evidence:** user-reported results and screenshots reviewed during the walkthrough. No credentials, tokens, or personal contact values are recorded here.

## Deployments checked

- Patient Portal: <https://vital-sync-prototype-patient-portal.vercel.app/>
- Doctor Dashboard: <https://vital-sync-prototype-doctor-dashboard.vercel.app/>

Both applications accepted fresh sign-ins during the walkthrough. No visible frontend build identifier was captured.

## Matrix workflow results

| Matrix ID | Workflow | Verification and observed result | Status | Owner / next action |
|---|---|---|---|---|
| DLogin1 | Doctor and patient login/onboarding | Doctor-created synthetic patient invitation email arrived; patient sign-in and required temporary-password change were reported successful. | Pass | None identified in this check. |
| DPatientRegistry1 | Doctor patient registry | Active registry loaded and search found the expected synthetic patient. | Pass | None identified in this check. |
| DTeam1 | Doctor-to-doctor team messaging | Two synthetic doctor accounts exchanged test messages and replies; delivery and saved history were reported successful. | Pass | None identified in this check. |
| DPatientOverview1 | Doctor patient overview | The expected doctor-managed patient details were reported present and accurate. | Pass | None identified in this check. |
| DPatientOverview2 | Doctor/patient summary consistency | The same synthetic patient's summary data was reported to agree across both applications. | Pass | None identified in this check. |
| DMessaging | Doctor/patient messaging | Test messages were sent in both directions and the conversation history persisted. | Pass | None identified in this check. |
| DPatientRegistry2 | Archive and monitoring history | Archive confirmation appeared; history remained available; reactivation restored the synthetic patient to the active list. | Pass | None identified in this check. |
| DGoalSetting1 | Provider-assigned goals | Doctor assigned a 30-minute daily Physical Activity goal; it appeared in the Patient Portal. After a 30-minute activity log, provider-goal progress showed 1/1 (100%). | Partial | Frontend owner: investigate patient-owned personal-goal progress, which remained at 0% after the same activity log. The matrix also has profile-edit notes under this row; profile behavior was checked separately. |
| DProfileSettings1 | Doctor public profile | Doctor profile view and Edit Profile control were reported to work as intended. Profile edit/save persistence was not separately exercised in this walkthrough. | Pass (reported) | Further persistence testing is optional if the frontend owner needs it. |
| DProfileSettings2 | Patient view of doctor profile | Patient opened the assigned doctor's public profile from Messages → See Profile; managing doctor was also shown under Profile → Care Information. | Pass | None identified in this check. |
| DSettings1 | Doctor settings | Dark-mode toggle changed the appearance. User reported that after refresh it reset, although navigating back to Settings showed dark mode again. | Partial | Frontend owner: clarify and verify preference persistence across a full reload. |
| PLogs1 | Patient logs shared with doctor | Patient Home showed Walking, 30 minutes; the same activity appeared in the Doctor Dashboard's Today’s log for that patient. | Pass | None identified in this check. |
| PSummary1 | Patient activity summary | Summary data was reported to agree between the patient and doctor views. | Pass (reported) | None identified in this check. |
| PGoals1 | Patient goals | Provider-assigned goal sync and evaluated progress passed. A patient-owned personal goal appeared in its separate Personal Wellness Goals section, but its progress remained 0% after the matching 30-minute activity log. | Partial | Frontend owner: investigate personal-goal progress calculation/display. Keep personal goals distinct from provider-assigned goals and private to the patient. |
| PMessages1 | Patient/doctor messaging | Patient and doctor exchanged test messages in both directions; saved history was reported successful. | Pass | None identified in this check. |
| PProfile1 | Patient profile | A reversible synthetic profile edit saved and survived navigation/reload. The original value was restored and saved afterward. | Pass | None identified in this check. |
| DFollowUp1 | Doctor follow-up date shown to patient | Doctor overview showed follow-up date 13/10/2026. That date was not visible in the Patient Portal Home, Summary, or Profile screens checked. | Fail (patient-side visibility) | Frontend owner: confirm intended patient-facing location and display the follow-up date if required by the matrix. |
| DVisibility1 | Patient visibility and doctor access | Visibility choices included Assigned Only, Selected Doctors, and All Doctors. Doctor Two could see the patient when explicitly selected. In a controlled reversible check, changing to Assigned Only removed VS-0002 from Doctor Two’s registry; Selected Doctors with Doctor Two was then restored. | Pass for tested cases | All Doctors access was not tested. |
| DActivitySummary1 | Doctor recent activity summary | Doctor overview displayed the recent-activity section and summary metrics, including the test activity. | Pass | None identified in this check. |
| DPatientReactivationWorkflow | Patient monitoring reactivation | Synthetic patient was archived and reactivated; the patient returned to the active workflow with history preserved. | Pass | None identified in this check. |

## Additional reproducible frontend/deployment findings

| Finding | Evidence and impact | Status / owner |
|---|---|---|
| Direct-route refresh returns a Vercel 404 | Patient Portal navigation to `/goals` worked in-app, but refreshing that route directly showed Vercel `404 NOT_FOUND`. The same occurred for `/profile`. Other routes were not tested. | Frontend deployment owner: configure SPA history fallback and verify direct navigation/reload on all client routes. |
| Personal-goal progress stays at 0% | The patient's Personal Wellness Goals card stayed at 0% after logging a 30-minute walk, while the separate provider-assigned 30-minute daily activity goal reached 1/1 (100%). | Frontend owner: investigate personal-goal progress behavior. No fix was made in this audit. |
| Dark-mode persistence is unclear | Toggle changed the UI, but user observed a reset after refresh; returning to Settings appeared to show dark mode again. | Frontend owner: reproduce and clarify whether preference should persist across reload. |
| Patient-facing follow-up date is absent from checked screens | Doctor overview showed 13/10/2026; checked patient Home, Summary, and Profile screenshots did not show it. | Frontend owner: confirm expected surface and implement/verify if required. |

The above are recorded for frontend-owner handoff. No frontend files were changed as part of this verification.

## NLP/SVM implementation handoff

- The task brief describes a frozen dataset of 500 simulated, AI-assisted, researcher-reviewed English texts. The supplied dataset is multilingual, so that specification remains unresolved pending research-owner/JC confirmation.
- The user supplied the external folder `VitalSync_NLP_Final_Dataset_v1.0_for_JS`, containing `vitalsync_stress_dataset_final500_v1.0.csv` and supporting dataset documentation. The CSV has 500 nonblank rows, all four expected labels, and a SHA-256 checksum of `b6cf6655d17ea66f9332dbe6118106155e560acc16f782458bc4335a5790e43e`; its MD5 matches the dataset card (`14712c860b41ed1232b61e958eb7f3fc`).
- **Specification discrepancy (FOR JC / ADVISER REVIEW):** the supplied CSV contains 358 English (`en`), 127 Filipino (`fil`), and 15 mixed (`fil-en`) texts, while the task brief says English-only. Per the backend owner's decision (the supplied CSV is the only dataset provided and must be followed), all 500 texts were used unfiltered with the dataset's own split. The brief and stale NLP docs still need reconciling by the research owner.
- **Documentation discrepancy (FOR JC REVIEW):** `NLP_DATASET_CARD_final500_v1.0.md` says adjudication is complete, but `AGREEMENT_REPORT_final500.md` (dated Oct 8) says it is not. `annotation_record_final500.csv` has a filled `final_label` for all 500 rows matching the CSV class counts, so the card was treated as authoritative; JC should confirm.
- **Training/evaluation done (2026-10-11):** `nlp_svm_pipeline.py check` passed; `run --dataset-status final` used the split 350/76/74, TF-IDF 1–2-grams + OvR LinearSVC, seed 42, scikit-learn 1.9.1, numpy 2.5.4. Validation macro-F1 by C: 0.01→0.151, 0.1→0.307, 1→0.550, 10→0.589; **selected C=10 (edge of the prescribed grid)**. Test (scored once): accuracy 0.676, macro-F1 0.577, weighted F1 0.649. Per-class F1: No 0.85, Mild 0.40 (n=11, unstable), Moderate 0.33 (n=16), High 0.72. Moderate→High confusion is large (9 of 16). Simulated-data technical performance only, not clinical validity.
- **Backend integration (PROPOSED contract, pending agreement with the frontend owner and JC):** `POST /api/patients/<id>/stress-classification` with `{"log_id": n}`, doctor-only and restricted by `authorized_patient_ids`. It classifies the stored stress log server-side, persists nothing, and returns `log_id`, `patient_id`, `label`, `status` (`ok` | `unable_to_classify` | `model_unavailable`) and `model_version`; no confidence value. Code: `backend/api/stress_nlp.py`, `stress_views.py`, `nlp_model/`. `manage.py check` passed and all 72 backend tests passed, including 12 new API-view tests using mocked data for valid, blank, short, model-unavailable, and authorization cases. These are not live-database or deployed end-to-end tests. The endpoint is not deployed or wired to any frontend.
- Frontend note: `patient-portal/src/lib/journey.ts` still contains old binary "High/Low-Normal Stress ... NLP module" wording; record for the frontend owner, not changed here.
- The Feature Contract Matrix currently has no dedicated SVM/NLP workflow row. Propose and coordinate a doctor-only row before changing the authoritative workbook; do not imply that the patient sees the model result.
- API endpoint/request/response, persistence, and exact doctor-facing placement remain to be agreed/documented before integration is treated as final.
- Use synthetic/demo data only. The model is a stress-category prototype, not a diagnosis, clinical assessment, treatment recommendation, or clinical-validity claim.

## Explicitly untested or not established

- `All Doctors` access behavior.
- Direct-refresh behavior for Patient Portal routes other than `/goals` and `/profile`.
- Full regression of every matrix interaction, role-isolation case, and authorization boundary.
- Profile-photo persistence (the existing workflow is preview-only).
- End-to-end classifier integration through a deployed doctor-facing UI. Training and evaluation are complete; the deployed workflow is not.
- Any real-participant workflow or research/ethics approval.

This report records the walkthrough evidence only. It does not change the Feature Contract Matrix's implementation/testing columns or claim full system completion.

## Task brief deliverables status

Status against **“## 8. Required deliverables”** in `VitalSync_JS_Updated_Task_Brief.md`, as of 2026-10-11:

| # | Required deliverable | Status | Evidence / remaining work |
|---|---|---|---|
| 1 | Deployed workflow verification report against the matrix | ✅ Complete for the workflows tested | Results, evidence sources, and untested workflows are recorded above; this was not an exhaustive regression of every matrix row. |
| 2 | Defect/blocker list with reproducible steps and evidence | ✅ Complete for observed issues | Frontend defects and next actions are listed above. |
| 3 | Four-class stress-only model implemented or a clear blocker report | ✅ Implemented | Model artifact, four labels, normalization, and classification handling are in the backend. |
| 4 | Reproducible training/evaluation procedure and actual metrics (or explicitly pending status) | ✅ Complete | Dataset split, settings, validation selection, test metrics, and limitations are recorded above. |
| 5 | Documented API contract and confirmed doctor-only visibility/access rules | ◐ Partial | Proposed API shape and backend authorization checks are documented and tested; endpoint/UI placement and persistence contract still need team agreement. |
| 6 | Integration test evidence for valid, blank, short, error, and authorization cases | ◐ Partial | Backend API-view tests cover these cases using mocked data; live-database and deployed end-to-end testing remain. |
| 7 | Updated NLP documentation references and Feature Contract Matrix status | ❌ Not complete | NLP-folder references and the matrix have not been updated. The multilingual dataset versus English-only brief discrepancy needs research-owner/JC confirmation first. |
| 8 | Handoff to JC and frontend owner with remaining issues and exact next actions | ❌ Not yet sent | This report records the open decisions and actions, but the handoff message has not been sent. |

The statuses above describe this task's deliverables; they do not imply research approval, clinical validity, or deployed end-to-end completion.
