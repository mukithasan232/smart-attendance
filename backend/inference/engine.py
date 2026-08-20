import os
from pathlib import Path
from loguru import logger

try:
    from ultralytics import YOLO
    import torch
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False
    logger.warning("ultralytics is not installed. YOLO inference will fail.")

class YOLOEngine:
    """
    Hardware-agnostic, auto-detecting YOLOv8 Inference Engine.
    Dynamically loads the most optimal format (TensorRT, CoreML, ONNX, or PyTorch)
    based on the available hardware to guarantee maximum FPS.
    """
    def __init__(self, base_model_name="yolov8n-seg"):
        if not ULTRALYTICS_AVAILABLE:
            raise ImportError("Please install ultralytics (pip install ultralytics) for high-performance inference.")
            
        self.base_model_name = base_model_name
        self.models_dir = Path(__file__).resolve().parent.parent / "models"
        self.model = None
        self.device = "cpu"
        
        self._initialize_model()

    def _initialize_model(self):
        """Auto-detect hardware and load the best model format."""
        
        # Determine best hardware
        if torch.cuda.is_available():
            self.device = "cuda"
            logger.info("Hardware Auto-Detect: NVIDIA GPU (CUDA) found.")
            target_ext = ".engine" # TensorRT
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            self.device = "mps"
            logger.info("Hardware Auto-Detect: Apple Silicon (MPS/Metal) found.")
            # ultralytics uses the directory name for CoreML models (.mlpackage)
            target_ext = "_coreml" if os.path.exists(str(self.models_dir / f"{self.base_model_name}_coreml")) else ".mlpackage"
        else:
            self.device = "cpu"
            logger.info("Hardware Auto-Detect: CPU only.")
            target_ext = ".onnx"

        # Check for optimized model file in models_dir
        # Note: CoreML exports are directories named model_coreml or model.mlpackage depending on versions
        optimized_path = None
        
        if target_ext == ".mlpackage":
            if (self.models_dir / f"{self.base_model_name}.mlpackage").exists():
                optimized_path = self.models_dir / f"{self.base_model_name}.mlpackage"
            elif (self.models_dir / f"{self.base_model_name}_coreml").exists():
                optimized_path = self.models_dir / f"{self.base_model_name}_coreml"
        else:
            if (self.models_dir / f"{self.base_model_name}{target_ext}").exists():
                optimized_path = self.models_dir / f"{self.base_model_name}{target_ext}"

        # Fallbacks
        if not optimized_path:
            logger.warning(f"Optimized model {self.base_model_name}{target_ext} not found.")
            if (self.models_dir / f"{self.base_model_name}.onnx").exists():
                optimized_path = self.models_dir / f"{self.base_model_name}.onnx"
                logger.info(f"Falling back to ONNX model: {optimized_path}")
            elif (self.models_dir / f"{self.base_model_name}.pt").exists():
                optimized_path = self.models_dir / f"{self.base_model_name}.pt"
                logger.info(f"Falling back to PyTorch model: {optimized_path}")
            else:
                optimized_path = self.base_model_name + ".pt" # Let ultralytics download it
                logger.info(f"Base model not found locally. Will download {optimized_path}")

        try:
            logger.info(f"Loading YOLO model from {optimized_path} onto {self.device}...")
            # Native ultralytics seamlessly supports all formats (pt, onnx, engine, coreml)
            self.model = YOLO(str(optimized_path))
            
            # Note: Exported models (engine, onnx, coreml) ignore the `.to()` device command 
            # as device is baked in or handled by the respective runtime (TensorRT/CoreML/ONNX). 
            # We only send to device if it's a PyTorch model.
            if str(optimized_path).endswith('.pt'):
                self.model.to(self.device)
                
            logger.info(f"YOLO engine successfully initialized!")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise e

    def predict(self, frame):
        """
        Run inference on a single frame.
        Returns the native Ultralytics Results object which is highly optimized.
        """
        if self.model is None:
            return None
            
        # verbose=False prevents console spam per frame
        # We also only target person class (0) for performance
        results = self.model.predict(frame, classes=[0], verbose=False)
        return results[0] if len(results) > 0 else None
