# VitalSync NLP Research Alignment and Change Control

**Authority:** `NLP.md` is primary.

## 1. Purpose

This file protects the approved research scope from being silently
changed for implementation convenience.

## 2. Frozen scope

The Research Questions and Specific Objectives are **FROZEN**.

They must not be rewritten, paraphrased, shortened, removed, or replaced
to fit software implementation. Research-scope changes require the
appropriate mentor/panel/adviser process.

RQ2 remains the approved question concerning an SVM classifying and
quantifying subjective well-being and stress levels from weekly
free-text survey inputs using Precision, Recall, and F1-Score.

## 3. Alignment matrix

  Area                   Status            Position
  ---------------------- ----------------- --------------------------------------------------
  RQ2                    FROZEN            Do not modify
  Objective 2            FROZEN            Do not modify
  Stress classes         FINAL             No/Mild/Moderate/High
  Dataset                FINAL             \~1,000 researcher-generated simulated texts
  AI assistance          FINAL             AI-assisted, researcher reviewed
  Annotators             FINAL             Two; user is second annotator
  Languages              FINAL             English/Filipino/mixed
  Bisaya                 OUT               Not current scope
  Model                  FINAL             Linear SVM
  Multiclass             FINAL             One-vs-Rest
  Features               FINAL             TF-IDF
  Tuning                 FINAL DIRECTION   Small validation-based C selection
  Final training         FINAL DIRECTION   Train+validation refit; test once
  Metrics                FINAL             Accuracy, per-class P/R/F1, Macro-F1, 4x4 matrix
  NLP purpose            FINAL             Standalone research demonstration
  Integration            FINAL TARGET      PWA defense demonstration
  Guided Reflection      FINAL             Five answers -\> one NLP input
  Social Connectedness   OUT               Not classified
  Backend                CONFIRMED         Django + DRF + PostgreSQL
  Supabase               ARCHITECTURE      PostgreSQL host; app uses Django
  Express/Node           LEGACY            Not active backend
  Defense                FINAL TARGET      PWA reflection -\> SVM -\> Your Journey

## 4. Backend clarification

Earlier inspection found Node/Express code in a branch/state associated
with the local-storage frontend. That was incorrectly interpreted as the
active backend.

Current verified architecture:

``` text
React/Vite -> Django REST Framework -> PostgreSQL
```

Branch context: - `main` = latest frontend; - `test-branch` = JS backend
work; - branches are separated while backend/Supabase work proceeds.

The backend implementation guide explicitly identifies the Express
startup path as leftover code. Do not describe Express/Node as the
active backend.

## 5. Superseded binary brief

The previous JS brief specified:

``` text
HIGH_STRESS
LOW_NORMAL
```

That design is **SUPERSEDED**.

Current:

``` text
NO_STRESS
MILD_STRESS
MODERATE_STRESS
HIGH_STRESS
```

The old brief is historical only.

## 6. Research vs engineering

### Research requirements

Frozen RQs/objectives, research target, dataset provenance, annotation,
evaluation, limitations and simulated-data boundary.

### Engineering decisions

Python implementation, TF-IDF settings, OvR, C grid, persistence, API
endpoint and integration mechanics.

Engineering choices must not silently change research scope.

## 7. Evidence rules

These must come from actual data/execution: - dataset size/class
counts; - agreement; - selected C; - Accuracy; - Precision; - Recall; -
F1; - Macro-F1; - confusion matrix; - model version.

No AI assistant may invent them.

## 8. Dataset alignment

The manuscript target is approximately 1,000 texts. Earlier smaller
working datasets are intermediate artifacts. Final reporting must match
the actual final model dataset.

## 9. Change procedure

For a substantive change: 1. identify affected section; 2. classify it
as research or engineering; 3. check `NLP.md`; 4. document the proposal;
5. determine whether frozen research scope is affected; 6. obtain
approval if required; 7. update `NLP.md`; 8. record it in
`NLP_WORK_LOG.md`.

## 10. Genuine open items

-   final dataset count;
-   final preprocessing parameters;
-   selected C;
-   final model version;
-   exact Django endpoint path;
-   exact persistence behavior for classification output;
-   final UI wording.

The four classes, OvR, standalone purpose, Django/DRF architecture,
language scope, Guided Reflection aggregation and defense concept are
**not** open decisions.
