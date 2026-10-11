"""Stress-only four-class NLP/SVM module (doctor-facing technical output).

Labels: NO_STRESS, MILD_STRESS, MODERATE_STRESS, HIGH_STRESS. No probability or
confidence is produced, and reflection text must never be logged.
"""
import json
import re
from pathlib import Path

LABELS = ("NO_STRESS", "MILD_STRESS", "MODERATE_STRESS", "HIGH_STRESS")
MODEL_DIR = Path(__file__).resolve().parent / "nlp_model"
MODEL_FILE = MODEL_DIR / "stress_svm.joblib"
META_FILE = MODEL_DIR / "stress_svm.json"
ANSWER_SEPARATOR = "||"

_model = None


def preprocess(text: str) -> str:
    """Same preprocessing the model was trained with. No stopword removal or stemming."""
    t = text.lower().replace("||", " . ")
    t = re.sub(r"\bcan't\b", "can not", t)
    t = re.sub(r"\bwon't\b", "will not", t)
    t = re.sub(r"n't\b", " not", t)
    t = re.sub(r"[^\w\s'-]", " ", t)
    t = re.sub(r"(?<!\w)['-]|['-](?!\w)", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def normalize_reflection(detail: str) -> str:
    """Join non-blank answers (Q1-Q5 order) with single spaces, each ending in punctuation."""
    if not isinstance(detail, str):
        return ""
    parts = []
    for answer in detail.split(ANSWER_SEPARATOR):
        answer = answer.strip()
        if not answer:
            continue
        if answer[-1] not in ".!?":
            answer += "."
        parts.append(answer)
    return " ".join(parts)


def model_metadata():
    try:
        return json.loads(META_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _load_model():
    global _model
    if _model is None:
        import joblib

        _model = joblib.load(MODEL_FILE)
    return _model


def classify_reflection(detail: str):
    """Return (label, status). status is 'ok', 'unable_to_classify' or 'model_unavailable'."""
    text = normalize_reflection(detail)
    if not preprocess(text):
        return None, "unable_to_classify"
    try:
        label = str(_load_model().predict([text])[0])
    except Exception:
        return None, "model_unavailable"
    if label not in LABELS:
        return None, "model_unavailable"
    return label, "ok"
