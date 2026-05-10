import os
import uuid

import cv2

from app.services.ml_stub import run_ml_on_frame
from app.services.preprocessing import enhance_frame

# Extract every Nth frame to avoid processing too many frames from long videos.
FRAME_SAMPLE_RATE = 30


def extract_frames(video_path: str, video_id: str) -> dict:
    output_dir = os.path.join("frames", video_id)
    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise RuntimeError(f"ERROR: Could not open the video file {video_path}")

    videos_total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    videos_frames_per_second = cap.get(cv2.CAP_PROP_FPS)

    if videos_frames_per_second > 0:
        duration = videos_total_frames / videos_frames_per_second
    else:
        duration = 0

    frame_results = []
    frame_index = 0
    saved_count = 0

    while True:
        status, frame = cap.read()

        if not status:
            break

        if frame_index % FRAME_SAMPLE_RATE == 0:
            # BGR -> RGB (as expected by ML model).
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            enhanced = enhance_frame(frame_rgb)

            frame_filename = f"frame_{saved_count:04d}.jpg"
            file_path = os.path.join(output_dir, frame_filename)
            cv2.imwrite(file_path, cv2.cvtColor(enhanced, cv2.COLOR_RGB2BGR))

            ml_detections = []
            annotated_image_array = None
            try:
                result = run_ml_on_frame(enhanced)
                ml_detections = result.get("detections", [])
                annotated_image_array = result.get("annotated_image")
            except Exception as e:
                print(f"ML inference failed on frame {saved_count}: {e}")
                # Continue processing other frames without detections

            # here im attempting to save the annotated image that came from ML
            annotated_file_path = None
            if annotated_image_array is not None:
                annotated_filename = f"frame_{saved_count:04d}_annotated.jpg"
                annotated_file_path = os.path.join(output_dir, annotated_filename)
                cv2.imwrite(annotated_file_path, annotated_image_array)

            if videos_frames_per_second > 0:
                frame_timestamp = frame_index / videos_frames_per_second
            else:
                frame_timestamp = 0

            frame_results.append(
                {
                    "frame_id": str(uuid.uuid4()),
                    "frame_number": saved_count,
                    "timestamp_in_video": frame_timestamp,
                    "file_path": file_path,
                    "annotated_file_path": annotated_file_path,
                    "enhancement_applied": "Gray-world White Balance and CLAHE",
                    "detections": ml_detections,
                }
            )

            saved_count += 1

        frame_index += 1

    cap.release()

    return {
        "duration": duration,
        "frame_count": saved_count,
        "total_video_frames": videos_total_frames,
        "fps": videos_frames_per_second,
        "frames": frame_results,
    }
