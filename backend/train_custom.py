import argparse
from loguru import logger
import torch
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    logger.error("ultralytics is not installed. Please install it using: pip install ultralytics")

def train_custom_model(data_yaml: str, epochs: int = 100, batch_size: int = 16):
    """
    Fine-tunes a YOLOv8 model on a custom dataset.
    Uses YOLOv8s as the base for the optimal speed/accuracy tradeoff.
    Adjusts hyper-parameters for challenging objects (small objects, wires, focus levels).
    """
    
    # 1. Model Selection
    # Rationale: YOLOv8s (Small) provides the best real-time FPS on edge devices 
    # while maintaining high mAP (Mean Average Precision) compared to the Nano model.
    model_name = "yolov8s.pt"
    logger.info(f"Loading base model: {model_name}")
    model = YOLO(model_name)
    
    # 2. Hardware selection
    device = "cpu"
    if torch.cuda.is_available():
        device = 0
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        device = "mps"
        
    logger.info(f"Training on device: {device}")
    
    # 3. Custom Hyperparameter Configuration
    # We increase box/cls weights slightly to penalize bad bounding boxes more heavily,
    # and use mosaic augmentation to simulate different focus levels/scales.
    training_args = {
        "data": data_yaml,
        "epochs": epochs,
        "batch": batch_size,
        "device": device,
        "imgsz": 640,            # Standard resolution
        "patience": 20,          # Early stopping
        "optimizer": "auto",     # AdamW or SGD depending on dataset size
        "lr0": 0.005,            # Initial learning rate
        "lrf": 0.01,             # Final learning rate fraction
        "box": 7.5,              # Box loss gain (higher = tighter boxes)
        "cls": 0.5,              # Class loss gain (higher = stricter classification)
        "dfl": 1.5,              # Distribution Focal Loss (improves precise boundary detection for small objects like wires)
        "mosaic": 1.0,           # Mosaic augmentation (combines 4 images, great for multi-scale context)
        "mixup": 0.1,            # Mixup augmentation 
        "hsv_h": 0.015,          # Hue augmentation
        "hsv_s": 0.7,            # Saturation augmentation
        "hsv_v": 0.4,            # Value augmentation
        "degrees": 10.0,         # Rotation
        "scale": 0.5,            # Scale augmentation (helps with distant vs close objects)
    }
    
    logger.info(f"Starting custom training with hyperparameters: {training_args}")
    
    try:
        results = model.train(**training_args)
        logger.info("Training complete!")
        
        # 4. Optional: Auto-export best model to optimized formats
        best_model_path = Path("runs/detect/train/weights/best.pt")
        if best_model_path.exists():
            logger.info("Exporting the best trained model to ONNX for fast inference...")
            best_model = YOLO(str(best_model_path))
            best_model.export(format="onnx", half=True, simplify=True)
            logger.info(f"Custom model successfully exported! You can find your weights in {best_model_path.parent}")
            
    except Exception as e:
        logger.error(f"Training failed: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train custom YOLOv8 model on generated dataset")
    parser.add_argument("--data", type=str, required=True, help="Path to data.yaml file")
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    
    args = parser.parse_args()
    train_custom_model(args.data, args.epochs, args.batch)
