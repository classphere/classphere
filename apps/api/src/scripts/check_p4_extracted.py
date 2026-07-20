import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH = r"D:\classphere\apps\api\apps\api\temp\extract_1784205291593_uiufkn\extracted_data\all_extracted_data.json"
data = json.load(open(JSON_PATH, encoding='utf-8'))
questions = data.get('questions', [])

for q in questions:
    num = q.get('question_number')
    if 15 <= num <= 19:
        print(f"=== Q{num} ===")
        print("Text:", repr(q.get('question_text', ''))[:200])
        print("Options:")
        for o in q.get('options', []):
            print(f"  ({o['id']}) {repr(o.get('text', ''))}")
        print()
