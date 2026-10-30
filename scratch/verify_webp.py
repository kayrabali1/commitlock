from PIL import Image
import numpy as np

for name in ['bronze', 'silver', 'gold']:
    img = Image.open(f"assets/images/{name}_coin.webp")
    print(f"\n{name}_coin.webp:")
    print(f"  Mode: {img.mode}")
    print(f"  Size: {img.size}")
    print(f"  Frames: {getattr(img, 'n_frames', 1)}")
    
    # Load first frame and convert to numpy array
    img.seek(0)
    arr = np.array(img.convert("RGBA"))
    
    # Check corner pixels (should be transparent, alpha = 0)
    corner_alpha = arr[10, 10, 3]
    print(f"  Alpha at (10, 10): {corner_alpha}")
    
    # Check average alpha across the corner region
    corner_region = arr[0:20, 0:20, 3]
    print(f"  Corner region average alpha: {np.mean(corner_region)}")
    
    # Check if there are any non-transparent pixels in the corners
    # Let's count how many pixels have alpha > 0
    non_transparent = np.sum(arr[:, :, 3] > 0)
    total_pixels = arr.shape[0] * arr.shape[1]
    print(f"  Non-transparent pixels: {non_transparent} / {total_pixels} ({non_transparent/total_pixels:.1%})")
