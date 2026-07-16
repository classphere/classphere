"""
make_test_pdfs.py
==================
Generates synthetic JEE/NEET-style PDFs that reproduce the layout patterns the
extraction pipeline must handle. Used by run_harness.py to regression-test the
deterministic layers (no LLM involved).

Patterns covered:
  1. Two-column layout with a vertical divider rule
  2. Superscripts/subscripts rendered as separate small raised/lowered spans
  3. Stacked fractions (numerator / bar line / denominator)
  4. Vector-drawn diagrams (lines + circles) with short text labels inside
  5. Raster-image options placed after option labels
  6. A question split across a page boundary (stem on p1, options on p2)
  7. Section headers: subject (PHYSICS) and type (SECTION-B Numerical)
  8. Watermark text lines
  9. Two numbering styles: "Question No. N" and plain "N."
 10. A repeated logo image on every page (must be filtered as boilerplate)

Usage:
    python tests/make_test_pdfs.py [<out_dir>]
Writes: <out_dir>/test_qno_style.pdf, <out_dir>/test_plain_style.pdf,
        <out_dir>/expected.json  (ground-truth expectations)
"""

import io
import json
import sys
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageDraw

PAGE_W, PAGE_H = 595, 842  # A4 points
LEFT_X0, LEFT_X1 = 36, 280
RIGHT_X0, RIGHT_X1 = 315, 559
MID_X = PAGE_W / 2
BODY_SIZE = 9.5
SUP_SIZE = 6.0

FONT = "helv"


