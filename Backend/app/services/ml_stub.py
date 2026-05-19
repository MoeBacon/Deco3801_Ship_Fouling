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


_CLASS_COLOURS: dict[str, tuple[int, int, int]] = {
    "Algae":      (0, 255, 0),      # green   (BGR)
    "Barnacle":   (255, 255, 255),  # white   (BGR)
    "Rust":       (0, 255, 255),    # yellow  (BGR)
    "shell build":(255, 0, 255),    # magenta (BGR)
}
_DEFAULT_COLOUR = (255, 255, 0)  # cyan for unrecognised classes (BGR)

_DISPLAY_NAMES: dict[str, str] = {
    "algae":       "Algae",
    "Barnacle":    "Barnacle",
    "shell build": "Shell Build-up",
    "rust":        "Rust",
}


def _get_colour(class_label: str) -> tuple[int, int, int]:
    label = class_label.lower()
    for key, colour in _CLASS_COLOURS.items():
        if key.lower() in label:
            return colour
    return _DEFAULT_COLOUR


def _get_display_name(class_label: str) -> str:
    label = class_label.lower()
    for key, display in _DISPLAY_NAMES.items():
        if key in label:
            return display
    return class_label


def _draw_boxes(bgr_frame: np.ndarray, detections: list[dict]) -> np.ndarray:
    annotated = bgr_frame.copy()
    for det in detections:
        cx, cy = int(det["x"]), int(det["y"])
        w, h = int(det["width"]), int(det["height"])
        x1, y1 = cx - w // 2, cy - h // 2
        x2, y2 = cx + w // 2, cy + h // 2
        colour = _get_colour(det["class_label"])
        cv2.rectangle(annotated, (x1, y1), (x2, y2), colour, 3)
        display_name = _get_display_name(det["class_label"])
        label = f"{display_name} {det['confidence']:.2f}"
        cv2.putText(annotated, label, (x1 + 5, y1 + 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, colour, 2)
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
        if client is None:
            print("[ML DIAG] inference_sdk not installed — ML disabled")
            return {"detections": [], "annotated_image": None}
        if not ROBOFLOW_MODEL_ID:
            print("[ML DIAG] ROBOFLOW_MODEL_ID not set in .env — ML disabled")
            return {"detections": [], "annotated_image": None}
        if not ROBOFLOW_API_KEY:
            print("[ML DIAG] ROBOFLOW_API_KEY not set in .env — ML disabled")
            return {"detections": [], "annotated_image": None}

        print(f"[ML DIAG] Calling Roboflow — model: {ROBOFLOW_MODEL_ID}, temp file: {temp_path}")
        result = client.infer(temp_path, model_id=ROBOFLOW_MODEL_ID)
        print(f"[ML DIAG] Raw Roboflow response: {result}")

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

        print(f"[ML DIAG] Parsed {len(detections)} detection(s): {detections}")
        annotated_image = _draw_boxes(bgr_frame, detections)

        return {"detections": detections, "annotated_image": annotated_image}

    except Exception as e:
        print(f"[ML DIAG] Roboflow call failed with error: {type(e).__name__}: {e}")
        return {"detections": [], "annotated_image": None}

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
