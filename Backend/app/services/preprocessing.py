import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim


# =========================================================
# ENHANCEMENT
# =========================================================

def apply_grayscale_wb(frame: np.ndarray) -> np.ndarray:
    wb = cv2.xphoto.createGrayworldWB()
    return wb.balanceWhite(frame)


def apply_clahe(frame: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(frame, cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)


def enhance_frame(frame: np.ndarray) -> np.ndarray:
    """Main enhancement pipeline - runs on every accepted frame."""
    frame = apply_grayscale_wb(frame)
    frame = apply_clahe(frame)
    return frame


# =========================================================
# QUALITY CHECKS
# All checks operate on raw BGR frames (before enhancement).
# =========================================================

def is_blurry(frame: np.ndarray, threshold: float = 25.0) -> tuple[bool, float]:
    """
    Divide the frame into a 4x4 grid and take the sharpest tile's
    Laplacian variance. Accepts the frame if any region is sharp.
    Returns (is_blurry, score).
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    tile_h, tile_w = h // 4, w // 4

    max_variance = 0.0
    for row in range(4):
        for col in range(4):
            tile = gray[row * tile_h:(row + 1) * tile_h, col * tile_w:(col + 1) * tile_w]
            variance = cv2.Laplacian(tile, cv2.CV_64F).var()
            max_variance = max(max_variance, variance)

    return max_variance < threshold, max_variance


def has_enough_detail(frame: np.ndarray, threshold: float = 0.05) -> tuple[bool, float]:
    """
    Divide the frame into a 4x4 grid and take the highest std-dev tile.
    Accepts the frame if any region has sufficient texture.
    Returns (has_enough_detail, score).
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    tile_h, tile_w = h // 4, w // 4

    max_std = 0.0
    for row in range(4):
        for col in range(4):
            tile = gray[row * tile_h:(row + 1) * tile_h, col * tile_w:(col + 1) * tile_w]
            max_std = max(max_std, float(tile.std()))

    return max_std > threshold, max_std


def is_duplicate(
    frame: np.ndarray,
    recent_frames: list[np.ndarray],
    threshold: float = 0.90,
) -> tuple[bool, float]:
    """
    Compare a candidate BGR frame against a ring buffer of recently accepted
    BGR frames using SSIM on a downscaled greyscale version.

    The candidate is considered a duplicate only if it is too similar to
    *every* frame in the buffer — meaning it offers nothing new relative to
    any of them. If it differs meaningfully from at least one buffer frame it
    is considered novel and should be kept.

    Args:
        frame:         Candidate BGR frame to evaluate.
        recent_frames: Ring buffer of recently accepted BGR frames (newest
                       last). Must be non-empty.
        threshold:     SSIM above which two frames are considered the same
                       scene. Default 0.90.

    Returns:
        (is_duplicate, worst_ssim) where worst_ssim is the *lowest* SSIM
        score across all buffer comparisons (i.e. the most-different pairing).
        If worst_ssim < threshold the frame is novel vs at least one buffer
        entry and is_duplicate is False.
    """
    small_candidate = cv2.resize(frame, (320, 180))
    gray_candidate = cv2.cvtColor(small_candidate, cv2.COLOR_BGR2GRAY)

    min_ssim = 1.0  # track the lowest (most-different) score seen
    for buf_frame in recent_frames:
        small_buf = cv2.resize(buf_frame, (320, 180))
        gray_buf = cv2.cvtColor(small_buf, cv2.COLOR_BGR2GRAY)
        score, _ = ssim(gray_candidate, gray_buf, full=True)
        min_ssim = min(min_ssim, score)

        # Short-circuit: already novel vs this buffer frame, no need to
        # compare against the rest.
        if min_ssim < threshold:
            return False, float(min_ssim)

    return True, float(min_ssim)
