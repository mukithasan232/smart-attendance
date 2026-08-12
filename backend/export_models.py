import os
from pathlib import Path
from loguru import logger
import argparse

def export_yolo_model(model_name="yolov8n-seg.pt", half=True):
    """
    Exports a trained YOLOv8 model (.pt) to optimized hardware formats:
    - TensorRT (.engine) for NVIDIA GPUs
    - CoreML (.mlpackage) for Apple Silicon
    - ONNX (.onnx) for general CPU/GPU fallback
    
    Args:
        model_name: The name of the YOLOv8 weights file in backend/models/
        half: Whether to use FP16 half-precision for speed.
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("ultralytics is not installed. Please install it using: pip install ultralytics")
        return

    base_dir = Path(__file__).resolve().parent
    models_dir = base_dir / "models"
    model_path = models_dir / model_name

    if not model_path.exists():
        logger.warning(f"Base model {model_path} not found. Attempting to download it via Ultralytics...")
        # Ultralytics will auto-download standard models if they don't exist in current dir
        # To keep it in models dir, we change dir temporarily
        os.chdir(models_dir)
        model = YOLO(model_name)
        os.chdir(base_dir)
    else:
        model = YOLO(str(model_path))

    logger.info(f"Loaded YOLO model: {model_name}")

    # 1. Export to ONNX (Universal Fallback)
    logger.info("Exporting to ONNX...")
    try:
        model.export(format="onnx", half=half, simplify=True)
        logger.info("ONNX export successful.")
    except Exception as e:
        logger.error(f"ONNX export failed: {e}")

    # 2. Export to CoreML (Apple Silicon)
    logger.info("Exporting to CoreML (MPS/ANE)...")
    try:
        # Note: CoreML export often requires macOS and `coremltools` installed
        model.export(format="coreml", half=half, nms=True)
        logger.info("CoreML export successful.")
    except Exception as e:
        logger.error(f"CoreML export failed: {e}")

    # 3. Export to TensorRT (NVIDIA GPUs)
    logger.info("Exporting to TensorRT (CUDA)...")
    try:
        # Note: TensorRT export requires CUDA and `tensorrt` package
        model.export(format="engine", half=half, workspace=4)
        logger.info("TensorRT export successful.")
    except Exception as e:
        logger.error(f"TensorRT export failed (this is expected if not on NVIDIA GPU): {e}")

    logger.info("Export process complete. Optimized models are ready in backend/models/")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export YOLOv8 to optimized formats")
    parser.add_argument("--model", type=str, default="yolov8n-seg.pt", help="Base model name")
    parser.add_argument("--no-half", action="store_true", help="Disable FP16 (use FP32)")
    args = parser.parse_args()

    export_yolo_model(model_name=args.model, half=not args.no_half)
