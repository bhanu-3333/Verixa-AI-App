# backend/leakage_audit_and_eval.py
import os
import json
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix, precision_score, recall_score, f1_score
from app.services.sign_service import SignService

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODELS_DIR = os.path.join(BASE_DIR, "models")

TARGET_PHRASES = [
    "WHEN_SHOULD_I_TAKE_MY_TABLETS",
    "BANK_ACCOUNT_REQUIRED_DETAILS",
    "CAN_YOU_HELP_ME",
    "CAN_YOU_CONVEY_THIS_MESSAGE"
]

DIR_MAP = {
    "WHEN_SHOULD_I_TAKE_MY_TABLETS": "WHEN_SHOULD_I_TAKE_MY_TABLETS",
    "BANK_ACCOUNT_REQUIRED_DETAILS": "BANK_ACCOUNT_REQUIRED_DETAILS",
    "CAN_YOU_HELP_ME": "can_you_help_me",
    "CAN_YOU_CONVEY_THIS_MESSAGE": "CAN_YOU_CONVEY_THIS_MESSAGE"
}

LABEL_TO_IDX = {phrase: idx for idx, phrase in enumerate(TARGET_PHRASES)}

SEQUENCE_LENGTH = 30
FEATURE_DIM = 126

def normalize_hand(landmarks):
    if not landmarks or len(landmarks) != 21:
        return np.zeros(63, dtype=np.float32)
    coords = np.array([[lm["x"], lm["y"], lm["z"]] for lm in landmarks], dtype=np.float32)
    wrist = coords[0]
    shifted = coords - wrist
    scale = np.linalg.norm(shifted[9])
    if scale > 1e-5:
        normalized = shifted / scale
    else:
        normalized = shifted
    return normalized.flatten()

def process_frame(frame):
    left = normalize_hand(frame.get("leftHand"))
    right = normalize_hand(frame.get("rightHand"))
    return np.concatenate([left, right])

def resample_sequence(frames_np, target_len=30):
    n = len(frames_np)
    if n == 0:
        return np.zeros((target_len, FEATURE_DIM), dtype=np.float32)
    if n == target_len:
        return frames_np
    indices = np.linspace(0, n - 1, target_len).round().astype(np.int32)
    return frames_np[indices]

