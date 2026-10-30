import cv2
import numpy as np
import os

paths = {
    "bronze": "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/media__1783953533355.jpg",
    "gold": "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/media__1783953533358.jpg",
    "silver": "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/media__1783953533361.jpg"
}

os.makedirs("assets/images", exist_ok=True)
target_size = 256

for name, path in paths.items():
    print(f"Processing {name} coin image...")
    # Load image
    img = cv2.imread(path)
    if img is None:
        print(f"Error: Could not load {path}")
        continue
        
    h, w, c = img.shape
    
    # 1. Convert to grayscale and threshold to detect non-white pixels
    # Since the background is pure white, we find pixels that are not white.
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)
    
    # 2. Apply morphological closing to fill any internal holes inside the coin
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # 3. Find the largest contour (the coin)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    mask = np.zeros_like(gray)
    if len(contours) > 0:
        largest_contour = max(contours, key=cv2.contourArea)
        # Fill the contour
        cv2.drawContours(mask, [largest_contour], -1, 255, -1)
        
        # Smooth the mask edges (anti-aliasing)
        mask = cv2.GaussianBlur(mask, (5, 5), 0)
    else:
        # Fallback to a centered circle mask if no contour found
        cv2.circle(mask, (w // 2, h // 2), int(w * 0.47), 255, -1)
        mask = cv2.GaussianBlur(mask, (5, 5), 0)
        
    # 4. Apply a slight choke (erode mask) to make sure NO white background leaks at the edges
    # We can do this by thresholding the blurred mask slightly higher or using erode
    kernel_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.erode(mask, kernel_erode, iterations=2)
    mask = cv2.GaussianBlur(mask, (3, 3), 0)
    
    # 5. Resize image and mask to target size (256x256)
    resized_img = cv2.resize(img, (target_size, target_size), interpolation=cv2.INTER_AREA)
    resized_mask = cv2.resize(mask, (target_size, target_size), interpolation=cv2.INTER_AREA)
    
    # 6. Create BGRA image (adding alpha channel)
    bgra = cv2.cvtColor(resized_img, cv2.COLOR_BGR2BGRA)
    bgra[:, :, 3] = resized_mask
    
    # Save as transparent PNG
    output_path = f"assets/images/{name}_coin.png"
    cv2.imwrite(output_path, bgra)
    print(f"Saved {output_path} ({target_size}x{target_size})")

print("\nAll coin images processed successfully!")
