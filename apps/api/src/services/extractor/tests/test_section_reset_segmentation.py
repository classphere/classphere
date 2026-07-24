import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from extract_common import segment_questions


def question(number: int, label: str) -> str:
    return "\n".join([
        f'<p data-qcand="{number}">{number}. {label}</p>',
        '<p>(A) one</p>',
        '<p>(B) two</p>',
        '<p>(C) three</p>',
        '<p>(D) four</p>',
    ])


class SectionResetSegmentationTests(unittest.TestCase):
    def setUp(self):
        self.previous = os.environ.get("PDF_EXTRACTOR_V4")

    def tearDown(self):
        if self.previous is None:
            os.environ.pop("PDF_EXTRACTOR_V4", None)
        else:
            os.environ["PDF_EXTRACTOR_V4"] = self.previous

    def test_v4_keeps_all_local_numbering_runs_and_renumbers_globally(self):
        os.environ["PDF_EXTRACTOR_V4"] = "true"
        pages = [{"html": "\n".join([
            '<p>SECTION 1 - Physics [SINGLE CORRECT TYPE]</p>',
            question(1, "physics one"),
            question(2, "physics two"),
            '<p>SECTION 2 - Physics [NUMERICAL VALUE TYPE]</p>',
            question(1, "physics numerical one"),
            question(2, "physics numerical two"),
            '<p>SECTION 1 - Chemistry [SINGLE CORRECT TYPE]</p>',
            question(1, "chemistry one"),
        ])}]

        blocks, _ = segment_questions(pages)
        self.assertEqual([block["qnum"] for block in blocks], [1, 2, 3, 4, 5])
        self.assertEqual([block["source_qnum"] for block in blocks], [1, 2, 1, 2, 1])
        self.assertIn("chemistry one", blocks[-1]["html"])

    def test_v4_preserves_global_numbers_when_sections_do_not_reset(self):
        os.environ["PDF_EXTRACTOR_V4"] = "true"
        pages = [{"html": "\n".join([
            '<p>SECTION 1 - Physics [SINGLE CORRECT TYPE]</p>',
            question(1, "one"),
            question(2, "two"),
            '<p>SECTION 2 - Physics [MULTIPLE CORRECT TYPE]</p>',
            question(3, "three"),
            question(4, "four"),
        ])}]
        blocks, _ = segment_questions(pages)
        self.assertEqual([block["qnum"] for block in blocks], [1, 2, 3, 4])
        self.assertEqual([block["source_qnum"] for block in blocks], [1, 2, 3, 4])

    def test_legacy_flag_off_retains_single_chain_behavior(self):
        os.environ.pop("PDF_EXTRACTOR_V4", None)
        pages = [{"html": "\n".join([
            '<p>SECTION 1 - Physics [SINGLE CORRECT TYPE]</p>',
            question(1, "first one"),
            question(2, "first two"),
            '<p>SECTION 2 - Physics [NUMERICAL VALUE TYPE]</p>',
            question(1, "second one"),
            question(2, "second two"),
        ])}]
        blocks, _ = segment_questions(pages)
        self.assertEqual([block["qnum"] for block in blocks], [1, 2])


if __name__ == "__main__":
    unittest.main()
