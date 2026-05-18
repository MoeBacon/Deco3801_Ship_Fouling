import os
import uuid

import cv2

from app.services.ml_stub import run_ml_on_frame
from app.services.preprocessing import (
    enhance_frame,
    has_enough_detail,
    is_blurry,
    is_duplicate,
)

# Extract every Nth frame to avoid processing too many frames from long videos.
FRAME_SAMPLE_RATE = 12

# Quality filter thresholds — tune these to control how strict filtering is.
BLUR_THRESHOLD = 25.0    # raise to reject more blurry frames
DETAIL_THRESHOLD = 0.05  # raise to reject more low-texture frames
SSIM_THRESHOLD = 0.70    # raise to catch more near-duplicate frames


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
    previous_kept_frame = None  # used for duplicate detection

    while True:
        status, frame = cap.read()

        if not status:
            break

        # START OF INEFFICIENT FRAME STORAGE **** FIX THIS LATER ****
        if frame_index % FRAME_SAMPLE_RATE == 0:

            # ---------------------------------------------------------
            # QUALITY FILTERING (on raw BGR frame, before enhancement)
            # ---------------------------------------------------------

            USE_QUALITY_CHECKS = False  # set to True to enable all checks, False to accept all frames
            if USE_QUALITY_CHECKS:
                blurry, blur_score = is_blurry(frame, threshold=BLUR_THRESHOLD)
                if blurry:
                    print(f"[REJECTED - BLURRY] Frame {frame_index} (variance={blur_score:.2f})")
                    frame_index += 1
                    continue

                enough_detail, detail_score = has_enough_detail(frame, threshold=DETAIL_THRESHOLD)
                if not enough_detail:
                    print(f"[REJECTED - LOW DETAIL] Frame {frame_index} (std={detail_score:.4f})")
                    frame_index += 1
                    continue

                if previous_kept_frame is not None:
                    duplicate, ssim_score = is_duplicate(frame, previous_kept_frame, threshold=SSIM_THRESHOLD)
                    if duplicate:
                        print(f"[REJECTED - DUPLICATE] Frame {frame_index} (SSIM={ssim_score:.4f})")
                        frame_index += 1
                        continue

            # ---------------------------------------------------------
            # FRAME ACCEPTED — enhance, save, run ML
            # ---------------------------------------------------------

            previous_kept_frame = frame.copy()

            # BGR -> RGB (as expected by enhancement pipeline and ML model).
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            enhanced = enhance_frame(frame_rgb) # In-memory numpy array

            frame_filename = f"frame_{saved_count:04d}.jpg"
            file_path = os.path.join(output_dir, frame_filename)
            cv2.imwrite(file_path, cv2.cvtColor(enhanced, cv2.COLOR_RGB2BGR)) # Writes to disk early!!!

            ml_detections = []
            annotated_image_array = None
            try:
                result = run_ml_on_frame(enhanced) # Runs ML on in-memory array
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
                cv2.imwrite(annotated_file_path, annotated_image_array) # Writes annotated image to disk

            if videos_frames_per_second > 0:
                frame_timestamp = frame_index / videos_frames_per_second
            else:
                frame_timestamp = 0

            if USE_QUALITY_CHECKS:
                print(
                    f"[ACCEPTED] Frame {frame_index} | "
                    f"Blur={blur_score:.2f} | Detail={detail_score:.4f}"
                )
            else:
                print(f"[ACCEPTED] Frame {frame_index} | quality checks disabled")

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
