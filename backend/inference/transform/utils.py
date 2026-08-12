import numpy as np
import cv2
from loguru import logger

def compute_iou(box, boxes):
    xmin = np.maximum(box[0], boxes[:, 0])
    ymin = np.maximum(box[1], boxes[:, 1])
    xmax = np.minimum(box[2], boxes[:, 2])
    ymax = np.minimum(box[3], boxes[:, 3])
    intersection_area = np.maximum(0, xmax - xmin) * np.maximum(0, ymax - ymin)
    box_area = (box[2] - box[0]) * (box[3] - box[1])
    boxes_area = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    union_area = box_area + boxes_area - intersection_area
    return intersection_area / union_area

def draw_ultralytics_results(image, result, recognized_names=None, colors_override=None, mask_alpha=0.4):
    """
    Optimized drawing function that directly ingests ultralytics Results object.
    Replaces slow python looping for masks with fast vectorized OpenCV operations.
    """
    if result is None or len(result.boxes) == 0:
        return image
        
    img = image.copy()
    boxes = result.boxes.xyxy.cpu().numpy()
    scores = result.boxes.conf.cpu().numpy()
    class_ids = result.boxes.cls.cpu().numpy()
    
    # Random reproducible colors
    np.random.seed(42)
    colors = np.random.randint(0, 255, size=(100, 3), dtype="uint8")

    # Fast vectorized mask drawing
    if result.masks is not None:
        # masks.data is (N, H, W)
        # ultralytics masks might be scaled differently, usually need interpolation
        # But result.masks.xy contains the polygons which are extremely fast to fill!
        overlay = img.copy()
        
        for i, contour in enumerate(result.masks.xy):
            if colors_override and i < len(colors_override) and colors_override[i] is not None:
                color = colors_override[i]
            else:
                color = [int(c) for c in colors[int(class_ids[i]) % len(colors)]]
                
            pts = np.array(contour, dtype=np.int32)
            cv2.fillPoly(overlay, [pts], color)
            
        cv2.addWeighted(overlay, mask_alpha, img, 1 - mask_alpha, 0, img)

    # Fast bounding boxes
    for i in range(len(boxes)):
        if colors_override and i < len(colors_override) and colors_override[i] is not None:
            color = colors_override[i]
        else:
            color = [int(c) for c in colors[int(class_ids[i]) % len(colors)]]
            
        x1, y1, x2, y2 = [int(v) for v in boxes[i]]
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        
        # Label handling
        if recognized_names and i < len(recognized_names) and recognized_names[i] is not None:
            name = recognized_names[i]
            label = f"{name} {int(scores[i]*100)}%"
        else:
            cid = int(class_ids[i])
            class_name = result.names[cid] if result.names else f"class_{cid}"
            label = f"{class_name} {int(scores[i] * 100)}%"
            
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        label_ymin = max(y1, th + 10)
        cv2.rectangle(img, (x1, label_ymin - th - 10), (x1 + tw, label_ymin), color, -1)
        cv2.putText(img, label, (x1, label_ymin - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    return img
