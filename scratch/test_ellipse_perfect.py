import cv2
import numpy as np

cap = cv2.VideoCapture('silver.mp4')
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2)
ret, frame = cap.read()
cap.release()

if ret:
    h, w, c = frame.shape
    cx = w // 2
    cy = h // 2
    crop = frame[:, cx - 360 : cx + 360].copy()
    
    # Use fixed vertical parameters
    coin_cy = 360
    b = 308
    
    # We will sample the background color at x=50, y=360
    bg_color = crop[360, 50].astype(float)
    
    # Find coin width by checking center row
    center_row = crop[360, :].astype(float)
    devs = np.linalg.norm(center_row - bg_color, axis=1)
    
    coin_indices = np.where(devs > 15)[0]
    if len(coin_indices) > 0:
        x_left = coin_indices[0]
        x_right = coin_indices[-1]
        coin_cx = (x_left + x_right) / 2
        a = (x_right - x_left) / 2
        
        print(f"Detected: cx={coin_cx}, a={a}")
        
        # Create ellipse mask
        mask = np.zeros((720, 720), dtype=np.uint8)
        cv2.ellipse(mask, (int(coin_cx), int(coin_cy)), (int(a), int(b)), 0, 0, 360, 255, -1)
        
        # Save preview
        preview = crop.copy()
        preview[mask == 0] = [0, 255, 0]
        cv2.imwrite("scratch/silver_ellipse_preview_perfect.jpg", preview)
        print("Saved scratch/silver_ellipse_preview_perfect.jpg")
