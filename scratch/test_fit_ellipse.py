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

# For each frame, fit an ellipse
for t in [0, 15, 30, 45, 60, 72, 90, 105, 120, 135]:
    frame = frames[t]
    diff = cv2.absdiff(frame, median_bg)
    diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    
    # Threshold to get a binary mask of the coin
    # We use a threshold of 15
    _, thresh = cv2.threshold(diff_gray, 15, 255, cv2.THRESH_BINARY)
    
    # Apply morphological closing to fill any small holes inside the coin
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if len(contours) > 0:
        # Get largest contour
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Fit ellipse (needs at least 5 points)
        if len(largest_contour) >= 5:
            ellipse = cv2.fitEllipse(largest_contour)
            (ecx, ecy), (d1, d2), angle = ellipse
            
            # Create a preview
            preview = frame.copy()
            cv2.ellipse(preview, ellipse, (0, 255, 0), 2)
            cv2.imwrite(f"scratch/silver_fit_ellipse_frame_{t}.jpg", preview)
            print(f"Frame {t}: cx={ecx:.1f}, cy={ecy:.1f}, d1={d1:.1f}, d2={d2:.1f}, angle={angle:.1f}")
        else:
            print(f"Frame {t}: contour too small")
    else:
        print(f"Frame {t}: no contours found")
