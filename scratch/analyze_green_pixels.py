import cv2
import numpy as np

for name in ['bronze', 'silver', 'gold']:
    cap = cv2.VideoCapture(f'{name}.mp4')
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    middle_frame = total_frames // 2
    cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame)
    ret, frame = cap.read()
    if not ret:
        print(f"Failed to read {name}.mp4")
        continue
    
    # Save the frame to a file so we can view it or verify its contents
    cv2.imwrite(f"scratch/{name}_frame.jpg", frame)
    print(f"Saved scratch/{name}_frame.jpg")
    
    # Find pixels where green is the dominant channel
    # In BGR: Blue=0, Green=1, Red=2
    # Dominant green: Green > Red + 20 and Green > Blue + 20
    b, g, r = cv2.split(frame)
    green_mask = (g.astype(int) > r.astype(int) + 20) & (g.astype(int) > b.astype(int) + 20)
    green_pixel_count = np.sum(green_mask)
    print(f"{name} has {green_pixel_count} dominant green pixels out of {frame.size // 3}")
    
    if green_pixel_count > 0:
        # Sample one green pixel
        y_indices, x_indices = np.where(green_mask)
        sample_y, sample_x = y_indices[len(y_indices)//2], x_indices[len(x_indices)//2]
        print(f"Sample green pixel at x={sample_x}, y={sample_y}: BGR={frame[sample_y, sample_x]}")
        
    cap.release()
