import os
import tempfile
import cv2
import numpy as np
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

load_dotenv()

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")
ROBOFLOW_MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID")

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=ROBOFLOW_API_KEY
)

# Sends an enhanced frame to the Roboflow model and returns detections 
def run_ml_on_frame(frame: np.ndarray) -> list[dict]:
    temp_path = None

    try:
        # Converts RGB back to BGR for cv2.imwrite
        BGR_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        # Saves the converted frame as a temp file to send to Roboflow
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
            cv2.imwrite(temp.name, BGR_frame)
            temp_path = temp.name

        # Actual ML call to roboflow
        result = client.infer(temp_path, model_id=ROBOFLOW_MODEL_ID)

        # Parse Roboflow result into our return format, potentially add more to this depending on what ML wants us to take
        # from the results / what they say we should be taking?
        # also ive got defaults as empty list, "unknown" and 0.0 but can change if we need
        detections = []
        for prediction in result.get("predictions", []):
            detections.append({
                "class_label": prediction.get("class", "unknown"),
                "confidence": prediction.get("confidence", 0.0)
            })

        return detections
    
    except Exception as e:
            print(f"ML inference error: {e}")
            return []
    
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)