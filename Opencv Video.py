import cv2
import numpy as np

VIDEO_PATH = ''

# ---------------------------------------------------------------------------
# Enhancement functions
# ---------------------------------------------------------------------------

def enhance_contrast(frame, alpha=1.5, beta=20):
    """
    alpha > 1 increases contrast, beta increases brightness.
    """
    return cv2.convertScaleAbs(frame, alpha=alpha, beta=beta)


def enhance_clahe(frame, clip_limit=2.0, tile_size=(8, 8)):
    """
    Equalises contrast in local regions rather than the whole image.
    """
    lab   = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_size)
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def enhance_sharpen(frame):
    """
    Sharpens edges, used if footage is slightly blurry.
    """
    kernel = np.array([[0, -1,  0],
                       [-1,  5, -1],
                       [0, -1,  0]])
    return cv2.filter2D(frame, -1, kernel)


def enhance_denoise(frame):
    """
    Removes grain/noise. Slower than the others but good for murky water.
    "h" is the filter strength, higher = smoother but loses detail.
    """
    return cv2.fastNlMeansDenoisingColored(frame, h=10)


def enhance_histeq(frame):
    """
    Histogram equalisation, spreads out pixel intensities globally.
    Less controlled than CLAHE but faster.
    """
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    lab[:, :, 0] = cv2.equalizeHist(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

# Debugging purpose only
def print_frame_info(frame, label="Frame"):
    """
    Prints the NumPy array info for a frame.
    """
    print(f"\n[{label}]")
    print(f"  type  : {type(frame)}")
    print(f"  shape : {frame.shape}  (height, width, channels)")
    print(f"  dtype : {frame.dtype}")
    print(f"  min   : {frame.min()}   max: {frame.max()}")
    print(f"  mean  : {frame.mean():.2f}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

cap = cv2.VideoCapture(VIDEO_PATH)

total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps          = int(cap.get(cv2.CAP_PROP_FPS))

if not cap.isOpened():
    print("Error: could not open video file.")
    exit()

print(f"File opened successfully!")
print(f"Total frames : {total_frames}")
print(f"FPS          : {fps}")

ret, frame = cap.read()
if not ret:
    print("Error: couldn't read frame.")
    cap.release()
    exit()

print_frame_info(frame, "Original (raw)")

# Apply all enhancements and store them
enhancements = {
    "original":  frame,
    "contrast":  enhance_contrast(frame),
    "clahe":     enhance_clahe(frame),
    "sharpen":   enhance_sharpen(frame),
    "denoise":   enhance_denoise(frame),
    "histeq":    enhance_histeq(frame),
}

# Show each one, press any key to move to the next
for name, enhanced in enhancements.items():
    print_frame_info(enhanced, name)
    cv2.imshow(f"Enhancement: {name} (press any key for next)", enhanced)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

# ---------------------------------------------------------------------------
# NumPy operations
# ---------------------------------------------------------------------------

print("\n--- NumPy preprocessing steps ---")

# Resize to model input size
resized = cv2.resize(frame, (224, 224))
print_frame_info(resized, "After resize to 224x224")

# Convert BGR → RGB
rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
print_frame_info(rgb, "After BGR -> RGB")

# Normalise to [0.0, 1.0]
normalised = rgb.astype(np.float32) / 255.0
print_frame_info(normalised, "After normalise / 255")

# Add batch dimension (H, W, C) → (1, H, W, C)
batched = np.expand_dims(normalised, axis=0)
print(f"\n[After expand_dims]")
print(f"  shape : {batched.shape}")

cap.release()
print("\nDone.")