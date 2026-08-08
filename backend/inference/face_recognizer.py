import os
import numpy as np
from loguru import logger
import insightface
from insightface.app import FaceAnalysis

class InsightFaceRecognizer:
    def __init__(self, models_dir: str):
        """
        Initializes the InsightFace model using the buffalo_l pack.
        models_dir should point to the directory containing the 'models' folder.
        """
        self.app = FaceAnalysis(name='buffalo_l', root=models_dir, providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
        
        # Prepare the model with typical detection parameters
        try:
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace (buffalo_l) initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize InsightFace: {e}")
            raise

    def extract_embedding(self, image_crop: np.ndarray) -> np.ndarray | None:
        """
        Takes an OpenCV BGR image crop (e.g. a person bounding box crop).
        Detects the face within it, aligns it, and returns the 512D embedding.
        If no face is found, returns None.
        """
        # Ensure the crop is valid
        if image_crop is None or image_crop.size == 0:
            return None

        # Detect face and extract features
        faces = self.app.get(image_crop)
        
        if not faces:
            return None
            
        # If multiple faces are detected in the person crop, pick the one with highest detection score
        best_face = max(faces, key=lambda f: f.det_score)
        
        # The embedding is a 512D numpy array
        return best_face.normed_embedding

    @staticmethod
    def match_face(query_embedding: np.ndarray, cached_persons: list[dict], threshold: float = 0.5):
        """
        Compares the query embedding against a list of cached registered persons using Cosine Similarity.
        Returns the matched person dictionary, or None if no match meets the threshold.
        """
        best_match = None
        best_score = -1.0
        
        for person in cached_persons:
            db_emb = person.get("face_embedding")
            if db_emb is None:
                continue
                
            # Compute cosine similarity
            similarity = np.dot(query_embedding, db_emb)
            
            if similarity > best_score:
                best_score = similarity
                best_match = person
                
        if best_score >= threshold:
            return best_match, best_score
            
        return None, best_score
