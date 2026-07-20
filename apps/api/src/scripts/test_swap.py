import json
import re
import copy
import sys
sys.stdout.reconfigure(encoding='utf-8')

raw = json.load(open(r'D:\classphere\apps\api\apps\api\temp\extract_1784205291593_uiufkn\extracted_data\marker_raw.json', encoding='utf-8'))
pages = raw['json']['children']

# Check pages 7, 8, 9, 14 (0-indexed 6, 7, 8, 13) for img-before-option pattern
SWAP_RE = re.compile(
    r'(<img\s+src="[^"]+"\s*/>)\s*(<p>\s*\([A-D]\)\s*</p>|<p>\s*[A-D]\s*</p>|\([A-D]\))',
    re.IGNORECASE
)

for idx in [5, 6, 7, 8, 13, 16]:
    page = pages[idx]
    html = page.get('html', '')
    imgs = list(page.get('images', {}).keys())
    
    # Find all matches of img-before-option
    matches = list(SWAP_RE.finditer(html))
    
    print(f"\n=== Page {idx+1} ===")
    print(f"  Images: {imgs}")
    print(f"  Img-before-option swaps needed: {len(matches)}")
    for m in matches:
        print(f"    MATCH: {repr(m.group(0)[:100])}")
    
    # Show first 200 chars
    print(f"  HTML start: {repr(html[:200])}")