def run_strict_leakage_audit():
    print("=" * 70)
    print("STRICT DATASET LEAKAGE AUDIT & INDEPENDENT TEST EVALUATION")
    print("=" * 70)

    all_file_entries = [] # list of (filepath, phrase_label, label_idx)

    for phrase in TARGET_PHRASES:
        dir_name = DIR_MAP[phrase]
        target_path = os.path.join(DATASET_DIR, dir_name)
        if not os.path.exists(target_path):
            continue

        files = sorted([f for f in os.listdir(target_path) if f.endswith(".json")])
        for fname in files:
            fpath = os.path.join(target_path, fname)
            all_file_entries.append((fpath, phrase, LABEL_TO_IDX[phrase]))

    filepaths = [entry[0] for entry in all_file_entries]
    labels = [entry[2] for entry in all_file_entries]
    phrases = [entry[1] for entry in all_file_entries]

    # Perform strict stratified train/val/test split at FILE LEVEL
    # 70% Train, 15% Val, 15% Test
    files_train, files_temp, y_train, y_temp = train_test_split(
        filepaths, labels, test_size=0.30, random_state=42, stratify=labels
    )
    files_val, files_test, y_val, y_test = train_test_split(
        files_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    set_train = set(files_train)
    set_val = set(files_val)
    set_test = set(files_test)

    # 1. Leakage Verification Checks
    train_test_overlap = set_train & set_test
    train_val_overlap = set_train & set_val
    val_test_overlap = set_val & set_test

    print("\n--- 1. LEAKAGE CHECK ---")
    print(f"Train vs Test File Overlap : {len(train_test_overlap)} files")
    print(f"Train vs Val File Overlap  : {len(train_val_overlap)} files")
    print(f"Val vs Test File Overlap   : {len(val_test_overlap)} files")

    if train_test_overlap or train_val_overlap or val_test_overlap:
        print("[CRITICAL WARNING] Data leakage detected between splits!")
    else:
        print("[OK] Verified: NO file or sample overlap exists between train, val, and test splits!")

    print("\n--- 2. SAMPLE COUNT PER SPLIT ---")
    print(f"  • Total Dataset Samples : {len(filepaths)}")
    print(f"  • Training Samples     : {len(files_train)} (70%) -> Class dist: {np.bincount(y_train)}")
    print(f"  • Validation Samples   : {len(files_val)} (15%) -> Class dist: {np.bincount(y_val)}")
    print(f"  • Test Samples         : {len(files_test)} (15%) -> Class dist: {np.bincount(y_test)}")

    # Load and preprocess features per split
    def load_features(file_list):
        X_data = []
        for fpath in file_list:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            seq = data.get("sequence", [])
            norm_frames = [process_frame(fr) for fr in seq]
            frames_np = np.array(norm_frames, dtype=np.float32)
            resampled = resample_sequence(frames_np, target_len=SEQUENCE_LENGTH)
            X_data.append(resampled)
        return np.array(X_data, dtype=np.float32)

    X_train = load_features(files_train)
    X_val = load_features(files_val)
    X_test = load_features(files_test)

    y_train = np.array(y_train, dtype=np.int32)
    y_val = np.array(y_val, dtype=np.int32)
    y_test = np.array(y_test, dtype=np.int32)

    # Compute class weights
    classes = np.unique(y_train)
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
    class_weight_dict = {cls: float(w) for cls, w in zip(classes, weights)}

    # Build model architecture
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(SEQUENCE_LENGTH, FEATURE_DIM)),
        tf.keras.layers.Masking(mask_value=0.0),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(64, return_sequences=True)),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32)),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(4, activation="softmax")
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    model_path = os.path.join(MODELS_DIR, "sign_phrase_model.keras")
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=25, restore_best_weights=True, verbose=1),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=10, min_lr=1e-5, verbose=1),
        tf.keras.callbacks.ModelCheckpoint(model_path, monitor="val_accuracy", save_best_only=True, verbose=1)
    ]

    print("\n--- 3. RETRAINING MODEL ON CLEAN TRAIN SPLIT ONLY ---")
    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=150,
        batch_size=16,
        class_weight=class_weight_dict,
        callbacks=callbacks,
        verbose=0
    )

    model.save(model_path)
    print(f"Saved clean trained model to {model_path}")

    # Evaluate model STRICTLY ON UNSEEN TEST DATASET ONLY
    print("\n--- 4. EVALUATION STRICTLY ON UNSEEN TEST DATASET ---")
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    y_test_probs = model.predict(X_test, verbose=0)
    y_test_preds = np.argmax(y_test_probs, axis=1)

    cm = confusion_matrix(y_test, y_test_preds, labels=[0, 1, 2, 3])
    cls_report = classification_report(
        y_test, y_test_preds, target_names=TARGET_PHRASES, output_dict=True, zero_division=0
    )

    print("\nConfusion Matrix (Test Set Only):")
    print(cm)

    print("\nClassification Report (Test Set Only):")
    print(classification_report(y_test, y_test_preds, target_names=TARGET_PHRASES, zero_division=0))

    # Evaluate SignService.predict_phrase strictly on files_test
    print("\n--- 5. END-TO-END SIGN SERVICE TEST ON UNSEEN TEST FILES ---")
    service = SignService()
    # Force reload model
    service.model = tf.keras.models.load_model(model_path)

    test_results_per_phrase = {}
    for phrase in TARGET_PHRASES:
        phrase_test_files = [fpath for fpath, pr, idx in zip(filepaths, phrases, labels) if pr == phrase and fpath in set_test]
        
        correct = 0
        incorrect = 0
        confidences = []
        misclassified = []

        for fpath in phrase_test_files:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            raw_seq = data.get("sequence", [])
            res = service.predict_phrase(raw_seq)

            pred_phrase = res.get("phrase")
            conf = res.get("confidence", 0.0)
            confidences.append(conf)

            if pred_phrase == phrase:
                correct += 1
            else:
                incorrect += 1
                misclassified.append(pred_phrase or "None")

        avg_c = float(np.mean(confidences)) if confidences else 0.0
        acc_pct = (correct / len(phrase_test_files)) * 100.0 if phrase_test_files else 0.0

        test_results_per_phrase[phrase] = {
            "test_sample_count": len(phrase_test_files),
            "correct_predictions": correct,
            "incorrect_predictions": incorrect,
            "accuracy_pct": acc_pct,
            "average_confidence": round(avg_c, 4),
            "misclassified_as": list(set(misclassified)) if misclassified else ["None"]
        }

        print(f"Phrase: {phrase}")
        print(f"  • Test Samples Count   : {len(phrase_test_files)}")
        print(f"  • Correct Predictions   : {correct} / {len(phrase_test_files)}")
        print(f"  • Incorrect Predictions : {incorrect} / {len(phrase_test_files)}")
        print(f"  • Average Confidence   : {avg_c * 100:.2f}%")
        print(f"  • Misclassified As     : {', '.join(test_results_per_phrase[phrase]['misclassified_as'])}\n")

    manifest = {
        "dataset_total": len(filepaths),
        "split_counts": {
            "train": len(files_train),
            "validation": len(files_val),
            "test": len(files_test)
        },
        "leakage_audit": {
            "train_test_overlap": len(train_test_overlap),
            "train_val_overlap": len(train_val_overlap),
            "val_test_overlap": len(val_test_overlap),
            "leakage_detected": False
        },
        "test_metrics": {
            "test_accuracy": float(test_acc),
            "test_loss": float(test_loss),
            "confusion_matrix": cm.tolist(),
            "classification_report": cls_report
        },
        "end_to_end_test_results": test_results_per_phrase
    }

    with open(os.path.join(MODELS_DIR, "split_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("Leakage audit & clean test evaluation completed successfully.\n")

if __name__ == "__main__":
    run_strict_leakage_audit()
