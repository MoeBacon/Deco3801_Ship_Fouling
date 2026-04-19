import numpy as np

def run_ml_on_frame(frame: np.ndarray) -> list[dict]:
    # ML needs to replace the body of this function with the real model call
    # Input: a single enhanced frame as a NumPy array (H, W, 3) in RGB format
    # Output: list of detections, each with class_label and confidence
    # Note that the image has already been converted to RGB format from BGR at this stage so its ready for YOLOv11 ML
    return [
        {"class_label": "barnacle", "confidence": 0.91},
        {"class_label": "bad", "confidence": 0.76}
    ]