import cv2
import numpy as np

IMAGE_PATH = "/Users/lowwin/Downloads/2026-01-14-23-03-59-STARBOARD_VERTICAL_SIDE_AFT-BEFORE.jpg"

# load
frame = cv2.imread(IMAGE_PATH)
if frame is None:
    raise FileNotFoundError("Image not found")
frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

# enhancements
def enhance_contrast(f):
    return cv2.convertScaleAbs(f, alpha=1.5, beta=20)

def enhance_clahe(f):
    lab = cv2.cvtColor(f, cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)

def enhance_sharpen(f):
    kernel = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
    return cv2.filter2D(f, -1, kernel)

def enhance_denoise(f):
    return cv2.fastNlMeansDenoisingColored(f, None, 10, 10, 7, 21)

def enhance_histeq(f):
    lab = cv2.cvtColor(f, cv2.COLOR_RGB2LAB)
    lab[:, :, 0] = cv2.equalizeHist(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)

# show each one vs original
enhancements = {
    "contrast": enhance_contrast(frame),
    "clahe":    enhance_clahe(frame),
    "sharpen":  enhance_sharpen(frame),
    "denoise":  enhance_denoise(frame),
    "histeq":   enhance_histeq(frame),
}

for name, enhanced in enhancements.items():
    divider  = np.full((frame.shape[0], 4, 3), 200, dtype=np.uint8)
    combined = np.hstack([frame, divider, enhanced])
    display  = cv2.cvtColor(combined, cv2.COLOR_RGB2BGR)
    cv2.putText(display, "original", (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1)
    cv2.putText(display, name, (frame.shape[1] + 14, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1)
    cv2.imshow(f"original vs {name}", display)
    cv2.waitKey(0)

cv2.destroyAllWindows()