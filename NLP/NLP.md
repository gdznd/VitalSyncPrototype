# VitalSync NLP Module

**Version:** 1.0 \| **Status:** Master source of truth \| **Updated:**
2026-10-06

> **READ THIS FILE FIRST.** This is the authoritative source for the
> VitalSync NLP/SVM component. Team members and AI assistants must read
> it before changing NLP work.

## 0. Authority

Order of authority: 1. Explicit adviser/panel/stakeholder decisions 2.
Frozen approved Research Questions and Specific Objectives 3. Final
approved manuscript and UREB/ethics documents 4. **This `NLP.md`** 5.
`NLP_HANDOFF.md` 6. `NLP_RESEARCH_ALIGNMENT.md` 7. `NLP_WORK_LOG.md` 8.
Older task briefs/drafts 9. Code that contradicts the documented
direction

**Frozen RQs/objectives must never be rewritten, shortened, paraphrased,
removed, or changed merely to fit implementation.**

## 1. Purpose

The NLP component is a **standalone research demonstration** of a
Support Vector Machine that classifies stress-related free-text
reflections into four categories. VitalSync integration is the intended
application/defense demonstration, but integration is not a prerequisite
for proving the core NLP component.

Core:

``` text
Simulated dataset -> annotation/QC -> train/validation/test
-> preprocessing -> TF-IDF -> 4-class Linear SVM
-> held-out evaluation -> reproducible model
```

Integrated:

``` text
Patient PWA -> Stress Log -> Django/DRF -> NLP/SVM -> Your Journey
```

## 2. Frozen research target

Approved RQ2 remains frozen:

> "How accurately can a Support Vector Machine (SVM) algorithm classify
> and quantify patients' subjective well-being and stress levels from
> weekly free-text survey inputs, as measured by Precision, Recall, and
> F1-Score?"

Do not rewrite RQ2 to make it more convenient for implementation.

The NLP implementation operationalizes the approved
stress-classification component through quantitative classification
metrics.

## 3. Four final classes

Exactly one class is returned:

-   `NO_STRESS`
-   `MILD_STRESS`
-   `MODERATE_STRESS`
-   `HIGH_STRESS`

General operational meanings:

  -----------------------------------------------------------------------
  Class                               Meaning
  ----------------------------------- -----------------------------------
  No Stress                           Little or no expressed stress

  Mild Stress                         Limited/manageable stress

  Moderate Stress                     Clear stress with noticeable
                                      burden/disruption

  High Stress                         Strong/persistent stress with
                                      substantial expressed burden
  -----------------------------------------------------------------------

These are research/model labels, **not clinical diagnoses**.

## 4. Input

Supported languages: - English - Filipino - mixed English-Filipino

Bisaya is outside current NLP scope.

### Express Yourself

A submitted stress-related free-text reflection becomes the NLP input.

### Guided Reflection

The five current Guided Reflection answers are combined in question
order into **one text input**, producing **one classification**.

``` text
Answer 1 + Answer 2 + Answer 3 + Answer 4 + Answer 5
                         ↓
                  one NLP input
                         ↓
                 one stress class
```

Social Connectedness is not sent to this classifier.

## 5. Dataset

Target follows the manuscript: **approximately 1,000 texts**. The final
report must use the actual final dataset count; never invent a count.

Dataset: - researcher-generated simulated text; - AI-assisted
drafting/generation; - researcher reviewed; - no real patient
reflections; - no real patient PII.

Minimum structure:

``` text
id, text, label
```

Before training: - remove duplicates/near-duplicates and leakage; -
check for PII; - verify labels; - inspect class balance; - record
provenance and dataset version.

## 6. Annotation

Two annotators: - Annotator 1: JC - Annotator 2: user/researcher

Complete the second annotation before reporting final agreement.

Report actual agreement statistics, such as Cohen's kappa where
applicable, and document disagreement resolution. Never invent agreement
values.

## 7. Split

Planned split:

-   70% training
-   15% validation
-   15% held-out test

Use stratification and fixed seed **42** unless explicitly changed and
documented.

The test set is not used for tuning.

## 8. Preprocessing and TF-IDF

Proposed/final implementation direction: - lowercase/normalize
consistently; - preserve meaningful negation such as `not`, `hindi`,
`wala`; - avoid preprocessing that destroys stress-relevant meaning; -
TF-IDF word features; - unigram + bigram range; - sublinear TF; -
`min_df=1` unless justified otherwise; - do not blindly remove
stopwords.

The exact final configuration used for the reported model must be
recorded.

The fitted vectorizer must be saved with the model pipeline.

## 9. SVM

Primary model: **Linear SVM**.

### Multiclass: FINAL = One-vs-Rest

Conceptually:

``` text
NO_STRESS vs rest
MILD_STRESS vs rest
MODERATE_STRESS vs rest
HIGH_STRESS vs rest
```

Do not revert to the obsolete binary `HIGH_STRESS/LOW_NORMAL` design.

### Tuning

Use a small validation-based C search, proposed grid:

``` text
0.01, 0.1, 1, 10
```

Select using validation **Macro-F1**.

### Final training

``` text
train + validation
       ↓
 final model
       ↓
held-out test once
```

Do not tune on the test set.

## 10. Evaluation

Required: - Accuracy - Precision per class - Recall per class - F1 per
class - Macro-F1 - 4×4 confusion matrix

Optional: weighted F1.

Confusion matrix order:

``` text
No Stress | Mild Stress | Moderate Stress | High Stress
```

**No fabricated results.** Accuracy, P/R/F1, Macro-F1, confusion
matrices, class counts, selected C, and agreement values must come from
actual runs.

