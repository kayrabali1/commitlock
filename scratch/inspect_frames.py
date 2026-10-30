from PIL import Image
import numpy as np

for name in ['bronze', 'silver', 'gold']:
    img = Image.open(f"assets/images/{name}_coin.webp")
    for frame_idx in [0, 36, 72, 108]:
        img.seek(frame_idx)
        # Convert frame to RGBA
        rgba = img.convert("RGBA")
        
        # Create a preview on a hot-pink background to make any gray background pixels obvious!
        preview = Image.new("RGBA", rgba.size, (255, 0, 128, 255))
        # Composite the coin over the pink background
        preview.alpha_composite(rgba)
        
        # Save as JPEG
        preview.convert("RGB").save(f"scratch/{name}_frame_{frame_idx}_preview.jpg")
        print(f"Saved scratch/{name}_frame_{frame_idx}_preview.jpg")
