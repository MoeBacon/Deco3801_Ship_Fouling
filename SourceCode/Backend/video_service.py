"""Video metadata and first-frame preview (logic from Opencv Video.py, headless)."""

from __future__ import annotations

import base64
from pathlib import Path

import cv2


def inspect_video_file(path: str | Path, *, jpeg_quality: int = 82) -> dict:
    path = Path(path)
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise ValueError("Could not open video file.")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = float(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        raise ValueError("Could not read first frame from video.")

    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])
    if not ok:
        raise RuntimeError("Failed to encode preview JPEG.")

    preview_b64 = base64.b64encode(buf.tobytes()).decode("ascii")

    return {
        "media_type": "video",
        "filename": path.name,
        "total_frames": total_frames,
        "fps": round(fps, 3) if fps > 0 else 0.0,
        "width": width,
        "height": height,
        "preview_jpeg_base64": preview_b64,
    }
