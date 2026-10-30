import cv2
import numpy as np

# Load all frames of silver.mp4
cap = cv2.VideoCapture('silver.mp4')
frames = []
while True:
    ret, frame = cap.read()
    if not ret:
        break
    # Crop to center 720x720
    h, w, c = frame.shape
    cx = w // 2
    crop = frame[:, cx - 360 : cx + 360]
    frames.append(crop)
cap.release()

frames = np.array(frames)
print(f"Loaded {len(frames)} frames. Shape: {frames.shape}")

# Compute the median background image across all frames
median_bg = np.median(frames, axis=0).astype(np.uint8)
cv2.imwrite("scratch/silver_median_bg.jpg", median_bg)
print("Saved scratch/silver_median_bg.jpg")

# Test difference thresholding on a middle frame
test_frame_idx = len(frames) // 2
test_frame = frames[test_frame_idx]

# Compute absolute difference
diff = cv2.absdiff(test_frame, median_bg)
diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)

# Save diff gray for inspection
cv2.imwrite("scratch/silver_diff_gray.jpg", diff_gray)
print("Saved scratch/silver_diff_gray.jpg")

# Threshold diff
for thresh in [10, 15, 20, 25]:
    _, mask = cv2.threshold(diff_gray, thresh, 255, cv2.THRESH_BINARY)
    
    # Save preview
    preview = test_frame.copy()
    preview[mask == 0] = [0, 255, 0] # Green where transparent
    cv2.imwrite(f"scratch/silver_diff_mask_thresh_{thresh}.jpg", preview)
    print(f"Saved scratch/silver_diff_mask_thresh_{thresh}.jpg")
