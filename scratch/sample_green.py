import cv2
import numpy as np

for name in ['bronze', 'silver', 'gold']:
    cap = cv2.VideoCapture(f'{name}.mp4')
    ret, frame = cap.read()
    if not ret:
        print(f"Failed to read {name}.mp4")
        continue
    
    # Let's inspect a 10x10 block around the middle of the left side of the center square
    # The center square is x from 280 to 1000. So x = 300 should be the green background.
    sample = frame[100:110, 300:310]
    avg_color_bgr = np.mean(sample, axis=(0, 1))
    hsv_sample = cv2.cvtColor(sample, cv2.COLOR_BGR2HSV)
    avg_color_hsv = np.mean(hsv_sample, axis=(0, 1))
    
    print(f"\n{name} background sample (at x=300, y=100):")
    print(f"  BGR: {avg_color_bgr}")
    print(f"  HSV: {avg_color_hsv}")
    
    cap.release()
