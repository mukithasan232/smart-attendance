import os
import ssl
from pathlib import Path
from loguru import logger
import torch

# Bypass SSL certificate verification for model downloads (fixes CERTIFICATE_VERIFY_FAILED)
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

try:
    from ultralytics import YOLOWorld
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False
    logger.warning("ultralytics is not installed. YOLO-World inference will fail. Please run: pip install ultralytics")


class YOLOWorldEngine:
    """
    Open-Vocabulary (Zero-Shot) Inference Engine using YOLO-World.
    Detects literally any object via text prompts without custom training.
    """
    def __init__(self, model_version="yolov8s-world.pt", custom_classes=None):
        if not ULTRALYTICS_AVAILABLE:
            raise ImportError("Please install ultralytics to use YOLO-World.")
            
        self.models_dir = Path(__file__).resolve().parent.parent / "models"
        self.model_path = self.models_dir / model_version
        self.device = self._detect_device()
        self.custom_classes = custom_classes or [
            "person", "face", "chair", "table", "laptop", "mobile phone", 
            "water bottle", "window", "door", "car", "motorcycle", "tree", 
            "building", "backpack", "cup", "book"
        ]
        
        self.model = None
        self._initialize_model()

    def _detect_device(self):
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _initialize_model(self):
        try:
            logger.info(f"Loading YOLO-World model: {self.model_path.name} on {self.device}...")
            # If model isn't downloaded locally yet, ultralytics auto-downloads it
            model_target = str(self.model_path) if self.model_path.exists() else self.model_path.name
            
            self.model = YOLOWorld(model_target)
            self.model.to(self.device)
            
            # Set the dynamic zero-shot classes!
            self.set_classes(self.custom_classes)
            
            logger.info(f"YOLO-World engine successfully initialized with classes: {self.custom_classes}")
        except Exception as e:
            logger.error(f"Failed to load YOLO-World model: {e}")
            raise e

    def set_classes(self, class_list: list[str]):
        """Dynamically update the objects the model is looking for."""
        if not self.model:
            return
        logger.info(f"Setting YOLO-World target classes to: {class_list}")
        self.model.set_classes(class_list)
        self.custom_classes = class_list

    def predict(self, frame, conf_threshold=0.1, iou_threshold=0.4):
        """
        Run zero-shot inference on a single frame.
        We lower the default confidence threshold for zero-shot text matching.
        """
        if self.model is None:
            return None
            
        # verbose=False prevents console spam per frame
        # multi-scale inference can be enabled via augment=True (slightly slower but highly accurate)
        results = self.model.predict(
            frame, 
            conf=conf_threshold, 
            iou=iou_threshold, 
            verbose=False,
            # augment=True  # Uncomment for multi-scale inference if FPS drops are acceptable
        )
        return results[0] if len(results) > 0 else None
