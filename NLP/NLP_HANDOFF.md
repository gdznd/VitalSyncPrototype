# VitalSync NLP Handoff

**Authority:** `NLP.md` is the master source of truth.

## 1. Coordination

``` text
Research / Dataset -> NLP Implementation -> VitalSync Integration
```

Do not invent research assumptions when the dataset or specification is
incomplete.

## 2. JC -\> JS

JC provides: - `NLP.md`; - dataset and dataset version; - label
definitions/annotation guide; - annotation status and quality-control
results; - split information; - provenance; - demo examples; - research
limitations.

JS confirms the dataset is usable, labels are valid, splits are
reproducible, and leakage is not obvious.

## 3. JS deliverables

JS implements: - preprocessing; - TF-IDF; - Linear SVM; - One-vs-Rest; -
validation-based C selection; - train+validation refit; - held-out
test; - evaluation; - confusion matrix; - reproducible model artifact; -
inference; - model version; - tests; - Django/DRF integration when
ready.

JS hands over actual: - final dataset count; - split counts; -
preprocessing configuration; - selected C; - model configuration; -
Accuracy; - per-class Precision/Recall/F1; - Macro-F1; - confusion
matrix; - model version; - limitations.

**Never hand over invented numbers.**

## 4. JS -\> Frontend

Once the actual Django route is implemented, provide: - exact
endpoint; - HTTP method; - request schema; - response schema; -
authentication; - four valid labels; - model version behavior; -
loading/null/error behavior.

Valid labels:

``` text
NO_STRESS
MILD_STRESS
MODERATE_STRESS
HIGH_STRESS
```

The obsolete `HIGH_STRESS/LOW_NORMAL` contract must not be used.

## 5. Frontend input

Each classification event receives one reflection.

For Guided Reflection:

``` text
five answers -> combine in question order -> one NLP input -> one class
```

Social Connectedness is not part of this input.

## 6. Your Journey

Display the returned class using the approved four categories.

Do not display: - diagnostic claims; - fabricated probabilities; -
fabricated confidence; - clinical recommendations.

Handle unavailable/null results safely.

## 7. Defense handoff

Prepare: - synthetic patient account; - Stress Log workflow; -
classifier integration; - Your Journey display; - technical metrics; -
confusion matrix; - standalone inference fallback.

Defense flow:

``` text
Login -> Stress Log -> reflection -> SVM -> class -> Your Journey
```

## 8. Acceptance checklist

### Research -\> NLP

-   [ ] dataset received
-   [ ] labels confirmed
-   [ ] annotation guide received
-   [ ] dataset version recorded
-   [ ] split recorded
-   [ ] quality checks recorded

### NLP -\> Integration

-   [ ] model loads
-   [ ] model version recorded
-   [ ] API contract documented
-   [ ] four labels confirmed
-   [ ] error behavior documented
-   [ ] authentication documented

### Integration -\> Defense

-   [ ] synthetic account works
-   [ ] Stress Log works
-   [ ] reflection reaches classifier
-   [ ] classification returns
-   [ ] Your Journey displays result
-   [ ] metrics available
-   [ ] standalone fallback available

## 9. Boundary

This handoff document does not authorize: - changes to RQ2/objectives; -
binary classification; - replacing SVM with an LLM; - unrelated NLP
features; - clinical diagnosis; - invented results.

When uncertain, return to `NLP.md`.
