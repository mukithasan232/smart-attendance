import math
import time
import onnxruntime as ort
import sys
import cv2
import os
import numpy as np
from pathlib import Path

# Dynamic base directory mapping to current project structure
base_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(base_dir))

# Fallback or local utils import handling
try:
    from backend.inference.transform.utils import xywh2xyxy, nms, draw_detections, sigmoid
except ImportError:
    # Fallback if utils are in the same folder or structured differently
    from .transform.utils import xywh2xyxy, nms, draw_detections, sigmoid

class YOLOv8Segmentation_onnx:
    def __init__(self, path, conf_thres = 0.3, ios_thres = 0.5, num_mask = 32):
        self.path = path
        self.conf_thres = conf_thres 
        self.ios_thres = ios_thres
        self.num_mask = num_mask
        
        # Dynamic providers setup for cross-platform (Mac & Linux/GPU)
        available_providers = ort.get_available_providers()
        import platform
        providers = []
        if platform.system() == "Darwin" and 'CoreMLExecutionProvider' in available_providers:
            providers.append('CoreMLExecutionProvider')
        if 'CUDAExecutionProvider' in available_providers:
            providers.append('CUDAExecutionProvider')
        providers.append('CPUExecutionProvider')
        
        self.session = ort.InferenceSession(path, providers=providers)
        self.get_input_details()
        self.get_output_details()
    
    def __call__(self, image):
        return self.segment_objects(image)

    def segment_objects(self, image):
        input_tensor = self.prepare_input(image)
        outputs = self.inference(input_tensor)
        boxes, scores, class_ids, mask_pred = self.process_box_output(outputs[0])
        mask_maps = self.process_mask_output(mask_pred, outputs[1], boxes)
        return boxes, scores, class_ids, mask_maps
    
    def inference(self, input_tensor):
        start = time.time()
        outputs = self.session.run(self.output_names, {self.input_names[0]: input_tensor})
        end = time.time()
        # print(f"Inference time elaps: {end - start} in seconds")
        return outputs

    def get_input_details(self):
        model_inputs = self.session.get_inputs()
        self.input_names = [model_inputs[i].name for i in range(len(model_inputs))]
        self.input_shape = model_inputs[0].shape
        self.input_width = self.input_shape[2]
        self.input_height = self.input_shape[3]

    def get_output_details(self):
        model_outputs = self.session.get_outputs()
        self.output_names = [model_outputs[i].name for i in range(len(model_outputs))]

    def prepare_input(self, image):
        self.img_height, self.img_width = image.shape[:2]
        input_img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        input_img = cv2.resize(input_img, (self.input_width, self.input_height))
        input_img = input_img / 255.0
        input_img = input_img.transpose(2, 0, 1)
        input_tensor = input_img[np.newaxis, :, :, :].astype(np.float32)
        return input_tensor

    def process_box_output(self, box_output):
        predictions = np.squeeze(box_output).T
        num_classes = box_output.shape[1] - self.num_mask - 4
        scores = np.max(predictions[:, 4: 4+num_classes], axis=1)
        predictions = predictions[scores > self.conf_thres, :]
        scores = scores[scores > self.conf_thres]

        if len(scores) == 0:
            return [], [], [], np.array([])
        box_predictions = predictions[..., :num_classes + 4]
        mask_predictions = predictions[..., num_classes + 4:]

        class_ids = np.argmax(box_predictions[:, 4:], axis=1)
        boxes = self.extract_boxes(box_predictions)
        
        # Valid box filter (width > 20 and height > 20)
        widths = boxes[:, 2] - boxes[:, 0]
        heights = boxes[:, 3] - boxes[:, 1]
        valid_mask = (widths >= 20) & (heights >= 20)
        
        boxes = boxes[valid_mask]
        scores = scores[valid_mask]
        class_ids = class_ids[valid_mask]
        mask_predictions = mask_predictions[valid_mask]
        
        if len(scores) == 0:
            return [], [], [], np.array([])
            
        indices = nms(boxes, scores, self.ios_thres)
        return boxes[indices], scores[indices], class_ids[indices], mask_predictions[indices]
    
    def process_mask_output(self, mask_predictions, mask_output, boxes):
        if mask_predictions.shape[0] == 0:
            return []
        mask_output = np.squeeze(mask_output)

        num_mask, mask_height, mask_width = mask_output.shape
        masks = sigmoid(mask_predictions @ mask_output.reshape(num_mask, -1))
        masks = masks.reshape((-1, mask_height, mask_width))
        scale_boxes = self.rescale_boxes(boxes,
                                       (self.img_height, self.img_width),
                                       (mask_height, mask_width))
        mask_maps = np.zeros((len(scale_boxes), self.img_height, self.img_width))
        blur_size = (int(self.img_width / mask_width), int(self.img_height / mask_height))
        for i in range(len(scale_boxes)):
            scale_x1 = int(math.floor(scale_boxes[i][0]))
            scale_y1 = int(math.floor(scale_boxes[i][1]))
            scale_x2 = int(math.ceil(scale_boxes[i][2]))
            scale_y2 = int(math.ceil(scale_boxes[i][3]))

            x1 = int(math.floor(boxes[i][0]))
            y1 = int(math.floor(boxes[i][1]))
            x2 = int(math.ceil(boxes[i][2]))
            y2 = int(math.ceil(boxes[i][3]))

            scale_crop_mask = masks[i][scale_y1:scale_y2, scale_x1:scale_x2]
            if scale_crop_mask.size == 0 or (x2-x1) <= 0 or (y2-y1) <= 0:
                continue
            crop_mask = cv2.resize(scale_crop_mask,
                                   (x2-x1, y2-y1),
                                   interpolation=cv2.INTER_CUBIC)
            crop_mask = cv2.blur(crop_mask, blur_size)
            crop_mask = (crop_mask > 0.5).astype(np.uint8)
            mask_maps[i, y1:y2, x1:x2] = crop_mask
        return mask_maps
    
    def extract_boxes(self, box_predictions):
        boxes = box_predictions[:, :4]
        boxes = self.rescale_boxes(boxes,
                                   (self.input_height, self.input_width),
                                   (self.img_height, self.img_width))
        
        # YOLOv8 standard ONNX outputs [cx, cy, w, h] so we must convert it
        boxes = xywh2xyxy(boxes)
        
        boxes[:, 0] = np.clip(boxes[:, 0], 0, self.img_width)
        boxes[:, 1] = np.clip(boxes[:, 1], 0, self.img_height)
        boxes[:, 2] = np.clip(boxes[:, 2], 0, self.img_width)
        boxes[:, 3] = np.clip(boxes[:, 3], 0, self.img_height)
        return boxes
    
    @staticmethod
    def rescale_boxes(boxes, input_shape, image_shape):
        scale_x = image_shape[1] / input_shape[1]
        scale_y = image_shape[0] / input_shape[0]
        rescaled_boxes = boxes.copy()
        rescaled_boxes[:, 0] = boxes[:, 0] * scale_x
        rescaled_boxes[:, 1] = boxes[:, 1] * scale_y
        rescaled_boxes[:, 2] = boxes[:, 2] * scale_x
        rescaled_boxes[:, 3] = boxes[:, 3] * scale_y
        return rescaled_boxes
    
    def draw_detections(self, image, boxes, scores, class_ids, draw_scores=True, mask_alpha=0.4, recognized_names=None, colors_override=None):
        return draw_detections(image, boxes, scores, class_ids, mask_alpha, recognized_names=recognized_names, colors_override=colors_override)

    def draw_masks(self, image, boxes, scores, class_ids, mask_maps, draw_scores=True, mask_alpha=0.5, recognized_names=None, colors_override=None):
        if mask_maps is None or len(mask_maps) == 0:
            return image
        return draw_detections(image, boxes, scores, class_ids, mask_alpha, mask_maps=mask_maps, recognized_names=recognized_names, colors_override=colors_override)