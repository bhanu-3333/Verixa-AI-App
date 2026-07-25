# backend/verify_and_train.py
import os
import json
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix, precision_score, recall_score, f1_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

TARGET_PHRASES = [
    "WHEN_SHOULD_I_TAKE_MY_TABLETS",
    "BANK_ACCOUNT_REQUIRED_DETAILS",
    "CAN_YOU_HELP_ME",
    "CAN_YOU_CONVEY_THIS_MESSAGE"
]

# Mapping directory names (case-insensitive) to canonical index
DIR_TO_LABEL_IDX = {
    "WHEN_SHOULD_I_TAKE_MY_TABLETS": 0,
    "BANK_ACCOUNT_REQUIRED_DETAILS": 1,
    "CAN_YOU_HELP_ME": 2,
    "CAN_YOU_CONVEY_THIS_MESSAGE": 3
}

SEQUENCE_LENGTH = 30
FEATURE_DIM = 126  # 21 landmarks * 3 (x,y,z) * 2 hands

# ==========================================
# PHASE 1: DATASET VERIFICATION
# ==========================================
def verify_sample(filepath):
    """
    Verifies a single JSON sample file.
    Checks:
    - Valid JSON
    - Has 'sequence' key with list
    - frame_count > 0
    - Each frame has leftHand/rightHand
    - Landmark values are numeric, no NaN, no Infinity
    """
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return False, f"JSON decode error: {e}"

    if not isinstance(data, dict):
        return False, "Root JSON is not an object"

    seq = data.get("sequence")
    if not isinstance(seq, list) or len(seq) == 0:
        return False, "Sequence missing or empty"

    for f_idx, frame in enumerate(seq):
        if not isinstance(frame, dict):
            return False, f"Frame {f_idx} is not a dictionary"

        for hand_key in ["leftHand", "rightHand"]:
            hand = frame.get(hand_key)
            if hand is not None:
                if not isinstance(hand, list):
                    return False, f"Frame {f_idx} {hand_key} is not a list"
                if len(hand) != 21:
                    return False, f"Frame {f_idx} {hand_key} length is {len(hand)}, expected 21"
                for p_idx, point in enumerate(hand):
                    if not isinstance(point, dict):
                        return False, f"Frame {f_idx} {hand_key} pt {p_idx} invalid"
                    for axis in ["x", "y", "z"]:
                        val = point.get(axis)
                        if val is None or not isinstance(val, (int, float)):
                            return False, f"Frame {f_idx} {hand_key} pt {p_idx} {axis} non-numeric"
                        if np.isnan(val) or np.isinf(val):
                            return False, f"Frame {f_idx} {hand_key} pt {p_idx} {axis} NaN/Inf"

    return True, "Valid"

def run_phase1_verification():
    print("=" * 60)
    print("PHASE 1 — DATASET VERIFICATION REPORT")
    print("=" * 60)

    stats = {}
    valid_samples = []
    invalid_samples = []

    # Find directories in DATASET_DIR
    subdirs = [d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))]
    
    for subdir in subdirs:
        # Match directory name to canonical target
        key_upper = subdir.upper()
        canonical = None
        for target in TARGET_PHRASES:
            if target.upper() == key_upper:
                canonical = target
                break
        
        if not canonical:
            print(f"[SKIP] Directory '{subdir}' does not match target phrases.")
            continue

        target_path = os.path.join(DATASET_DIR, subdir)
        files = sorted([f for f in os.listdir(target_path) if f.endswith(".json")])

        valid_count = 0
        corrupt_count = 0

        for fname in files:
            fpath = os.path.join(target_path, fname)
            is_valid, reason = verify_sample(fpath)
            if is_valid:
                valid_count += 1
                valid_samples.append((fpath, canonical))
            else:
                corrupt_count += 1
                invalid_samples.append((fpath, reason))
                print(f"[CORRUPT] {fpath}: {reason}")

        stats[canonical] = {
            "dir": subdir,
            "total_found": len(files),
            "valid": valid_count,
            "corrupt": corrupt_count
        }

    print("\nVerification Summary:")
    total_valid = 0
    for phrase, s in stats.items():
        print(f"  • {phrase:32s} : {s['valid']} valid samples (Corrupt: {s['corrupt']})")
        total_valid += s['valid']

    print(f"\nTotal Valid Dataset Samples: {total_valid}")
    print(f"Total Corrupted Samples Removed: {len(invalid_samples)}")
    print("Verification Completed cleanly.\n")

    return valid_samples, stats

# ==========================================
# PHASE 2: PREPROCESSING DATASET
# ==========================================
def normalize_hand(landmarks):
    """
    Normalizes 21 3D landmarks for a single hand:
    1. Wrist (index 0) shifted to origin (0, 0, 0)
    2. Scale normalized by distance from wrist (0) to middle finger MCP (index 9)
    Returns 63-dim numpy array.
    """
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
    """Processes frame to produce 126-dim vector (63 left + 63 right)."""
    left = normalize_hand(frame.get("leftHand"))
    right = normalize_hand(frame.get("rightHand"))
    return np.concatenate([left, right])

def resample_sequence(frames_np, target_len=30):
    """Resamples a sequence of frames to exactly target_len frames."""
    n = len(frames_np)
    if n == 0:
        return np.zeros((target_len, FEATURE_DIM), dtype=np.float32)
    if n == target_len:
        return frames_np

    indices = np.linspace(0, n - 1, target_len).round().astype(np.int32)
    return frames_np[indices]

