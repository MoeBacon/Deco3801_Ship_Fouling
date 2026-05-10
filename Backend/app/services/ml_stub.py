import os
import tempfile

import cv2
import numpy as np
from dotenv import load_dotenv

try:
    from inference_sdk import InferenceHTTPClient
except ImportError:
    InferenceHTTPClient = None  # type: ignore[misc,assignment]

load_dotenv()

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")
ROBOFLOW_MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID")

_inference_client = None


def _get_inference_client():
    global _inference_client
    if InferenceHTTPClient is None:
        return None
    if _inference_client is None:
        _inference_client = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key=ROBOFLOW_API_KEY,
        )
    return _inference_client


def _draw_boxes(bgr_frame: np.ndarray, detections: list[dict]) -> np.ndarray:
    """Draw bounding boxes and labels onto a BGR frame."""
    annotated = bgr_frame.copy()
    for det in detections:
        cx, cy = int(det["x"]), int(det["y"])
        w, h = int(det["width"]), int(det["height"])
        x1, y1 = cx - w // 2, cy - h // 2
        x2, y2 = cx + w // 2, cy + h // 2
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label = f"{det['class_label']} {det['confidence']:.2f}"
        cv2.putText(annotated, label, (x1, max(y1 - 10, 0)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    return annotated


def run_ml_on_frame(frame: np.ndarray) -> dict:
    """
    Send an enhanced RGB frame to Roboflow.

    Returns a dict:
        detections     – list of {class_label, confidence, x, y, width, height}
        annotated_image – BGR numpy array with boxes drawn (or None on failure)
    """
    temp_path = None

    try:
        bgr_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
            cv2.imwrite(temp.name, bgr_frame)
            temp_path = temp.name

        client = _get_inference_client()
        if client is None or not ROBOFLOW_MODEL_ID:
            return {"detections": [], "annotated_image": None}

        result = client.infer(temp_path, model_id=ROBOFLOW_MODEL_ID)

        detections = []
        for prediction in result.get("predictions", []):
            detections.append(
                {
                    "class_label": prediction.get("class", "unknown"),
                    "confidence": prediction.get("confidence", 0.0),
                    "x": prediction.get("x", 0.0),
                    "y": prediction.get("y", 0.0),
                    "width": prediction.get("width", 0.0),
                    "height": prediction.get("height", 0.0),
                }
            )

        annotated_image = _draw_boxes(bgr_frame, detections)

        return {"detections": detections, "annotated_image": annotated_image}

    except Exception as e:
        print(f"ML inference error: {e}")
        return {"detections": [], "annotated_image": None}

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
