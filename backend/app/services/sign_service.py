# backend/app/services/sign_service.py
import os
import json
import numpy as np
from typing import List, Dict, Any, Optional
from app.utils.logger import app_logger

# Define absolute paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "sign_phrase_model.keras")
LABEL_PATH = os.path.join(MODELS_DIR, "sign_phrase_labels.json")

SEQUENCE_LENGTH = 30
FEATURE_DIM = 126 

PHRASES = [
    "CAN I CALL SOMEONE",
    "MY NAME IS",
    "I HAVE LOST MY PURSE",
    "CAN YOU HELP ME",
    "CAN YOU REPEAT WHAT YOU SAID",
    "WHERE IS THIS ADDRESS",
    "CAN YOU CONVEY THIS TO SOMEONE",
    "CAN I GET YOUR NUMBER",
    "WHO ARE YOU",
    "HOW CAN I HELP YOU"
]



PHRASE_DIR_MAP = {
    phrase: phrase.lower().replace(" ", "_") for phrase in PHRASES
}

# Normalization map supporting both space-separated and snake_case phrase IDs
PHRASE_NORM_MAP = {}
for p in PHRASES:
    PHRASE_NORM_MAP[p.upper()] = p
    PHRASE_NORM_MAP[p.lower().replace(" ", "_").upper()] = p

