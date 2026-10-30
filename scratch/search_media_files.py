import os

app_data_dir = "/Users/kayrabali/.gemini/antigravity"
found_files = []

for root, dirs, files in os.walk(app_data_dir):
    for file in files:
        if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.mp4')):
            full_path = os.path.join(root, file)
            found_files.append(full_path)

print(f"Found {len(found_files)} media files in app data:")
for f in found_files:
    print(f"  {f} ({os.path.getsize(f) / 1024.0:.1f} KB)")