def run_phase2_preprocessing(valid_samples):
    print("=" * 60)
    print("PHASE 2 — PREPROCESSING DATASET")
    print("=" * 60)

    X_list = []
    y_list = []

    for fpath, phrase in valid_samples:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        seq = data.get("sequence", [])
        norm_frames = [process_frame(fr) for fr in seq]
        frames_np = np.array(norm_frames, dtype=np.float32)

        resampled = resample_sequence(frames_np, target_len=SEQUENCE_LENGTH)
        label_idx = DIR_TO_LABEL_IDX[phrase]

        X_list.append(resampled)
        y_list.append(label_idx)

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int32)

    print(f"Preprocessed X tensor shape : {X.shape}")
    print(f"Preprocessed y tensor shape : {y.shape}")

    # Save numpy tensors
    np.save(os.path.join(MODELS_DIR, "X.npy"), X)
    np.save(os.path.join(MODELS_DIR, "y.npy"), y)

    # Save sign_phrase_labels.json mapping idx -> phrase
    label_map = {str(idx): phrase for phrase, idx in DIR_TO_LABEL_IDX.items()}
    with open(os.path.join(MODELS_DIR, "sign_phrase_labels.json"), "w", encoding="utf-8") as f:
        json.dump(label_map, f, indent=2)

    print(f"Saved X.npy, y.npy, and sign_phrase_labels.json to {MODELS_DIR}\n")
    return X, y, label_map

# ==========================================
# PHASE 3: MODEL TRAINING
# ==========================================
def build_bidi_lstm(input_shape=(30, 126), num_classes=4):
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=input_shape),
        tf.keras.layers.Masking(mask_value=0.0),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(64, return_sequences=True)),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32)),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(num_classes, activation="softmax")
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model

def run_phase3_training(X, y, label_map):
    print("=" * 60)
    print("PHASE 3 — BIDIRECTIONAL LSTM TRAINING")
    print("=" * 60)

    # Split dataset into train (70%), val (15%), test (15%) with stratification
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    print(f"Train set shape : {X_train.shape}, labels distribution: {np.bincount(y_train)}")
    print(f"Val set shape   : {X_val.shape}, labels distribution: {np.bincount(y_val)}")
    print(f"Test set shape  : {X_test.shape}, labels distribution: {np.bincount(y_test)}")

    # Compute class weights for imbalanced classes
    classes = np.unique(y_train)
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
    class_weight_dict = {cls: float(w) for cls, w in zip(classes, weights)}
    print(f"Computed Class Weights: {class_weight_dict}")

    model = build_bidi_lstm(input_shape=(SEQUENCE_LENGTH, FEATURE_DIM), num_classes=4)
    model.summary()

    model_path = os.path.join(MODELS_DIR, "sign_phrase_model.keras")

    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=25, restore_best_weights=True, verbose=1),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=10, min_lr=1e-5, verbose=1),
        tf.keras.callbacks.ModelCheckpoint(model_path, monitor="val_accuracy", save_best_only=True, verbose=1)
    ]

    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=150,
        batch_size=16,
        class_weight=class_weight_dict,
        callbacks=callbacks,
        verbose=1
    )

    # Save trained Keras model explicitly
    model.save(model_path)
    print(f"Explicitly saved Keras model to {model_path}")

    # Evaluate on Train, Val, Test
    train_loss, train_acc = model.evaluate(X_train, y_train, verbose=0)
    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)

    y_test_pred_prob = model.predict(X_test, verbose=0)
    y_test_pred = np.argmax(y_test_pred_prob, axis=1)

    cm = confusion_matrix(y_test, y_test_pred, labels=[0, 1, 2, 3]).tolist()
    prec = float(precision_score(y_test, y_test_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_test_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_test_pred, average="weighted", zero_division=0))

    metrics_output = {
        "train_accuracy": float(train_acc),
        "validation_accuracy": float(val_acc),
        "test_accuracy": float(test_acc),
        "train_loss": float(train_loss),
        "validation_loss": float(val_loss),
        "test_loss": float(test_loss),
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "confusion_matrix": cm,
        "target_names": [label_map[str(i)] for i in range(4)],
        "history": {
            "loss": [float(v) for v in history.history["loss"]],
            "val_loss": [float(v) for v in history.history["val_loss"]],
            "accuracy": [float(v) for v in history.history["accuracy"]],
            "val_accuracy": [float(v) for v in history.history["val_accuracy"]],
        }
    }

    metrics_file = os.path.join(MODELS_DIR, "training_metrics.json")
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics_output, f, indent=2)

    print("\n--- MODEL PERFORMANCE METRICS ---")
    print(f"  Training Accuracy   : {train_acc * 100:.2f}%")
    print(f"  Validation Accuracy : {val_acc * 100:.2f}%")
    print(f"  Test Accuracy       : {test_acc * 100:.2f}%")
    print(f"  Precision (weighted): {prec:.4f}")
    print(f"  Recall (weighted)   : {rec:.4f}")
    print(f"  F1 Score (weighted) : {f1:.4f}")
    print(f"  Confusion Matrix    :\n{np.array(cm)}")
    print(f"Saved best model to: {model_path}")
    print(f"Saved training metrics to: {metrics_file}\n")

    return metrics_output

if __name__ == "__main__":
    valid_samples, stats = run_phase1_verification()
    X, y, label_map = run_phase2_preprocessing(valid_samples)
    metrics = run_phase3_training(X, y, label_map)
