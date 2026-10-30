from PIL import Image
import numpy as np

img_paths = [
    "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/media__1783953533355.jpg",
    "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/media__1783953533358.jpg",
    "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/media__1783953533361.jpg"
]

for path in img_paths:
    img = Image.open(path)
    # Resize to 100x100 to quickly compute average color
    small = img.resize((100, 100))
    arr = np.array(small)
    
    # We only analyze pixels that are not close to white (since background is white, e.g. R>240, G>240, B>240)
    mask = (arr[:, :, 0] < 240) | (arr[:, :, 1] < 240) | (arr[:, :, 2] < 240)
    coin_pixels = arr[mask]
    
    if len(coin_pixels) > 0:
        avg_color = np.mean(coin_pixels, axis=0)
        r, g, b = avg_color[0], avg_color[1], avg_color[2]
        
        # Classification
        # Gold: Red and Green are high, Blue is lower (yellowish)
        # Bronze: Red is moderate-high, Green is lower, Blue is low (brownish/copper)
        # Silver: Red, Green, and Blue are almost equal (grayish)
        print(f"Path: {path}")
        print(f"  Average BGR: B={b:.1f}, G={g:.1f}, R={r:.1f}")
        
        if abs(r - g) < 15 and abs(g - b) < 15:
            print("  Classification: SILVER (Phoenix)")
        elif r > g + 30 and g > b + 25:
            print("  Classification: GOLD (Crown)")
        else:
            print("  Classification: BRONZE (Griffin)")
    else:
        print(f"Path {path}: No non-white pixels found")
