"""
Shared OpenCV enhancement pipeline (BGR frames, as from cv2.VideoCapture / cv2.imread).

Ported from the capstone reference scripts:
- Opencv Video.py (video + first-frame pipeline)
- Opencv Image.py (same operators, normalised to BGR here for one code path)
"""

from __future__ import annotations

import cv2
import numpy as np


def enhance_contrast(frame: np.ndarray, alpha: float = 1.5, beta: float = 20) -> np.ndarray:
    """alpha > 1 increases contrast, beta increases brightness."""
    return cv2.convertScaleAbs(frame, alpha=alpha, beta=beta)


def enhance_clahe(frame: np.ndarray, clip_limit: float = 2.0, tile_size: tuple[int, int] = (8, 8)) -> np.ndarray:
    """Local contrast equalisation (CLAHE on L channel)."""
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_size)
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def enhance_sharpen(frame: np.ndarray) -> np.ndarray:
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    return cv2.filter2D(frame, -1, kernel)


def enhance_denoise(frame: np.ndarray) -> np.ndarray:
    """Coloured NL-means denoise — tuned for murky ROV footage."""
    return cv2.fastNlMeansDenoisingColored(frame, None, 10, 10, 7, 21)


def enhance_histeq(frame: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    lab[:, :, 0] = cv2.equalizeHist(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def frame_to_model_input(frame: np.ndarray, size: tuple[int, int] = (224, 224)) -> np.ndarray:
    """Resize, BGR→RGB, normalise, NHWC batch of 1 (float32). Used before a future ML model."""
    resized = cv2.resize(frame, size)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    normalised = rgb.astype(np.float32) / 255.0
    return np.expand_dims(normalised, axis=0)


def all_enhancements(frame: np.ndarray) -> dict[str, np.ndarray]:
    """Apply each enhancement to a single BGR frame (for previews / batch jobs)."""
    return {
        "original": frame,
        "contrast": enhance_contrast(frame),
        "clahe": enhance_clahe(frame),
        "sharpen": enhance_sharpen(frame),
        "denoise": enhance_denoise(frame),
        "histeq": enhance_histeq(frame),
    }
