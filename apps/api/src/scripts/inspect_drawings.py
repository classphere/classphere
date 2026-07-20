import fitz
from pathlib import Path

pdf_path = Path("D:/classphere/apps/api/apps/api/temp/extract_1784205291593_uiufkn/temp.pdf")
doc = fitz.open(str(pdf_path))
page = doc[5] # page 6

print("=== Images on Page 6 ===")
for img in page.get_images():
    print(img)

print("\n=== Drawings on Page 6 ===")
drawings = page.get_drawings()
print(f"Found {len(drawings)} drawing paths.")
for idx, d in enumerate(drawings[:15]):
    print(f"Path {idx}: rect={d['rect']}, type={d['type']}")
