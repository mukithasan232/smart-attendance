import numpy as np
import cv2

def xywh2xyxy(x):
    """
    Convert bounding box coordinates from [x, y, w, h] to [x1, y1, x2, y2]
    where x, y is the center of the box.
    """
    y = np.copy(x)
    y[:, 0] = x[:, 0] - x[:, 2] / 2  # top left x
    y[:, 1] = x[:, 1] - x[:, 3] / 2  # top left y
    y[:, 2] = x[:, 0] + x[:, 2] / 2  # bottom right x
    y[:, 3] = x[:, 1] + x[:, 3] / 2  # bottom right y
    return y

def compute_iou(box, boxes):
    # Compute xmin, ymin, xmax, ymax for both boxes
    xmin = np.maximum(box[0], boxes[:, 0])
    ymin = np.maximum(box[1], boxes[:, 1])
    xmax = np.minimum(box[2], boxes[:, 2])
    ymax = np.minimum(box[3], boxes[:, 3])

    # Compute intersection area
    intersection_area = np.maximum(0, xmax - xmin) * np.maximum(0, ymax - ymin)

    # Compute union area
    box_area = (box[2] - box[0]) * (box[3] - box[1])
    boxes_area = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    union_area = box_area + boxes_area - intersection_area

    # Compute IoU
    iou = intersection_area / union_area
    return iou

def nms(boxes, scores, iou_threshold):
    """
    Non-Maximum Suppression
    """
    # Sort by score
    sorted_indices = np.argsort(scores)[::-1]

    keep_boxes = []
    while sorted_indices.size > 0:
        # Pick the box with highest score
        box_id = sorted_indices[0]
        keep_boxes.append(box_id)

        # Compute IoU of the picked box with the rest
        ious = compute_iou(boxes[box_id, :], boxes[sorted_indices[1:], :])

        # Remove boxes with IoU > threshold
        keep_indices = np.where(ious < iou_threshold)[0]
        
        # Keep only the boxes with IoU < threshold
        sorted_indices = sorted_indices[keep_indices + 1]

    return keep_boxes

def sigmoid(x):
    """
    Compute sigmoid function
    """
    return 1 / (1 + np.exp(-x))

def draw_detections(image, boxes, scores, class_ids, mask_alpha=0.3, mask_maps=None, labels_override=None, colors_override=None):
    """
    Draw bounding boxes and masks on the image
    """
    img = image.copy()
    # Full 80 COCO Classes
    COCO_CLASSES = [
        'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
        'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
        'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
        'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
        'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
        'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
        'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
        'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
        'hair drier', 'toothbrush'
    ]

    # Create a reproducible color map
    np.random.seed(42)
    colors = np.random.randint(0, 255, size=(100, 3), dtype="uint8")

    # Draw masks
    if mask_maps is not None and len(mask_maps) > 0:
        for i in range(len(boxes)):
            color = colors[int(class_ids[i]) % len(colors)]
            mask = mask_maps[i]
            
            # Mask is binary (H, W)
            color_mask = np.zeros_like(img, dtype=np.uint8)
            color_mask[mask > 0] = color
            
            # Blend the original image and the mask
            img_with_mask = cv2.addWeighted(img, 1.0, color_mask, mask_alpha, 0)
            img[mask > 0] = img_with_mask[mask > 0]

    # Draw bounding boxes
    for i in range(len(boxes)):
        box = boxes[i]
        
        if colors_override and i < len(colors_override) and colors_override[i] is not None:
            color = colors_override[i]
        else:
            color = [int(c) for c in colors[int(class_ids[i]) % len(colors)]]
        
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        
        # Draw labels
        if labels_override and i < len(labels_override) and labels_override[i] is not None:
            label = f"{labels_override[i]} {int(scores[i]*100)}%"
        else:
            cid = int(class_ids[i])
            if cid >= 0 and cid < len(COCO_CLASSES):
                class_name = COCO_CLASSES[cid]
            else:
                class_name = f"class_{cid}"
            label = f"{class_name} {int(scores[i] * 100)}%"
            
        (label_width, label_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        
        label_ymin = max(y1, label_height + 10)
        cv2.rectangle(img, (x1, label_ymin - label_height - 10), (x1 + label_width, label_ymin), color, -1)
        cv2.putText(img, label, (x1, label_ymin - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    return img
