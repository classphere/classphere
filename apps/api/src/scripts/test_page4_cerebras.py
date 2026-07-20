import json
import os
import sys
from dotenv import load_dotenv
sys.stdout.reconfigure(encoding='utf-8')

sys.argv = [sys.argv[0], r"D:\classphere\apps\api\apps\api\temp\extract_1784205291593_uiufkn\extracted_data"]

load_dotenv()
from cerebras.cloud.sdk import Cerebras

keys_file = r"d:\classphere\apps\api\src\services\extractor\api_keys.txt"
api_keys = [k.strip() for k in open(keys_file).read().splitlines() if k.strip()]
os.environ["CEREBRAS_API_KEY"] = api_keys[0]

client = Cerebras(api_key=api_keys[0])

RAW_PATH = r"D:\classphere\apps\api\apps\api\temp\extract_1784205291593_uiufkn\extracted_data\marker_raw.json"
data = json.load(open(RAW_PATH, encoding='utf-8'))
pages = data.get('json', {}).get('children', [])
page_html = pages[3].get('html', '')

sys.path.insert(0, r"D:\classphere\apps\api\src\services\extractor")
import cerebras_from_marker

prompt = (
    f"Page 4 HTML:\n"
    f"Last question number on previous page: 14"
    f"\n\n"
    f"{page_html}"
)

print("Sending request to Cerebras...")
response = client.chat.completions.create(
    messages=[
        {"role": "system", "content": cerebras_from_marker.EXTRACT_PROMPT},
        {"role": "user", "content": prompt}
    ],
    model="gpt-oss-120b",
    response_format={"type": "json_object"},
    temperature=0.01,
)

print("=== CEREBRAS RAW RESPONSE FOR PAGE 4 ===")
print(response.choices[0].message.content)
