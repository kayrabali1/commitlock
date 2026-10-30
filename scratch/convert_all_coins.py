import cv2
import numpy as np
from PIL import Image
import os

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

def convert_video_to_webp(video_path, output_path, target_size=220):
    print(f"\nProcessing {video_path}...")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open {video_path}")
        return
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = int(1000 / fps) if fps > 0 else 41
    print(f"  FPS: {fps}, Frame duration: {duration}ms")
    
    raw_frames = []
    x_lefts = []
    x_rights = []
    
    # Coin vertical parameters on 720p height
    b_720 = 308
    cy_720 = 360
    
    # 1. Read all frames and perform initial edge detection
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        h, w, c = frame.shape
        cx = w // 2
        
        # Crop center 720x720 square
        crop = frame[:, cx - 360 : cx + 360]
        raw_frames.append(crop)
        
        # Sample background color at x=50, y=360
        bg_color = crop[360, 50].astype(float)
        
        # Detect coin width using center row deviation
        center_row = crop[360, :].astype(float)
        devs = np.linalg.norm(center_row - bg_color, axis=1)
        
        coin_indices = np.where(devs > 15)[0]
        if len(coin_indices) > 0:
            x_left = coin_indices[0]
            x_right = coin_indices[-1]
        else:
            x_left = 50
            x_right = 670
            
        x_lefts.append(x_left)
        x_rights.append(x_right)
        frame_idx += 1
        
    cap.release()
    total_frames = len(raw_frames)
    print(f"  Read {total_frames} frames.")
    
    # 2. Smooth the detected boundaries
    x_lefts = np.array(x_lefts, dtype=float)
    x_rights = np.array(x_rights, dtype=float)
    
    smooth_lefts = moving_average(median_filter(x_lefts, window_size=9), window_size=9)
    smooth_rights = moving_average(median_filter(x_rights, window_size=9), window_size=9)
    
    # 3. Render frames with the smoothed, CHOKED ellipse mask
    processed_frames = []
    scale = target_size / 720.0
    
    # We apply a mask choke of 0.94 (chokes the mask inwards by 6% to completely cut off the gray edge border)
    choke = 0.94
    b_scaled = b_720 * scale * choke
    cy_scaled = cy_720 * scale
    
    for idx in range(total_frames):
        crop = raw_frames[idx]
        
        coin_cx_720 = (smooth_lefts[idx] + smooth_rights[idx]) / 2.0
        a_720 = (smooth_rights[idx] - smooth_lefts[idx]) / 2.0
        
        # Scale and choke horizontal radius
        coin_cx_scaled = coin_cx_720 * scale
        a_scaled = a_720 * scale * choke
        
        # Resize cropped frame
        resized_crop = cv2.resize(crop, (target_size, target_size), interpolation=cv2.INTER_AREA)
        
        # Create scaled ellipse mask
        mask = np.zeros((target_size, target_size), dtype=np.uint8)
        cv2.ellipse(
            mask, 
            (int(coin_cx_scaled), int(cy_scaled)), 
            (int(a_scaled), int(b_scaled)), 
            0, 0, 360, 255, -1
        )
        
        # Soften mask edges with a subtle blur (anti-aliasing)
        mask = cv2.GaussianBlur(mask, (3, 3), 0)
        
        # Convert BGR to BGRA
        rgba = cv2.cvtColor(resized_crop, cv2.COLOR_BGR2BGRA)
        rgba[:, :, 3] = mask
        
        # Convert to RGB + Alpha PIL Image
        rgba_rgb = cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA)
        pil_img = Image.fromarray(rgba_rgb)
        processed_frames.append(pil_img)
        
    # 4. Save animated WebP with lossy compression (quality=70)
    processed_frames[0].save(
        output_path,
        save_all=True,
        append_images=processed_frames[1:],
        duration=duration,
        loop=0,
        lossless=False,
        quality=70
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024.0
    print(f"  Saved {output_path} ({total_frames} frames, {file_size_kb:.1f} KB)")

# Run conversions with size 220
os.makedirs("assets/images", exist_ok=True)
convert_video_to_webp("bronze.mp4", "assets/images/bronze_coin.webp", target_size=220)
convert_video_to_webp("silver.mp4", "assets/images/silver_coin.webp", target_size=220)
convert_video_to_webp("gold.mp4", "assets/images/gold_coin.webp", target_size=220)
print("\nConversion complete with 220px choked mask!")
