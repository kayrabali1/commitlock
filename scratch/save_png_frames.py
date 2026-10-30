from PIL import Image
import os

img = Image.open("assets/images/silver_coin.webp")
os.makedirs("scratch/silver_frames", exist_ok=True)
for i in [0, 36, 72, 108]:
    img.seek(i)
    img.save(f"scratch/silver_frames/frame_{i}.png")
    print(f"Saved scratch/silver_frames/frame_{i}.png")
