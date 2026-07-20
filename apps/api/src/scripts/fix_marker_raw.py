"""
fix_marker_raw.py
=================
Applies the image-before-option-letter swap fix to a marker_raw.json file.

RULES (safe defaults):
  - Swap <img> before (B), (C), (D) option labels → these are ALWAYS option images
  - NEVER swap before (A) → ambiguous (could be stem diagram or option A image)
  - Also undoes any previous bad (A) swaps that were applied in error

Usage:
    python fix_marker_raw.py <path_to_marker_raw.json>
    python fix_marker_raw.py  (uses default path for development testing)
"""
import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Accept path from CLI or use dev default
if len(sys.argv) >= 2:
    RAW_PATH = sys.argv[1]
else:
    RAW_PATH = r"D:\classphere\apps\api\apps\api\temp\extract_1784205291593_uiufkn\extracted_data\marker_raw.json"

# Only swap images before (B), (C), (D) - NEVER before (A)
SWAP_BCD = re.compile(
    r'(<img\s+src="[^"]+"\s*/>)\s*(<p>\s*\([B-Db-d]\)\s*</p>)',
)

# Undo any previous (A) swaps: revert (A)\n<img> back to <img>\n(A)
UNDO_A_SWAP = re.compile(
    r'(<p>\s*\(A\)\s*</p>)\n(<img\s+src="[^"]+"\s*/>)',
)

data = json.load(open(RAW_PATH, encoding='utf-8'))
pages = data.get('json', {}).get('children', [])

total_undone = 0
total_swaps = 0

for idx, page in enumerate(pages):
    html = page.get('html', '')
    if not html:
        continue

    # Step 1: Undo any bad (A) swaps from a previous run
    new_html, n_undo = UNDO_A_SWAP.subn(r'\2\n\1', html)
    if n_undo > 0:
        total_undone += n_undo
        print(f"  Page {idx+1}: undid {n_undo} bad (A) swap(s)")
        html = new_html

    # Step 2: Apply correct (B), (C), (D) swaps
    new_html, n_swap = SWAP_BCD.subn(r'\2\n\1', html)
    if n_swap > 0:
        total_swaps += n_swap
        print(f"  Page {idx+1}: swapped {n_swap} (B/C/D) img-before-option occurrence(s)")

    page['html'] = new_html

print(f"\nTotal (A) swaps undone: {total_undone}")
print(f"Total (B/C/D) swaps applied: {total_swaps}")

with open(RAW_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Saved to {RAW_PATH}")
