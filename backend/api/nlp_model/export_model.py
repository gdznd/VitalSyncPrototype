"""Rebuild the deployed model from the frozen dataset (run from backend/).

    .venv-win\\Scripts\\python.exe -m api.nlp_model.export_model <dataset.csv> <selected_C>

Uses the dataset's own split column, TF-IDF + OvR LinearSVC, seed 42, trained on
train+val. Selected C comes from the validation tuning run, not from the test set.
"""
import csv
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.multiclass import OneVsRestClassifier
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from api.stress_nlp import LABELS, META_FILE, MODEL_FILE, preprocess

SEED = 42


def main(dataset_path, c_value):
    path = Path(dataset_path)
    rows = list(csv.DictReader(path.open(encoding="utf-8-sig", newline="")))
    fit_rows = [r for r in rows if r["split"] in ("train", "val")]
    pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    preprocessor=preprocess,
                    ngram_range=(1, 2),
                    sublinear_tf=True,
                    min_df=1,
                    token_pattern=r"(?u)\b[\w'-]+\b",
                ),
            ),
            ("svm", OneVsRestClassifier(LinearSVC(C=c_value, random_state=SEED))),
        ]
    )
    pipeline.fit([r["text"] for r in fit_rows], [r["label"] for r in fit_rows])
    MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_FILE)
    meta = {
        "model_version": "svm-" + datetime.now().strftime("%Y-%m-%d"),
        "labels": list(LABELS),
        "selected_C": c_value,
        "seed": SEED,
        "trained_on": "train+val",
        "n_fit_rows": len(fit_rows),
        "dataset": path.name,
        "dataset_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "model_sha256": hashlib.sha256(MODEL_FILE.read_bytes()).hexdigest(),
        "sklearn": sklearn.__version__,
        "numpy": np.__version__,
    }
    META_FILE.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]))
