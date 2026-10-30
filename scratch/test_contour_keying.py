import cv2
import numpy as np

# Load all frames of silver.mp4
cap = cv2.VideoCapture('silver.mp4')
frames = []
while True:
    ret, frame = cap.read()
    if not ret:
        break
    h, w, c = frame.shape
    cx = w // 2
    crop = frame[:, cx - 360 : cx + 360]
    frames.append(crop)
cap.release()
frames = np.array(frames)

# Compute median background
median_bg = np.median(frames, axis=0).astype(np.uint8)

# Test contour filling on Frame 0 and Frame 72
for t in [0, 72]:
    frame = frames[t]
    diff = cv2.absdiff(frame, median_bg)
    diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    
    # Mask out floor (y >= 665) and ceiling (y <= 50)
    diff_gray[665:, :] = 0
    diff_gray[:50, :] = 0
    
    # Threshold
    _, thresh = cv2.threshold(diff_gray, 10, 255, cv2.THRESH_BINARY)
    
    # Apply morphological closing to merge close elements
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    mask = np.zeros_like(diff_gray)
    if len(contours) > 0:
        largest_contour = max(contours, key=cv2.contourArea)
        # Fill the largest contour
        cv2.drawContours(mask, [largest_contour], -1, 255, -1)
        
        # Apply slight blur to smooth edges
        mask = cv2.GaussianBlur(mask, (3, 3), 0)
        
    # Composite over hot pink
    preview = np.zeros_like(frame)
    preview[:, :] = [128, 0, 255] # Pink BGR
    
    # Copy coin using mask
    idx = (mask > 0)
    # We can do soft compositing:
    alpha = mask.astype(float) / 255.0
    alpha = np.expand_dims(alpha, axis=2)
    preview = (frame * alpha + preview * (1 - alpha)).astype(np.uint8)
    
    cv2.imwrite(f"scratch/silver_contour_mask_frame_{t}.jpg", preview)
    print(f"Saved scratch/silver_contour_mask_frame_{t}.jpg")
