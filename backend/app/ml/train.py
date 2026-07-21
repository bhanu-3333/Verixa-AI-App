# backend/app/ml/train.py
import os
import sys
import json
import numpy as np

# Adjust python path to allow importing from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.services.sign_service import (
    MODELS_DIR,
    MODEL_PATH,
    LABEL_PATH,
    PHRASES,
    SEQUENCE_LENGTH,
    FEATURE_DIM
)

def train_model():
    print("=" * 60)
    print("  VERIXA AI — GESTURE SEQUENCE LSTM/GRU MODEL TRAINING")
    print("=" * 60)

    x_path = os.path.join(MODELS_DIR, "X.npy")
    y_path = os.path.join(MODELS_DIR, "y.npy")

    if not os.path.exists(x_path) or not os.path.exists(y_path):
        print(f"Preprocessed features/labels not found at {MODELS_DIR}.")
        print("Please run preprocess.py first after collecting dataset recordings.")
        return

    # Load preprocessed arrays
    X = np.load(x_path)
    y = np.load(y_path)

    num_samples = X.shape[0]
    print(f"Loaded dataset containing {num_samples} samples.")
    print(f"Features shape: {X.shape}")
    print(f"Labels shape: {y.shape}")

    if num_samples < 20:
        print("Warning: The dataset is too small. Please record more samples first.")

    # 70% Train, 15% Validation, 15% Test Split (Stratified)
    from sklearn.model_split import train_test_split as skl_split
    # Note: sklearn might not be installed, so we can implement a manual stratified split
    # using numpy to avoid adding scikit-learn dependency unnecessarily if it's not present!
    # Let's check if we can write a clean, native numpy stratified split or import sklearn if available.
    # A manual numpy stratified split is extremely elegant, dependency-free, and guaranteed to work!
    train_idx, val_idx, test_idx = [], [], []
    for class_idx in range(len(PHRASES)):
        class_indices = np.where(y == class_idx)[0]
        n_class = len(class_indices)
        if n_class == 0:
            continue
        # Shuffle indices of this class
        np.random.shuffle(class_indices)
        
        # Calculate splits
        n_train = int(0.70 * n_class)
        n_val = int(0.15 * n_class)
        
        train_idx.extend(class_indices[:n_train])
        val_idx.extend(class_indices[n_train:n_train + n_val])
        test_idx.extend(class_indices[n_train + n_val:])

    # Shuffle split indexes
    np.random.shuffle(train_idx)
    np.random.shuffle(val_idx)
    np.random.shuffle(test_idx)

    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    print(f"\nDataset Splits:")
    print(f"  - Train      : {len(X_train)} samples")
    print(f"  - Validation : {len(X_val)} samples")
    print(f"  - Test       : {len(X_test)} samples")

    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Masking, LSTM, GRU, Dense, Dropout
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

    # Build sequence classification model
    model = Sequential([
        Masking(mask_value=0.0, input_shape=(SEQUENCE_LENGTH, FEATURE_DIM)),
        LSTM(64, dropout=0.2, recurrent_dropout=0.2, return_sequences=False),
        Dense(64, activation='relu'),
        Dropout(0.5),
        Dense(len(PHRASES), activation='softmax')
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    print("\nModel Summary:")
    model.summary()

    # Callbacks
    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=20,
        restore_best_weights=True,
        verbose=1
    )
    checkpoint = ModelCheckpoint(
        filepath=MODEL_PATH,
        monitor='val_loss',
        save_best_only=True,
        verbose=1
    )
    lr_reduce = ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=6,
        min_lr=1e-5,
        verbose=1
    )

    # Train model
    print("\nStarting model training...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=100,
        batch_size=16,
        callbacks=[early_stop, checkpoint, lr_reduce],
        verbose=1
    )

    print("\nTraining completed. Evaluating on test set...")
    
    # Load best saved model to evaluate
    best_model = tf.keras.models.load_model(MODEL_PATH)
    test_loss, test_acc = best_model.evaluate(X_test, y_test, verbose=0)
    print(f"\nFinal Evaluation:")
    print(f"  - Held-out Test Loss     : {test_loss:.4f}")
    print(f"  - Held-out Test Accuracy : {test_acc:.4f}")

    # Generate confusion matrix and metrics per class
    predictions = best_model.predict(X_test, verbose=0)
    pred_labels = np.argmax(predictions, axis=1)

    print("\nPer-class Metrics on held-out Test Set:")
    per_class_results = {}
    for idx, phrase in enumerate(PHRASES):
        actuals = (y_test == idx)
        preds = (pred_labels == idx)
        
        tp = np.sum(actuals & preds)
        fp = np.sum(~actuals & preds)
        fn = np.sum(actuals & ~preds)
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        print(f"  - {phrase:<32} | Precision: {precision:.2f} | Recall: {recall:.2f} | F1: {f1:.2f}")
        per_class_results[phrase] = {
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1)
        }

    # Save validation reports
    report = {
        "test_loss": float(test_loss),
        "test_accuracy": float(test_acc),
        "per_class_metrics": per_class_results,
        "history": {
            "loss": [float(l) for l in history.history['loss']],
            "accuracy": [float(a) for a in history.history['accuracy']],
            "val_loss": [float(vl) for vl in history.history['val_loss']],
            "val_accuracy": [float(va) for va in history.history['val_accuracy']]
        }
    }
    
    report_path = os.path.join(MODELS_DIR, "training_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\nTraining report saved successfully to {report_path}")

if __name__ == "__main__":
    train_model()
