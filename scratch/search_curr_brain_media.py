import os

curr_brain_dir = "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734"
found_files = []

if os.path.exists(curr_brain_dir):
    for root, dirs, files in os.walk(curr_brain_dir):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.mp4')):
                full_path = os.path.join(root, file)
                found_files.append(full_path)

print(f"Found {len(found_files)} media files in current conversation brain:")
for f in found_files:
    print(f"  {f} ({os.path.getsize(f) / 1024.0:.1f} KB)")
