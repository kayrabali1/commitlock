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

# Setup smoothing parameters (same as convert_all_coins)
x_lefts = []
x_rights = []
for crop in frames:
    bg_color = crop[360, 50].astype(float)
    center_row = crop[360, :].astype(float)
    devs = np.linalg.norm(center_row - bg_color, axis=1)
    coin_indices = np.where(devs > 15)[0]
    if len(coin_indices) > 0:
        x_lefts.append(coin_indices[0])
        x_rights.append(coin_indices[-1])
    else:
        x_lefts.append(50)
        x_rights.append(670)

def median_filter(data, window_size=9):
    res = np.copy(data)
    half = window_size // 2
    for i in range(len(data)):
        start = max(0, i - half)
        end = min(len(data), i + half + 1)
        res[i] = np.median(data[start:end])
    return res

def moving_average(data, window_size=9):
    res = np.copy(data)
    half = window_size // 2
    for i in range(len(data)):
        start = max(0, i - half)
        end = min(len(data), i + half + 1)
        res[i] = np.mean(data[start:end])
    return res

smooth_lefts = moving_average(median_filter(x_lefts, 9), 9)
smooth_rights = moving_average(median_filter(x_rights, 9), 9)

# Test different choke values (e.g. 0.94, 0.95, 0.96) on Frame 0
t = 0
frame = frames[t]
coin_cx = (smooth_lefts[t] + smooth_rights[t]) / 2.0
a = (smooth_rights[t] - smooth_lefts[t]) / 2.0
b = 308
cy = 360

for choke in [0.97, 0.95, 0.93]:
    a_choked = a * choke
    b_choked = b * choke
    
    # Create mask
    mask = np.zeros((720, 720), dtype=np.uint8)
    cv2.ellipse(mask, (int(coin_cx), int(cy)), (int(a_choked), int(b_choked)), 0, 0, 360, 255, -1)
    mask = cv2.GaussianBlur(mask, (3, 3), 0)
    
    # Preview
    preview = np.zeros_like(frame)
    preview[:, :] = [128, 0, 255] # Pink BGR
    
    alpha = mask.astype(float) / 255.0
    alpha = np.expand_dims(alpha, axis=2)
    preview = (frame * alpha + preview * (1 - alpha)).astype(np.uint8)
    
    cv2.imwrite(f"scratch/silver_choke_{choke}_frame_{t}.jpg", preview)
    print(f"Saved scratch/silver_choke_{choke}_frame_{t}.jpg")
