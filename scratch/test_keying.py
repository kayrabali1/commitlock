import cv2
import numpy as np

# Load silver frame 72 (middle frame)
cap = cv2.VideoCapture('silver.mp4')
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2)
ret, frame = cap.read()
cap.release()

if ret:
    # Crop center 720x720
    h, w, c = frame.shape
    cx = w // 2
    cy = h // 2
    crop = frame[:, cx - 360 : cx + 360]
    
    # Let's try keying out the background.
    # The background is a gray color. Let's sample a few points at the corners of the crop:
    # Top-left, top-right, bottom-left, bottom-right corners of the crop should be background.
    bg_samples = [
        crop[20, 20],
        crop[20, 700],
        crop[700, 20],
        crop[700, 700],
        crop[50, 100],
        crop[50, 620]
    ]
    avg_bg = np.mean(bg_samples, axis=0)
    print(f"Average background color (BGR): {avg_bg}")
    
    # We will compute the distance of each pixel to this average background color
    dist = np.linalg.norm(crop.astype(float) - avg_bg, axis=2)
    
    # Let's test a few thresholds
    for thresh in [15, 25, 35, 45]:
        mask = (dist < thresh).astype(np.uint8) * 255
        
        # Create a preview where keyed pixels are green (so we can see what is keyed out)
        preview = crop.copy()
        preview[mask > 0] = [0, 255, 0] # Green screen where transparent
        
        # Save preview
        cv2.imwrite(f"scratch/silver_key_thresh_{thresh}.jpg", preview)
        print(f"Saved scratch/silver_key_thresh_{thresh}.jpg")
else:
    print("Failed to read frame")
