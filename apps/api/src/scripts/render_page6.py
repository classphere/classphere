import fitz
from pathlib import Path

pdf_path = Path("D:/classphere/apps/api/apps/api/temp/extract_1784205291593_uiufkn/temp.pdf")
doc = fitz.open(str(pdf_path))
page = doc[5] # page 6

# Render page at 200 DPI
pix = page.get_pixmap(dpi=200)
out_path = Path("C:/Users/Harsh/.gemini/antigravity-ide/brain/afd2fbb7-a5a0-42b2-9c3d-d8f576a26ce2/page6_rendered.png")
pix.save(str(out_path))
print(f"Rendered Page 6 saved to: {out_path}")
