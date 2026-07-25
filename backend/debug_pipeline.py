# backend/debug_pipeline.py
import os
import json
import numpy as np
from app.services.sign_service import SignService, MODEL_PATH, LABEL_PATH, PHRASES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

DIR_MAP = {
    "WHEN_SHOULD_I_TAKE_MY_TABLETS": "WHEN_SHOULD_I_TAKE_MY_TABLETS",
    "BANK_ACCOUNT_REQUIRED_DETAILS": "BANK_ACCOUNT_REQUIRED_DETAILS",
    "CAN_YOU_HELP_ME": "can_you_help_me",
    "CAN_YOU_CONVEY_THIS_MESSAGE": "CAN_YOU_CONVEY_THIS_MESSAGE"
}

def debug_inference_pipeline():
    print("=" * 70)
    print("STEP-BY-STEP INFERENCE PIPELINE DIAGNOSTICS")
    print("=" * 70)

    # 1. Label Mapping Check
    print("\n--- 1. LABEL MAPPING CHECK (Class Index -> Label) ---")
    if os.path.exists(LABEL_PATH):
        with open(LABEL_PATH, "r", encoding="utf-8") as f:
            labels = json.load(f)
        for idx in sorted(labels.keys(), key=lambda k: int(k)):
            print(f"  Class {idx} -> {labels[idx]}")
    else:
        print("[ERROR] Label file does not exist!")

    # 2. Service & Model Load Check
    print("\n--- 2. SERVICE & MODEL INITIALIZATION CHECK ---")
    service = SignService()
    service._load_model_lazy()

    if service.model is None:
        print("[CRITICAL ERROR] SignService model failed to load! Operating in simulation mode.")
    else:
        print(f"[OK] Keras Model Loaded successfully from {MODEL_PATH}")
        print(f"  Model Input Shape : {service.model.input_shape}")
        print(f"  Model Output Shape: {service.model.output_shape}")

    # 3. Test Each Phrase Sample & Print Softmax Probabilities
    print("\n--- 3. SOFTMAX PROBABILITIES & PREDICTION DIAGNOSTICS ---")
    for phrase, dir_name in DIR_MAP.items():
        target_dir = os.path.join(DATASET_DIR, dir_name)
        if not os.path.exists(target_dir):
            continue

        files = sorted([f for f in os.listdir(target_dir) if f.endswith(".json")])
        if not files:
            continue

        # Take first sample of each phrase
        sample_path = os.path.join(target_dir, files[0])
        with open(sample_path, "r", encoding="utf-8") as f:
            sample_data = json.load(f)

        raw_sequence = sample_data.get("sequence", [])

        # Check preprocessing consistency
        norm_frames = [service.process_frame(fr) for fr in raw_sequence]
        resampled = service.resample_sequence(norm_frames, target_len=30)
        input_batch = np.expand_dims(resampled, axis=0)

        print(f"\nTarget Phrase : {phrase}")
        print(f"  Sample File   : {os.path.basename(sample_path)}")
        print(f"  Input Shape   : {input_batch.shape}")

        # Landmark checksum check for frame buffer variance
        frame_checksums = [float(np.sum(np.abs(fr))) for fr in norm_frames[:5]]
        print(f"  Frame Checksums (First 5 frames): {[round(c, 4) for c in frame_checksums]}")

        if service.model is not None:
            raw_preds = service.model.predict(input_batch, verbose=0)[0]
            pred_idx = int(np.argmax(raw_preds))
            pred_label = service.labels.get(str(pred_idx), PHRASES[pred_idx])
            conf = float(raw_preds[pred_idx])

            print(f"  Raw Softmax Probabilities:")
            for idx, prob in enumerate(raw_preds):
                lbl = service.labels.get(str(idx), PHRASES[idx])
                print(f"    Class {idx} ({lbl:30s}): {prob:.6f} ({prob*100:.2f}%)")

            print(f"  Predicted Class Index : {pred_idx}")
            print(f"  Predicted Label       : {pred_label}")
            print(f"  Confidence            : {conf * 100:.2f}%")
            print(f"  Match Target?         : {'YES [OK]' if pred_label == phrase else 'NO [MISMATCH]'}")
        else:
            res = service.predict_phrase(raw_sequence)
            print(f"  [SIMULATION MODE FALLBACK] Result: {res}")

if __name__ == "__main__":
    debug_inference_pipeline()
