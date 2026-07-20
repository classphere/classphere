"""
Show the STITCHED page 7 HTML (after stitch_split_questions runs).
"""
import json, sys, re
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r'D:\classphere\apps\api\src\services\extractor')

RAW_PATH = r"D:\classphere\apps\api\apps\api\temp\extract_1784205291593_uiufkn\extracted_data\marker_raw.json"
data = json.load(open(RAW_PATH, encoding='utf-8'))
pages = data.get('json', {}).get('children', [])

# Manually replicate the stitch logic
QUESTION_HEADER_RE = re.compile(
    r'(Question\s+No\.|Q\.\s*\d+|QUESTION\s+\d+|^\d+\.\s)',
    re.IGNORECASE | re.MULTILINE
)

def stitch_pages(pages):
    import copy
    temp = copy.deepcopy(pages)
    for i in range(1, len(temp)):
        current_page = temp[i]
        prev_page = temp[i - 1]
        html = current_page.get('html', '').strip()
        if not html:
            continue
        match = QUESTION_HEADER_RE.search(html)
        if match:
            split_idx = match.start()
            if split_idx > 0:
                spillover = html[:split_idx]
                current_page['html'] = html[split_idx:]
                prev_page['html'] = prev_page.get('html', '') + '\n\n' + spillover
                # move images
                for img in re.findall(r'src="([^"]+)"', spillover):
                    if 'images' in current_page and img in current_page['images']:
                        prev_page.setdefault('images', {})[img] = current_page['images'].pop(img)
        else:
            prev_page['html'] = prev_page.get('html', '') + '\n\n' + html
            current_page['html'] = ''
    # Apply B/C/D swap
    for page in temp:
        html = page.get('html', '')
        if html:
            html = re.sub(
                r'(<img\s+src="[^"]+"\s*/>)\s*(<p>\s*\([B-Db-d]\)\s*</p>)',
                r'\2\n\1',
                html
            )
            page['html'] = html
    return temp

stitched = stitch_pages(pages)

# Show stitched page 7 (index 6)
p7 = stitched[6]
print(f"=== STITCHED PAGE 7 ===")
print(p7.get('html', ''))
