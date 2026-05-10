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


def is_duplicate(frame: np.ndarray, previous_frame: np.ndarray, threshold: float = 0.70) -> tuple[bool, float]:
    """
    Compare two BGR frames using SSIM on a downscaled greyscale version.
    Returns (is_duplicate, ssim_score).
    """
    small1 = cv2.resize(previous_frame, (320, 180))
    small2 = cv2.resize(frame, (320, 180))

    gray1 = cv2.cvtColor(small1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(small2, cv2.COLOR_BGR2GRAY)

    score, _ = ssim(gray1, gray2, full=True)
    return score > threshold, float(score)
