import fitz
from pathlib import Path

pdf_path = Path("D:/classphere/apps/api/apps/api/temp/extract_1784205291593_uiufkn/temp.pdf")
doc = fitz.open(str(pdf_path))

for page_idx in range(len(doc)):
    page = doc[page_idx]
    print(f"=== Page {page_idx+1} Images ===")
    for img in page.get_images():
        print(img)
