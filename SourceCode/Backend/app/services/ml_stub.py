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


def run_ml_on_frame(frame: np.ndarray) -> list[dict]:
    """Send an enhanced frame to Roboflow and return simplified detections."""
    temp_path = None

    try:
        # Convert RGB back to BGR for cv2.imwrite.
        bgr_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
            cv2.imwrite(temp.name, bgr_frame)
            temp_path = temp.name

        client = _get_inference_client()
        if client is None or not ROBOFLOW_MODEL_ID:
            return []

        result = client.infer(temp_path, model_id=ROBOFLOW_MODEL_ID)

        detections = []
        for prediction in result.get("predictions", []):
            detections.append(
                {
                    "class_label": prediction.get("class", "unknown"),
                    "confidence": prediction.get("confidence", 0.0),
                }
            )

        return detections

    except Exception as e:
        print(f"ML inference error: {e}")
        return []

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