def make_raster(color: str, label: str) -> bytes:
    """Small distinct PNG used as an option image."""
    img = Image.new("RGB", (120, 80), color)
    d = ImageDraw.Draw(img)
    d.rectangle([4, 4, 115, 75], outline="black", width=2)
    d.text((10, 30), label, fill="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


LOGO_BYTES = make_raster("#dddddd", "LOGO")
OPT_IMGS = {k: make_raster(c, f"GRAPH {k}")
            for k, c in zip("ABCD", ["#ffcccc", "#ccffcc", "#ccccff", "#ffffcc"])}


class Col:
    """Cursor for writing lines down a column."""

    def __init__(self, page, x0, x1, y=95):
        self.page, self.x0, self.x1, self.y = page, x0, x1, y

    def text(self, s, size=BODY_SIZE, dx=0, bold=False):
        f = "hebo" if bold else FONT
        self.page.insert_text((self.x0 + dx, self.y), s, fontsize=size, fontname=f)
        self.y += size * 1.45
        return self

    def gap(self, h=6):
        self.y += h
        return self

    def rich(self, parts, size=BODY_SIZE, dx=0):
        """Write one visual line from (text, kind) parts.
        kind: '' normal, 'sup' raised small, 'sub' lowered small."""
        x = self.x0 + dx
        base_y = self.y
        for txt, kind in parts:
            if kind == "sup":
                self.page.insert_text((x, base_y - size * 0.42), txt, fontsize=SUP_SIZE, fontname=FONT)
                x += fitz.get_text_length(txt, fontname=FONT, fontsize=SUP_SIZE) + 1
            elif kind == "sub":
                self.page.insert_text((x, base_y + size * 0.30), txt, fontsize=SUP_SIZE, fontname=FONT)
                x += fitz.get_text_length(txt, fontname=FONT, fontsize=SUP_SIZE) + 1
            else:
                self.page.insert_text((x, base_y), txt, fontsize=size, fontname=FONT)
                x += fitz.get_text_length(txt, fontname=FONT, fontsize=size)
        self.y += size * 1.5
        return self

    def fraction(self, prefix, num, den, suffix="", size=BODY_SIZE):
        """Write 'prefix  num/den  suffix' with a real stacked fraction."""
        x = self.x0
        mid_y = self.y
        if prefix:
            self.page.insert_text((x, mid_y), prefix, fontsize=size, fontname=FONT)
            x += fitz.get_text_length(prefix, fontname=FONT, fontsize=size) + 4
        w = max(fitz.get_text_length(num, fontname=FONT, fontsize=size),
                fitz.get_text_length(den, fontname=FONT, fontsize=size)) + 4
        # numerator above, denominator below, bar between
        self.page.insert_text((x + 2, mid_y - size * 0.45), num, fontsize=size * 0.85, fontname=FONT)
        bar_y = mid_y - size * 0.30
        self.page.draw_line(fitz.Point(x, bar_y), fitz.Point(x + w, bar_y), width=0.7)
        self.page.insert_text((x + 2, mid_y + size * 0.62), den, fontsize=size * 0.85, fontname=FONT)
        x += w + 4
        if suffix:
            self.page.insert_text((x, mid_y), suffix, fontsize=size, fontname=FONT)
        self.y += size * 2.3
        return self

    def image(self, png_bytes, w=80, h=54):
        rect = fitz.Rect(self.x0, self.y, self.x0 + w, self.y + h)
        self.page.insert_image(rect, stream=png_bytes)
        self.y += h + 6
        return self

    def diagram(self):
        """Vector circuit-ish diagram with short text labels inside."""
        x0, y0 = self.x0 + 10, self.y
        p = self.page
        p.draw_rect(fitz.Rect(x0, y0, x0 + 150, y0 + 80), width=1)
        p.draw_line(fitz.Point(x0, y0 + 40), fitz.Point(x0 + 40, y0 + 40), width=1)
        p.draw_circle(fitz.Point(x0 + 60, y0 + 40), 12, width=1)
        p.draw_line(fitz.Point(x0 + 72, y0 + 40), fitz.Point(x0 + 150, y0 + 40), width=1)
        p.draw_line(fitz.Point(x0 + 100, y0 + 15), fitz.Point(x0 + 100, y0 + 65), width=1)
        p.insert_text((x0 + 4, y0 + 12), "A", fontsize=7, fontname=FONT)
        p.insert_text((x0 + 140, y0 + 12), "B", fontsize=7, fontname=FONT)
        p.insert_text((x0 + 55, y0 + 75), "y", fontsize=7, fontname=FONT)
        self.y += 92
        return self


def page_chrome(page, subject=None, watermark=True):
    page.insert_image(fitz.Rect(PAGE_W - 70, 14, PAGE_W - 20, 46), stream=LOGO_BYTES)
    page.insert_text((36, 40), "ACME TEST SERIES - JEE MAIN FULL TEST", fontsize=11, fontname="hebo")
    if subject:
        page.insert_text((36, 66), subject, fontsize=12, fontname="hebo")
    page.draw_line(fitz.Point(MID_X, 85), fitz.Point(MID_X, PAGE_H - 40), width=0.5)
    if watermark:
        page.insert_text((200, PAGE_H - 25), "By: C I P H E R", fontsize=8, fontname=FONT)


def qheader(col, n, style, hint=""):
    if style == "qno":
        col.text(f"Question No. {n}{('  ' + hint) if hint else ''}", bold=True)
    else:
        col.text(f"{n}. {hint}".rstrip(), bold=True)


def build_pdf(style: str, out_path: Path):
    doc = fitz.open()

    # ── PAGE 1 ──────────────────────────────────────────────────────────
    pg = doc.new_page(width=PAGE_W, height=PAGE_H)
    page_chrome(pg, subject="PHYSICS")

    L = Col(pg, LEFT_X0, LEFT_X1)
    R = Col(pg, RIGHT_X0, RIGHT_X1)

    # Q1: separated superscripts (10^3, cm^2, 10^-2)
    qheader(L, 1, style)
    L.rich([("A metal plate of area 10", ""), ("3", "sup"), (" cm", ""), ("2", "sup")])
    L.rich([("rests on oil 6 mm thick. A tangential", "")])
    L.rich([("force of 10", ""), ("-2", "sup"), (" N moves it at 6 cm s", ""), ("-1", "sup"), (".", "")])
    L.text("The coefficient of viscosity is")
    L.text("(A) 0.1 poise")
    L.text("(B) 0.5 poise")
    L.text("(C) 0.7 poise")
    L.text("(D) 0.9 poise")
    L.gap()

    # Q2: stacked fractions in options + subscript in stem
    qheader(L, 2, style)
    L.rich([("If a", ""), ("1", "sub"), (", a", ""), ("2", "sub"),
            (", ... are in A.P. and the common", "")])
    L.text("difference is d, then x equals")
    L.fraction("(A)", "-3", "2")
    L.fraction("(B)", "-7", "3")
    L.fraction("(C) ", "√5", "12")   # sqrt5 / 12
    L.fraction("(D)", "-5", "4")

    # Q3 (right column): vector diagram in stem, text options
    qheader(R, 3, style)
    R.text("In the circuit shown, the equivalent")
    R.text("resistance between A and B is")
    R.diagram()
    R.text("(A) 2 ohm")
    R.text("(B) 4 ohm")
    R.text("(C) 6 ohm")
    R.text("(D) 8 ohm")
    R.gap()

    # Q4 (right column): all-image options
    qheader(R, 4, style)
    R.text("Which graph shows the correct V-I")
    R.text("characteristic of the diode?")
    R.text("(A)")
    R.image(OPT_IMGS["A"])
    R.text("(B)")
    R.image(OPT_IMGS["B"])
    R.text("(C)")
    R.image(OPT_IMGS["C"])
    R.text("(D)")
    R.image(OPT_IMGS["D"])

    # Q5: stem starts at bottom of page-1 right column, options on page 2
    qheader(R, 5, style)
    R.rich([("A charge q is placed at distance r from a dipole of moment p × 10", ""), ("6", "sup")])
    R.text("C m. The force on the charge is")

    # ── PAGE 2 ──────────────────────────────────────────────────────────
    pg2 = doc.new_page(width=PAGE_W, height=PAGE_H)
    page_chrome(pg2)
    L2 = Col(pg2, LEFT_X0, LEFT_X1)
    R2 = Col(pg2, RIGHT_X0, RIGHT_X1)

    # continuation of Q5 (options only, no header)
    L2.rich([("(A) 6Kpq/r", ""), ("3", "sup")])
    L2.rich([("(B) 3Kpq/r", ""), ("3", "sup")])
    L2.rich([("(C) 2Kpq/r", ""), ("2", "sup")])
    L2.rich([("(D) Kpq/r", ""), ("2", "sup")])
    L2.gap(10)

    # Q6: assertion-reason (still in SECTION-A / MCQ territory)
    qheader(L2, 6, style)
    L2.text("Assertion (A): Work done by a")
    L2.text("conservative force in a closed loop is zero.")
    L2.text("Reason (R): Conservative force depends")
    L2.text("only on end points.")
    L2.text("(A) Both A and R true, R explains A")
    L2.text("(B) Both A and R true, R does not explain A")
    L2.text("(C) A true, R false")
    L2.text("(D) A false, R true")
    L2.gap(10)

    # SECTION-B header (crosses the column divider → classified full-width)
    pg2.insert_text((180, L2.y), "SECTION-B (Numerical Value Type)", fontsize=11, fontname="hebo")
    L2.y += 26
    R2.y = L2.y

    # Q7: numerical, chemistry-style subscripts H2O
    qheader(L2, 7, style, hint="(Numerical Value Type)" if style == "qno" else "")
    L2.rich([("The number of moles of H", ""), ("2", "sub"), ("O produced when 2 mol of", "")])
    L2.rich([("H", ""), ("2", "sub"), ("SO", ""), ("4", "sub"),
             (" reacts completely is ______.", "")])
    L2.gap()

    # Q8: numerical with fraction in stem (right column, below SECTION-B)
    qheader(R2, 8, style)
    R2.fraction("The value of", "22", "7", "rounded to nearest integer is ____.")

    doc.save(str(out_path))
    doc.close()


EXPECTED = {
    "n_questions": 8,
    "questions": {
        "1": {"sup_fragments": ["10<sup>3</sup>", "cm<sup>2</sup>", "10<sup>-2</sup>", "s<sup>-1</sup>"],
              "n_options": 4, "type": "MCQ"},
        "2": {"frac_fragments": [["-3", "2"], ["-7", "3"], ["√5", "12"], ["-5", "4"]],
              "sub_fragments": ["a<sub>1</sub>", "a<sub>2</sub>"],
              "n_options": 4, "type": "MCQ"},
        "3": {"stem_diagram": True, "n_options": 4, "type": "MCQ"},
        "4": {"image_options": ["A", "B", "C", "D"], "n_options": 4, "type": "MCQ"},
        "5": {"cross_page": True, "n_options": 4, "type": "MCQ",
              "sup_fragments": ["10<sup>6</sup>", "r<sup>3</sup>", "r<sup>2</sup>"]},
        "6": {"n_options": 4, "type": "Assertion-Reason"},
        "7": {"sub_fragments": ["H<sub>2</sub>O", "SO<sub>4</sub>"], "n_options": 0, "type": "Numerical"},
        "8": {"frac_fragments": [["22", "7"]], "n_options": 0, "type": "Numerical"},
    },
    "boilerplate_images_filtered": True,
    "watermark_filtered": True,
}


def main():
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    build_pdf("qno", out_dir / "test_qno_style.pdf")
    build_pdf("plain", out_dir / "test_plain_style.pdf")
    (out_dir / "expected.json").write_text(json.dumps(EXPECTED, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote test PDFs + expected.json to {out_dir}")


if __name__ == "__main__":
    main()
