# backend/app/ml/preprocess.py
import os
import sys
import json
import numpy as np

# Adjust python path to allow importing from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.services.sign_service import (
    SignService,
    DATASET_DIR,
    MODELS_DIR,
    LABEL_PATH,
    PHRASES,
    PHRASE_DIR_MAP,
    SEQUENCE_LENGTH,
    FEATURE_DIM
)

def run_preprocessing():
    print("=" * 60)
    print("  VERIXA AI — LANDMARK PREPROCESSING PIPELINE")
    print("=" * 60)

    if not os.path.exists(DATASET_DIR):
        print(f"Dataset directory not found at: {DATASET_DIR}")
        print("Please collect some samples using the training recorder screen first.")
        return

    os.makedirs(MODELS_DIR, exist_ok=True)
    sign_service = SignService()

    X_data = []
    y_data = []

    # Map phrases to numerical labels
    label_map = {phrase: idx for idx, phrase in enumerate(PHRASES)}

    print(f"Processing sequences from: {DATASET_DIR}")
    print(f"Target sequence length: {SEQUENCE_LENGTH}")
    print(f"Feature dimension: {FEATURE_DIM}")

    phrase_counts = {phrase: 0 for phrase in PHRASES}

    for phrase, dir_name in PHRASE_DIR_MAP.items():
        phrase_dir = os.path.join(DATASET_DIR, dir_name)
        if not os.path.exists(phrase_dir):
            continue

        label_idx = label_map[phrase]
        files = [f for f in os.listdir(phrase_dir) if f.endswith(".json")]

        for filename in files:
            filepath = os.path.join(phrase_dir, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)

                raw_sequence = data.get("sequence", [])
                if not raw_sequence:
                    print(f"  [Warning] Skipping empty sample: {filepath}")
                    continue

                # Process each frame
                normalized_frames = []
                for frame in raw_sequence:
                    normalized_frames.append(sign_service.process_frame(frame))

                # Resample sequence to target length (30)
                resampled = sign_service.resample_sequence(normalized_frames, target_len=SEQUENCE_LENGTH)
                
                X_data.append(resampled)
                y_data.append(label_idx)
                phrase_counts[phrase] += 1
            except Exception as e:
                print(f"  [Error] Failed to process {filepath}: {e}")

    total_samples = len(X_data)
    print("\nSummary of processed samples:")
    for phrase, count in phrase_counts.items():
        print(f"  - {phrase:<32}: {count} samples")
    print(f"\nTotal samples successfully preprocessed: {total_samples}")

    if total_samples == 0:
        print("No samples were preprocessed. Please collect dataset recordings first.")
        return

    # Convert to numpy arrays
    X = np.array(X_data, dtype=np.float32)  # Shape: (N, 30, 126)
    y = np.array(y_data, dtype=np.int32)    # Shape: (N,)

    # Save preprocessed numpy arrays
    x_save_path = os.path.join(MODELS_DIR, "X.npy")
    y_save_path = os.path.join(MODELS_DIR, "y.npy")
    np.save(x_save_path, X)
    np.save(y_save_path, y)

    # Save index-to-phrase mapping
    idx_to_phrase = {idx: phrase for phrase, idx in label_map.items()}
    with open(LABEL_PATH, "w", encoding="utf-8") as f:
        json.dump(idx_to_phrase, f, indent=2)

    print("\nPreprocessing complete [OK]")
    print(f"  - Features saved to : {x_save_path} (shape: {X.shape})")
    print(f"  - Labels saved to   : {y_save_path} (shape: {y.shape})")
    print(f"  - Label map saved to: {LABEL_PATH}")

if __name__ == "__main__":
    run_preprocessing()
