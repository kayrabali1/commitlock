import numpy as np

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

# Simulate the data we got (we will read it from the video in the real script)
# Let's test if the spike at Frame 88 is removed.
# Frame 87: 114, Frame 88: 1 (spike), Frame 89: 101
x_lefts = np.array([118, 114, 1, 101, 97])
res_med = median_filter(x_lefts, window_size=3)
print("Original:", x_lefts)
print("Median filtered (w=3):", res_med)
