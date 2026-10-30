import json
import os

transcript_path = "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/.system_generated/logs/transcript.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r') as f:
        for line in f:
            try:
                data = json.loads(line)
                # Look for file paths, content, or anything related to images
                if "content" in data:
                    content_str = str(data["content"])
                    if ".png" in content_str or ".jpg" in content_str or ".jpeg" in content_str:
                        print(f"Found in content: {content_str[:500]}")
                if "tool_calls" in data:
                    print(f"Tool calls: {data['tool_calls']}")
            except Exception as e:
                pass
else:
    print("Transcript path does not exist")
