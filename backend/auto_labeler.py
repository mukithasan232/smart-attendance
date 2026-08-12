import os
import cv2
from pathlib import Path
from loguru import logger
import argparse
from tqdm import tqdm

try:
    from backend.inference.yolo_world import YOLOWorldEngine
    import albumentations as A
except ImportError:
    logger.error("Please install ultralytics and albumentations: pip install ultralytics albumentations")

def augment_and_save(image, bboxes, class_ids, output_dir, base_name, img_width, img_height, augmentor=None):
    """
    Applies albumentations augmentations (if provided) and saves the image + YOLO .txt label.
    """
    if augmentor:
        try:
            # Albumentations expects [x_center, y_center, width, height] normalized
            # But the augmentor requires the bboxes to be passed in
            augmented = augmentor(image=image, bboxes=bboxes, class_labels=class_ids)
            aug_img = augmented['image']
            aug_bboxes = augmented['bboxes']
            aug_classes = augmented['class_labels']
            
            suffix = "_aug"
        except Exception as e:
            logger.error(f"Augmentation failed for {base_name}: {e}")
            return
    else:
        aug_img = image
        aug_bboxes = bboxes
        aug_classes = class_ids
        suffix = ""

    # Save image
    img_filename = f"{base_name}{suffix}.jpg"
    cv2.imwrite(str(output_dir / "images" / img_filename), aug_img)

    # Save label (.txt)
    txt_filename = f"{base_name}{suffix}.txt"
    with open(output_dir / "labels" / txt_filename, "w") as f:
        for bbox, cls_id in zip(aug_bboxes, aug_classes):
            # Ensure YOLO format constraints (0.0 to 1.0)
            x_c, y_c, w, h = bbox
            x_c = max(0.0, min(1.0, x_c))
            y_c = max(0.0, min(1.0, y_c))
            w = max(0.0, min(1.0, w))
            h = max(0.0, min(1.0, h))
            
            f.write(f"{int(cls_id)} {x_c:.6f} {y_c:.6f} {w:.6f} {h:.6f}\n")


def auto_annotate_dataset(input_dir: str, output_dir: str, classes: list[str], augment: bool = True):
    """
    Uses YOLO-World to automatically annotate a folder of images for the given custom classes.
    """
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    # Create YOLO dataset structure
    (output_path / "images").mkdir(parents=True, exist_ok=True)
    (output_path / "labels").mkdir(parents=True, exist_ok=True)
    
    logger.info("Initializing YOLO-World for Auto-Annotation...")
    engine = YOLOWorldEngine(custom_classes=classes)
    
    # Data Augmentation pipeline (Mosaic is done during training, we do color/scale/rotation here)
    if augment:
        transform = A.Compose([
            A.HorizontalFlip(p=0.5),
            A.RandomBrightnessContrast(p=0.2),
            A.ShiftScaleRotate(shift_limit=0.05, scale_limit=0.1, rotate_limit=15, p=0.5),
            A.HueSaturationValue(p=0.3)
        ], bbox_params=A.BboxParams(format='yolo', label_fields=['class_labels'], min_visibility=0.3))
    else:
        transform = None

    image_files = list(input_path.glob("*.[pj][np][g]")) # match png, jpg, jpeg
    logger.info(f"Found {len(image_files)} images. Starting annotation...")
    
    for img_path in tqdm(image_files):
        img = cv2.imread(str(img_path))
        if img is None:
            continue
            
        img_h, img_w = img.shape[:2]
        
        # Get Zero-Shot predictions
        result = engine.predict(img, conf_threshold=0.05, iou_threshold=0.3)
        
        yolo_bboxes = []
        class_ids = []
        
        if result and len(result.boxes) > 0:
            # Convert xyxy to normalized xywh
            boxes = result.boxes.xywhn.cpu().numpy() # [x_center, y_center, width, height] normalized
            cls_idx = result.boxes.cls.cpu().numpy()
            
            for box, c in zip(boxes, cls_idx):
                yolo_bboxes.append(box.tolist())
                class_ids.append(int(c))
                
        # Save base image + labels
        base_name = img_path.stem
        augment_and_save(img, yolo_bboxes, class_ids, output_path, base_name, img_w, img_h, augmentor=None)
        
        # Save augmented version
        if augment and len(yolo_bboxes) > 0:
            augment_and_save(img, yolo_bboxes, class_ids, output_path, base_name, img_w, img_h, augmentor=transform)
            
    # Generate data.yaml for training
    yaml_content = f"path: {output_path.resolve()}\n"
    yaml_content += "train: images\n"
    yaml_content += "val: images\n\n"
    yaml_content += f"nc: {len(classes)}\n"
    yaml_content += f"names: {classes}\n"
    
    with open(output_path / "data.yaml", "w") as f:
        f.write(yaml_content)
        
    logger.info(f"Auto-annotation complete! Dataset ready at {output_path}/data.yaml")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Auto-Label Dataset using YOLO-World")
    parser.add_argument("--input", type=str, required=True, help="Directory containing raw images")
    parser.add_argument("--output", type=str, default="custom_dataset", help="Output directory for YOLO dataset")
    parser.add_argument("--classes", nargs='+', required=True, help="List of classes to detect (e.g. 'bamboo tree' 'clouds')")
    parser.add_argument("--no-aug", action="store_true", help="Disable data augmentation")
    
    args = parser.parse_args()
    auto_annotate_dataset(args.input, args.output, args.classes, augment=not args.no_aug)
