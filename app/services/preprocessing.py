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
    # Main enhancement pipeline - runs on every frame
    frame = apply_grayscale_wb(frame)
    frame = apply_clahe(frame)
    return frame


# Additional enhancement options from Low - we need to do more research on the optimal combination 

def enhance_contrast(frame: np.ndarray, alpha: float = 1.5, beta: int = 20) -> np.ndarray:
    return cv2.convertScaleAbs(frame, alpha=alpha, beta=beta)

def enhance_sharpen(frame: np.ndarray) -> np.ndarray:
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]])
    return cv2.filter2D(frame, -1, kernel)

def enhance_denoise(frame: np.ndarray) -> np.ndarray:
    return cv2.fastNlMeansDenoisingColored(frame, h=10)

def enhance_histeq(frame: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(frame, cv2.COLOR_RGB2LAB)
    lab[:, :, 0] = cv2.equalizeHist(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)