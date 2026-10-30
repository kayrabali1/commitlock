from PIL import Image

paths = {
    "bronze": "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/media__1783953533355.jpg",
    "gold": "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/media__1783953533358.jpg",
    "silver": "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/media__1783953533361.jpg"
}

for name, path in paths.items():
    img = Image.open(path)
    print(f"{name}: size={img.size}, mode={img.mode}")
