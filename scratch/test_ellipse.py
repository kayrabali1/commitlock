import cv2
import numpy as np

# Load silver frame 72
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
    
    # We will sample the background color at x=50, y=360 (which is definitely background)
    bg_color = crop[360, 50].astype(float)
    print(f"Background color at edge: {bg_color}")
    
    # On the center row (y = 360), find where the coin starts and ends.
    # We measure deviation from background color.
    center_row = crop[360, :].astype(float)
    devs = np.linalg.norm(center_row - bg_color, axis=1)
    
    # Find indices where deviation is significant (e.g. > 15)
    coin_indices = np.where(devs > 15)[0]
    if len(coin_indices) > 0:
        x_left = coin_indices[0]
        x_right = coin_indices[-1]
        
        # Ellipse parameters
        coin_cx = (x_left + x_right) / 2
        coin_cy = 360
        a = (x_right - x_left) / 2
        # Let's find vertical radius 'b'. The coin vertical height is constant.
        # We can find 'b' by checking the center column (x = coin_cx) dev.
        center_col = crop[:, int(coin_cx)].astype(float)
        col_devs = np.linalg.norm(center_col - bg_color, axis=1)
        y_indices = np.where(col_devs > 15)[0]
        y_top = y_indices[0]
        y_bottom = y_indices[-1]
        b = (y_bottom - y_top) / 2
        coin_cy = (y_top + y_bottom) / 2
        
        print(f"Detected ellipse: cx={coin_cx}, cy={coin_cy}, a={a}, b={b}")
        
        # Create ellipse mask
        mask = np.zeros((720, 720), dtype=np.uint8)
        cv2.ellipse(mask, (int(coin_cx), int(coin_cy)), (int(a), int(b)), 0, 0, 360, 255, -1)
        
        # Create preview
        preview = crop.copy()
        # Create alpha-masked image
        rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2BGRA)
        rgba[:, :, 3] = mask
        
        # Let's save a preview where the transparent part is replaced by vibrant green
        preview[mask == 0] = [0, 255, 0]
        cv2.imwrite("scratch/silver_ellipse_preview.jpg", preview)
        print("Saved scratch/silver_ellipse_preview.jpg")
    else:
        print("Could not find coin on center row")
else:
    print("Failed to read frame")
