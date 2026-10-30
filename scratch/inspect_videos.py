import cv2
import numpy as np

for name in ['bronze', 'silver', 'gold']:
    cap = cv2.VideoCapture(f'{name}.mp4')
    ret, frame = cap.read()
    if not ret:
        print(f"Failed to read {name}.mp4")
        continue
    
    # Get frame dimensions
    h, w, c = frame.shape
    print(f"{name}.mp4: {w}x{h}, {cap.get(cv2.CAP_PROP_FRAME_COUNT)} frames, fps={cap.get(cv2.CAP_PROP_FPS)}")
    
    # Sample background color (top-left corner)
    corner = frame[10:50, 10:50]
    avg_color_bgr = np.mean(corner, axis=(0, 1))
    print(f"Average corner BGR: {avg_color_bgr}")
    
    hsv_corner = cv2.cvtColor(corner, cv2.COLOR_BGR2HSV)
    avg_color_hsv = np.mean(hsv_corner, axis=(0, 1))
    print(f"Average corner HSV: {avg_color_hsv}")
    
    cap.release()
