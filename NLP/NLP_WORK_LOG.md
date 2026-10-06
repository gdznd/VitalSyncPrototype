# VitalSync NLP Work Log

**Authority:** `NLP.md` is authoritative. This file records history.

## October 6, 2026

### 1. Original task

The original JS NLP brief specified binary:

``` text
HIGH_STRESS
LOW_NORMAL
```

It assigned JS implementation/backend work and JC
research/data/documentation.

**Status: superseded.**

### 2. Four-class decision

The current design is:

``` text
NO_STRESS
MILD_STRESS
MODERATE_STRESS
HIGH_STRESS
```

This is final.

### 3. Dataset

Current direction follows the manuscript target of approximately 1,000
researcher-generated simulated texts, AI-assisted and reviewed. No real
patient reflections/PII are used.

Earlier smaller datasets are intermediate artifacts.

### 4. Annotation

Two annotators are required. The user/researcher is the second
annotator. Final agreement must be calculated from actual annotations.

### 5. Model

Final primary model:

``` text
TF-IDF -> Linear SVM -> One-vs-Rest
```

OvR was selected for simplicity, defensibility and suitability to the
four-class capstone demonstration.

### 6. Tuning

Small validation-based C search:

``` text
0.01, 0.1, 1, 10
```

Select using Macro-F1, then refit train+validation and test once.

The actual selected C must come from the model run.

### 7. Language

English, Filipino and mixed English-Filipino. Bisaya is outside current
scope.

### 8. Guided Reflection

Five Guided Reflection answers are combined into one NLP input,
producing one classification. Social Connectedness is excluded.

### 9. Standalone research purpose

The adviser clarified that the NLP module's essential purpose is a
research demonstration: the team needs to demonstrate that the SVM
exists and works. Therefore the standalone NLP component is the
completion baseline.

### 10. Defense

Selected defense flow:

``` text
Synthetic patient account
 -> Patient PWA
 -> Stress Log/reflection
 -> SVM
 -> stress class
 -> Your Journey
```

Technical metrics/confusion matrix/model pipeline are also available for
panel questioning.

### 11. Backend clarification

An earlier audit interpreted Node/Express code as the active backend.

That was traced to the wrong/older branch/state.

Verified current architecture:

``` text
React/Vite -> Django REST Framework -> PostgreSQL
```

Branch context: - `main`: latest frontend; - `test-branch`: JS backend
work.

The backend implementation guide explicitly says the Express startup
path is leftover code and is not the active Django API.

### 12. Documentation decision

The team chose four files:

``` text
NLP.md
NLP_HANDOFF.md
NLP_RESEARCH_ALIGNMENT.md
NLP_WORK_LOG.md
```

`NLP.md` is the master source of truth. The other three provide
operational handoff, research change control, and history.

## Superseded material

Do not use as current requirements: - binary `HIGH_STRESS/LOW_NORMAL`; -
Express/Node as active backend; - NLP completion being dependent on full
frontend/backend integration.

## Current state

``` text
Target: ~1,000 simulated texts
Classes: No/Mild/Moderate/High Stress
Model: TF-IDF + Linear SVM
Multiclass: OvR
Split: 70/15/15
Tuning: validation-based C
Final: train+validation refit -> held-out test once
Metrics: Accuracy, per-class P/R/F1, Macro-F1, 4x4 matrix
Core: standalone research demonstration
Defense: PWA -> Stress Log -> SVM -> Your Journey
Backend: Django + DRF + PostgreSQL
Languages: English/Filipino/mixed
Guided Reflection: five answers -> one input
```

If this historical record conflicts with `NLP.md`, **`NLP.md` wins**.
