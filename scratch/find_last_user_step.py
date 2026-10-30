import json
import os

transcript_path = "/Users/kayrabali/.gemini/antigravity/brain/ce5e9016-7df1-477c-8224-3f8afb042734/.system_generated/logs/transcript.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r') as f:
        lines = f.readlines()
        print(f"Total lines: {len(lines)}")
        # Print the last user input step
        for idx in reversed(range(len(lines))):
            try:
                data = json.loads(lines[idx])
                if data.get("type") == "USER_INPUT" or data.get("source") == "USER_EXPLICIT":
                    print(f"\n--- User Step (Index {idx}) ---")
                    print(json.dumps(data, indent=2))
                    break
            except Exception as e:
                pass
else:
    print("Transcript path does not exist")
