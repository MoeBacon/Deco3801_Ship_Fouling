import cv2
import os
import uuid
from app.services.preprocessing import enhance_frame
from app.services.ml_stub import run_ml_on_frame

# Extract every Nth frame to avoid processing lots of frames
# from long videos. Can be adjusted later if needed
FRAME_SAMPLE_RATE = 30

def extract_frames(video_path: str, video_id: str) -> dict:
    """
    This function opens a video file, extracts every Nth frame, applies enhancement(s),
    runs the ML stub (but later the actual ML model), and saves JPEGs to disk.

    Returns a dictionary with video metadata and the associated list of frame results
    """
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

            # BGR -->  RGB (as is expected by ML model)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            enhanced = enhance_frame(frame_rgb)

            # Save enhanced frame as JPEG to disk
            frame_filename = f"frame_{saved_count:04d}.jpg"
            file_path = os.path.join(output_dir, frame_filename)
            cv2.imwrite(file_path, cv2.cvtColor(enhanced, cv2.COLOR_RGB2BGR))

            # Run ML on enhanced frame
            ml_detections = run_ml_on_frame(enhanced)

            if videos_frames_per_second > 0:
                frame_timestamp = frame_index / videos_frames_per_second
            else: 
                frame_timestamp = 0

            frame_results.append({
                "frame_id": str(uuid.uuid4()),
                "frame_number": saved_count,
                "timestamp_in_video": frame_timestamp,
                "file_path": file_path,
                "enhancement_applied": "Gray-world White Balance and CLAHE",
                "detections": ml_detections
            })

            saved_count += 1

        frame_index += 1

    cap.release()

    return {
        "duration": duration,
        "frame_count": saved_count,
        "total_video_frames": videos_total_frames,
        "fps": videos_frames_per_second,
        "frames": frame_results
    }