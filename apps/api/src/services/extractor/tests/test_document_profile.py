import sys
import unittest
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from document_profile import profile_document


class DocumentProfileTests(unittest.TestCase):
    def test_digital_answer_key_page(self):
        document = fitz.open()
        page = document.new_page(width=595, height=842)
        body = "ANSWER KEYS\n" + "Q. 1 2 3 4\nA. A B C D\n" + ("Digital answer key content. " * 25)
        page.insert_textbox(fitz.Rect(48, 48, 547, 790), body, fontsize=11)
        try:
            profile = profile_document(document)
        finally:
            document.close()

        self.assertEqual(profile["document_kind"], "digital")
        self.assertEqual(profile["answer_key_pages"], [1])
        self.assertEqual(profile["ocr_pages"], [])

    def test_full_page_raster_requires_ocr(self):
        document = fitz.open()
        page = document.new_page(width=595, height=842)
        pixmap = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 595, 842), 0)
        pixmap.clear_with(245)
        page.insert_image(page.rect, stream=pixmap.tobytes("png"))
        try:
            profile = profile_document(document)
        finally:
            document.close()

        self.assertEqual(profile["document_kind"], "scanned")
        self.assertEqual(profile["ocr_pages"], [1])
        self.assertIn("no_reliable_text_layer", profile["escalation_reasons"])

    def test_hybrid_document_and_solution_role(self):
        document = fitz.open()
        digital = document.new_page(width=595, height=842)
        digital.insert_textbox(
            fitz.Rect(48, 48, 547, 790),
            "SOLUTIONS\n1) Explain Question\nSolution: " + ("worked reasoning " * 35),
            fontsize=11,
        )
        scanned = document.new_page(width=595, height=842)
        pixmap = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 595, 842), 0)
        pixmap.clear_with(250)
        scanned.insert_image(scanned.rect, stream=pixmap.tobytes("png"))
        try:
            profile = profile_document(document)
        finally:
            document.close()

        self.assertEqual(profile["document_kind"], "hybrid")
        self.assertEqual(profile["solution_pages"], [1, 2])
        self.assertEqual(profile["ocr_pages"], [2])


if __name__ == "__main__":
    unittest.main()
