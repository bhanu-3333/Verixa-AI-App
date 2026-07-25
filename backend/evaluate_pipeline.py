# backend/evaluate_pipeline.py
import os
import json
import numpy as np
from app.services.sign_service import SignService, PHRASES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODELS_DIR = os.path.join(BASE_DIR, "models")

DIR_MAP = {
    "WHEN_SHOULD_I_TAKE_MY_TABLETS": "WHEN_SHOULD_I_TAKE_MY_TABLETS",
    "BANK_ACCOUNT_REQUIRED_DETAILS": "BANK_ACCOUNT_REQUIRED_DETAILS",
    "CAN_YOU_HELP_ME": "can_you_help_me",
    "CAN_YOU_CONVEY_THIS_MESSAGE": "CAN_YOU_CONVEY_THIS_MESSAGE"
}

def run_phase6_evaluation():
    print("=" * 60)
    print("PHASE 6 — END-TO-END PIPELINE VALIDATION TEST")
    print("=" * 60)

    service = SignService()
    results = {}

    for phrase in PHRASES:
        dir_name = DIR_MAP[phrase]
        target_dir = os.path.join(DATASET_DIR, dir_name)
        if not os.path.exists(target_dir):
            print(f"[WARN] Directory not found for phrase: {phrase}")
            continue

        files = sorted([f for f in os.listdir(target_dir) if f.endswith(".json")])
        if len(files) == 0:
            print(f"[WARN] No sample files for phrase: {phrase}")
            continue

        # Sample up to 10 files (or repeat index modulo total)
        sample_files = [files[i % len(files)] for i in range(10)]

        correct = 0
        incorrect = 0
        confidences = []
        misclassified_as = []

        for fname in sample_files:
            fpath = os.path.join(target_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)

            raw_sequence = data.get("sequence", [])
            pred_res = service.predict_phrase(raw_sequence)

            pred_phrase = pred_res.get("phrase")
            conf = pred_res.get("confidence", 0.0)
            confidences.append(conf)

            if pred_phrase == phrase:
                correct += 1
            else:
                incorrect += 1
                misclassified_as.append(pred_phrase or "None")

        avg_conf = float(np.mean(confidences)) if confidences else 0.0

        results[phrase] = {
            "correct_predictions": correct,
            "incorrect_predictions": incorrect,
            "accuracy_pct": (correct / 10) * 100.0,
            "average_confidence": round(avg_conf, 4),
            "misclassified_as": list(set(misclassified_as)) if misclassified_as else ["None"]
        }

        print(f"\nPhrase: {phrase}")
        print(f"  • Correct Predictions   : {correct} / 10")
        print(f"  • Incorrect Predictions : {incorrect} / 10")
        print(f"  • Average Confidence   : {avg_conf * 100:.2f}%")
        print(f"  • Misclassified As     : {', '.join(results[phrase]['misclassified_as'])}")

    val_file = os.path.join(MODELS_DIR, "validation_results.json")
    with open(val_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\nEnd-to-End Evaluation complete. Saved results to validation_results.json\n")
    return results

if __name__ == "__main__":
    run_phase6_evaluation()
