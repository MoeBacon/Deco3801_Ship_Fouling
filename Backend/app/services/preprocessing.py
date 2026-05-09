import cv2
import numpy as np


def apply_grayscale_wb(frame: np.ndarray) -> np.ndarray:
    wb = cv2.xphoto.createGrayworldWB()
    return wb.balanceWhite(frame)


def apply_clahe(frame: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(frame, cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)


def enhance_frame(frame: np.ndarray) -> np.ndarray:
    # Main enhancement pipeline - runs on every frame.
    frame = apply_grayscale_wb(frame)
    frame = apply_clahe(frame)
    return frame
