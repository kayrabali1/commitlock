import cv2
import numpy as np

cap = cv2.VideoCapture('silver.mp4')
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

widths = []
centers = []

for t in range(total_frames):
    ret, frame = cap.read()
    if not ret:
        break
    h, w, c = frame.shape
    cx = w // 2
    crop = frame[:, cx - 360 : cx + 360]
    
    bg_color = crop[360, 50].astype(float)
    center_row = crop[360, :].astype(float)
    devs = np.linalg.norm(center_row - bg_color, axis=1)
    
    coin_indices = np.where(devs > 15)[0]
    if len(coin_indices) > 0:
        x_left = coin_indices[0]
        x_right = coin_indices[-1]
        width = x_right - x_left
        center = (x_left + x_right) / 2
        widths.append(width)
        centers.append(center)
        print(f"Frame {t}: x_left={x_left}, x_right={x_right}, width={width}, center={center}")
    else:
        widths.append(0)
        centers.append(360)
        print(f"Frame {t}: Not detected")

cap.release()