class SignService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(SignService, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.labels = {}
            cls._instance._model_loaded = False
        return cls._instance

    def __init__(self):
        if not self._model_loaded:
            self._load_model_lazy()

    def _load_model_lazy(self):
        """Lazy load the Keras sequence model if it exists."""
        if self.model is not None:
            return

        if os.path.exists(MODEL_PATH) and os.path.exists(LABEL_PATH):
            try:
                import tensorflow as tf
                # Set CPU execution to avoid GPU overhead for single inference
                tf.config.set_visible_devices([], 'GPU')
                self.model = tf.keras.models.load_model(MODEL_PATH)
                with open(LABEL_PATH, "r", encoding="utf-8") as f:
                    self.labels = json.load(f)
                self._model_loaded = True
                app_logger.info(f"[SignService] Loaded LSTM model from {MODEL_PATH}")
            except Exception as e:
                app_logger.error(f"[SignService] Failed to load Keras model: {e}")
                self.model = None
        else:
            app_logger.warning(
                f"[SignService] Model or labels not found at {MODEL_PATH}. "
                "Will operate in recording/simulation mode until model is trained."
            )

    def record_sample(self, phrase: str, sequence: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Save a raw sequence of landmark frames to the dataset directory."""
        key = phrase.strip().upper()
        if key not in PHRASE_NORM_MAP:
            raise ValueError(f"Invalid phrase '{phrase}'. Must be one of the 10 predefined phrases.")

        canonical_phrase = PHRASE_NORM_MAP[key]
        dir_name = PHRASE_DIR_MAP[canonical_phrase]
        target_dir = os.path.join(DATASET_DIR, dir_name)
        os.makedirs(target_dir, exist_ok=True)

        # Count existing samples to determine next filename
        existing_files = [f for f in os.listdir(target_dir) if f.endswith(".json")]
        sample_num = len(existing_files) + 1
        filename = f"sample_{sample_num:03d}.json"
        filepath = os.path.join(target_dir, filename)

        # Save raw JSON sequence data
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "phrase": phrase,
                "sequence": sequence,
                "frame_count": len(sequence)
            }, f, indent=2)

        app_logger.info(f"[SignService] Recorded {phrase} -> {filepath} ({len(sequence)} frames)")
        return {
            "phrase": phrase,
            "filename": filename,
            "total_samples": len(existing_files) + 1
        }

    def delete_last_sample(self, phrase: str) -> Dict[str, Any]:
        """Delete the latest recorded sample for the specified phrase."""
        key = phrase.strip().upper()
        if key not in PHRASE_NORM_MAP:
            raise ValueError(f"Invalid phrase '{phrase}'. Must be one of the 10 predefined phrases.")

        canonical_phrase = PHRASE_NORM_MAP[key]
        dir_name = PHRASE_DIR_MAP[canonical_phrase]
        target_dir = os.path.join(DATASET_DIR, dir_name)
        if not os.path.exists(target_dir):
            return {"deleted": False, "total_samples": 0}
        
        existing_files = sorted([f for f in os.listdir(target_dir) if f.endswith(".json")])
        if not existing_files:
            return {"deleted": False, "total_samples": 0}
        
        last_file = existing_files[-1]
        os.remove(os.path.join(target_dir, last_file))
        app_logger.info(f"[SignService] Deleted latest sample for {phrase}: {last_file}")
        return {"deleted": True, "total_samples": len(existing_files) - 1}

    def get_stats(self) -> Dict[str, Any]:
        """Get the count of recorded samples for each phrase."""
        stats = {}
        total = 0
        for phrase in PHRASES:
            dir_name = PHRASE_DIR_MAP[phrase]
            target_dir = os.path.join(DATASET_DIR, dir_name)
            count = 0
            if os.path.exists(target_dir):
                count = len([f for f in os.listdir(target_dir) if f.endswith(".json")])
            stats[phrase] = count
            total += count
        return {
            "total_samples": total,
            "phrase_stats": stats,
            "model_trained": os.path.exists(MODEL_PATH)
        }

    @staticmethod
    def normalize_single_hand(hand_landmarks: Optional[List[Dict[str, Any]]]) -> np.ndarray:
        """
        Normalize 21 landmark points for a single hand:
        1. Set wrist (index 0) to origin (0, 0, 0)
        2. Scale normalize relative to hand size (wrist to middle finger MCP, index 9)
        Returns a flat 63-dimensional numpy array.
        """
        if not hand_landmarks or len(hand_landmarks) != 21:
            return np.zeros(63, dtype=np.float32)

        # Convert to numpy array shape (21, 3)
        coords = np.array([[lm['x'], lm['y'], lm['z']] for lm in hand_landmarks], dtype=np.float32)

        # Origin shift: subtract wrist (index 0)
        wrist = coords[0]
        shifted = coords - wrist

        # Scale normalize: distance from wrist (0) to middle finger MCP (9)
        hand_scale = np.linalg.norm(shifted[9])
        if hand_scale > 1e-5:
            normalized = shifted / hand_scale
        else:
            normalized = shifted

        return normalized.flatten()

    def process_frame(self, frame: Dict[str, Any]) -> np.ndarray:
        """
        Processes a single frame containing leftHand and rightHand.
        Returns a flat 126-dimensional numpy array.
        """
        left_norm = self.normalize_single_hand(frame.get("leftHand"))
        right_norm = self.normalize_single_hand(frame.get("rightHand"))
        # Concatenate left and right hand features (63 + 63 = 126)
        return np.concatenate([left_norm, right_norm])

    def resample_sequence(self, sequence: List[np.ndarray], target_len: int = 30) -> np.ndarray:
        """
        Resample variable length frames to a fixed target sequence length.
        Uses even-spaced interpolation/indices resampling.
        """
        n = len(sequence)
        if n == 0:
            return np.zeros((target_len, FEATURE_DIM), dtype=np.float32)

        sequence_np = np.array(sequence, dtype=np.float32)
        if n == target_len:
            return sequence_np

        # Resample indices evenly
        indices = np.linspace(0, n - 1, target_len).round().astype(np.int32)
        return sequence_np[indices]

    def predict_phrase(self, raw_sequence: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Run inference using the loaded model.
        If no model is loaded, fallback to simulation mode.
        """
        self._load_model_lazy()

        # Input validation
        if not raw_sequence:
            return {
                "phrase": None,
                "confidence": 0.0,
                "accepted": False,
                "message": "Sequence is empty"
            }

        # Preprocess input sequence
        normalized_frames = []
        for frame in raw_sequence:
            normalized_frames.append(self.process_frame(frame))

        # Resample to configured target length (30)
        input_sequence = self.resample_sequence(normalized_frames, target_len=SEQUENCE_LENGTH)
        # Shape: (1, SEQUENCE_LENGTH, FEATURE_DIM)
        input_batch = np.expand_dims(input_sequence, axis=0)

        # Run model inference if trained model exists
        if self.model is not None:
            try:
                preds = self.model.predict(input_batch, verbose=0)[0]
                best_class_idx = int(np.argmax(preds))
                confidence = float(preds[best_class_idx])
                
                # Retrieve phrase from label mapping
                phrase = self.labels.get(str(best_class_idx)) or self.labels.get(best_class_idx)
                if not phrase:
                    phrase = PHRASES[best_class_idx]

                accepted = confidence >= 0.80

                return {
                    "phrase": phrase if accepted else None,
                    "confidence": confidence,
                    "accepted": accepted,
                    "method": "neural_network"
                }
            except Exception as e:
                app_logger.error(f"[SignService] Inference failed: {e}")
                return {
                    "phrase": None,
                    "confidence": 0.0,
                    "accepted": False,
                    "error": f"Model inference error: {str(e)}"
                }

        # Falls back to simulated prediction if no model exists
        # In mock/simulation mode, we calculate a checksum of non-zero landmarks to choose a mock class
        has_hands = any(frame.get("leftHand") is not None or frame.get("rightHand") is not None for frame in raw_sequence)
        if has_hands:
            # Generate deterministic index based on movement data
            coord_sum = 0
            count = 0
            for frame in raw_sequence:
                for hand_key in ["leftHand", "rightHand"]:
                    hand = frame.get(hand_key)
                    if hand:
                        for lm in hand:
                            coord_sum += abs(lm.get("x", 0)) + abs(lm.get("y", 0))
                            count += 1
            
            mock_idx = int(coord_sum * 100) % len(PHRASES) if count > 0 else 0
            return {
                "phrase": PHRASES[mock_idx],
                "confidence": 0.89,
                "accepted": True,
                "message": "Simulation mode (model not yet trained on backend)."
            }
        else:
            return {
                "phrase": None,
                "confidence": 0.0,
                "accepted": False,
                "message": "Please show your hands in the camera."
            }
