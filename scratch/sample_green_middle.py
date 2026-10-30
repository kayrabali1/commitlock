import cv2
import numpy as np

for name in ['bronze', 'silver', 'gold']:
    cap = cv2.VideoCapture(f'{name}.mp4')
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    middle_frame = total_frames // 2
    
    cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame)
    ret, frame = cap.read()
    if not ret:
        print(f"Failed to read {name}.mp4 at frame {middle_frame}")
        continue
    
    # Sample a grid of points on the video to see the color distribution
    # We will sample at y=100, x=300
    h, w, c = frame.shape
    sample = frame[100:110, 300:310]
    avg_color_bgr = np.mean(sample, axis=(0, 1))
    hsv_sample = cv2.cvtColor(sample, cv2.COLOR_BGR2HSV)
    avg_color_hsv = np.mean(hsv_sample, axis=(0, 1))
    
    print(f"\n{name} middle frame ({middle_frame}/{total_frames}) background sample (at x=300, y=100):")
    print(f"  BGR: {avg_color_bgr}")
    print(f"  HSV: {avg_color_hsv}")
    
    cap.release()