These results demonstrate technical performance on simulated data. They
do not establish clinical validity, diagnostic validity, or real-patient
generalizability.

## 11. Standalone completion

The core NLP deliverable is complete when it can independently: 1. load
the dataset; 2. train; 3. select settings using validation; 4. refit; 5.
evaluate the held-out test; 6. save/load the model; 7. classify new text
reproducibly.

It must not require the PWA, Django, PostgreSQL, or Supabase merely to
demonstrate the SVM.

## 12. VitalSync integration

The active connected architecture is:

``` text
React/Vite Doctor Dashboard                              -> Django REST Framework -> PostgreSQL
React/Vite Patient PWA     /
```

Supabase is intended as the PostgreSQL host; applications continue
through Django/DRF.

**Branch clarification:** `main` contains the latest frontend.
`test-branch` contains JS's backend work. The branches are currently
separated while backend/Supabase work proceeds.

**Express/Node clarification:** earlier inspection found leftover
Node/Express code on the frontend/local-storage branch. It is **not the
active backend architecture**. The backend implementation guide
explicitly identifies that Express startup path as leftover code.

## 13. Defense demonstration

This is the intended **Option 2**:

``` text
Pre-created synthetic patient account
        ↓
Panelist logs into PWA
        ↓
Stress Log / reflection
        ↓
Django/DRF + NLP/SVM
        ↓
NO/MILD/MODERATE/HIGH STRESS
        ↓
Your Journey displays result
```

Then show technical evidence:

``` text
Dataset -> TF-IDF -> OvR SVM -> metrics -> confusion matrix -> live prediction
```

The panel therefore sees both system behavior and technical SVM
evidence.

## 14. API direction

The classifier can be exposed through an internal service/API for
integration. The exact Django endpoint path is not final until
implemented.

Conceptual request:

``` json
{"text":"Combined reflection text"}
```

Conceptual response:

``` json
{"label":"MODERATE_STRESS","model_version":"svm-v1.0"}
```

Only the four approved labels are valid.

Do not invent an endpoint path or final model version before
implementation.

## 15. Failure, privacy, and security

NLP failure must not prevent saving the core reflection.

Handle empty/insufficient text, unavailable model/service, invalid
input, and unexpected errors safely.

Do not unnecessarily log reflection text. Use synthetic/demo data during
development and defense. Integrated NLP must follow the existing Django
authentication/authorization architecture.

The classifier is not a diagnostic or treatment system.

## 16. Scope boundaries

**In scope:** stress free text, four classes, TF-IDF, Linear SVM, OvR,
simulated dataset, annotation, validation/test evaluation,
reproducibility, standalone demonstration, Stress Log integration, Your
Journey, English/Filipino/mixed English-Filipino.

**Out of scope:** LLM replacement, multi-label NLP, NLP for every
Lifestyle Medicine pillar, diagnosis, treatment recommendations,
clinical risk scores, stress percentages, fabricated confidence values,
clinical outcome prediction, recommendation engines, production ML
infrastructure, and unrelated NLP features.

## 17. Team roles

**JC/research:** dataset, annotation guide, quality control, second
annotation, agreement, research alignment, documentation and
limitations.

**JS/NLP/backend:** preprocessing, TF-IDF, SVM, OvR, tuning,
training/evaluation, model artifact, inference, Django/DRF integration
and API contract.

**Frontend:** Stress Log, input aggregation where applicable, Your
Journey display, four labels, loading/null/error states and
non-diagnostic wording.

## 18. AI assistant rules

AI assistants must: 1. Read `NLP.md` first. 2. Never modify frozen
RQs/objectives. 3. Never resurrect `HIGH_STRESS/LOW_NORMAL`. 4. Never
invent data/results. 5. Never silently change the four classes. 6. Never
describe Express/Node as the active backend. 7. Clearly distinguish
final decisions from proposals. 8. Keep the standalone NLP component
independently demonstrable. 9. Avoid expanding NLP scope. 10. Flag
conflicts instead of silently changing research scope. 11. Preserve
reproducibility and document consequential changes.

## 19. Definition of Done

### Core NLP --- required

-   [ ] \~1,000-text target addressed and final count recorded
-   [ ] simulated/AI-assisted/reviewed provenance documented
-   [ ] four classes used
-   [ ] two annotators completed
-   [ ] agreement calculated
-   [ ] quality checks completed
-   [ ] 70/15/15 split established
-   [ ] preprocessing implemented
-   [ ] TF-IDF implemented
-   [ ] Linear SVM implemented
-   [ ] OvR implemented
-   [ ] validation-based C selection completed
-   [ ] train+validation refit completed
-   [ ] held-out test run once
-   [ ] Accuracy/P/R/F1/Macro-F1 reported
-   [ ] 4×4 confusion matrix reported
-   [ ] model reproducibly saved/loaded
-   [ ] live inference demonstrated

### Intended defense integration

-   [ ] synthetic account works
-   [ ] Stress Log works
-   [ ] reflection reaches classifier
-   [ ] valid label returns
-   [ ] Your Journey displays result
-   [ ] standalone technical fallback is available

Integration bugs do not redefine completion of the core NLP research
component.

## 20. Change control

Changes to classes, dataset provenance/target, annotation, splitting,
model family, multiclass strategy, evaluation, NLP scope, or
relationship to frozen RQ2/objectives must be recorded and, where
research scope is affected, approved appropriately.

For history use `NLP_WORK_LOG.md`; for research alignment use
`NLP_RESEARCH_ALIGNMENT.md`.

> **Final rule:** Build the SVM as an independently defensible research
> component first. Integrate it into VitalSync second.
