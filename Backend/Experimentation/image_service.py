"""Still-image metadata and preview (logic from Opencv Image.py, headless, BGR on disk)."""

from __future__ import annotations

import base64
from pathlib import Path

import cv2


def inspect_image_file(path: str | Path, *, jpeg_quality: int = 88) -> dict:
    path = Path(path)
    frame = cv2.imread(str(path))
    if frame is None:
        raise ValueError("Could not read image file.")

    height, width = frame.shape[:2]
    channels = int(frame.shape[2]) if frame.ndim == 3 else 1

    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])
    if not ok:
        raise RuntimeError("Failed to encode preview JPEG.")

    preview_b64 = base64.b64encode(buf.tobytes()).decode("ascii")

    return {
        "media_type": "image",
        "filename": path.name,
        "width": width,
        "height": height,
        "channels": channels,
        "preview_jpeg_base64": preview_b64,
    }
