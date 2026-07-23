"""
merge_extractions.py
====================
Best-of-both merge of a PyMuPDF extraction and a Marker (escalation) extraction.

Neither source dominates every question: Marker recovers vector-drawn math
(fractions, binomials, matrices) that PyMuPDF's text path garbles, but Marker
occasionally OCR-drifts and drops options on a question PyMuPDF got right. So we
choose PER QUESTION:

  • fewer structural errors wins (diagnose_question error count)
  • tie  → Marker (on a paper that triggered escalation, Marker is the more
           trustworthy source for math content; captures the semantically-wrong-
           but-structurally-valid cases like 1/x → x^1 that error counts miss)
  • a source missing that question → use the other

Each chosen question's referenced images are copied into the merged images dir,
so the final JSON's image references all resolve in one place.

Usage:
    python merge_extractions.py --pymupdf DIR_P --marker DIR_M --out DIR_OUT
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from extract_common import diagnose_question, _referenced_images

MD_IMG_RE = re.compile(r'!\[[^\]]*\]\(([^)]+)\)')


def load(dir_path: Path):
    j = dir_path / "all_extracted_data.json"
    if not j.exists():
        return {}, None
    qs = json.load(open(j, encoding="utf-8")).get("questions", [])
    return {q.get("question_number"): q for q in qs}, dir_path / "marker_images"


def error_count(q, images_dir):
    avail = None
    if images_dir and images_dir.exists():
        avail = {p.name for p in images_dir.iterdir() if p.is_file()}
    errs, _ = diagnose_question(q, available_images=avail)
    return len(errs)


def _native_refs(text: str):
    """Ordered ![image](native_…) references — PyMuPDF's full-fidelity embedded
    images (NOT vector_ crops, which are math-as-picture that Marker's LaTeX
    replaces)."""
    return [r for r in MD_IMG_RE.findall(text or "")
            if r.replace("\\", "/").split("/")[-1].startswith("native_")]


def prefer_native_images(mq: dict, pq: dict) -> dict:
    """Chosen text is Marker's, but PyMuPDF's native embedded images are higher
    fidelity (no JPG artefacts, no watermark bleed). Swap PyMuPDF native images
    into the Marker question BY SLOT (stem, and each option id) whenever the
    counts line up. Vector_ crops are never swapped in — those are drawn math
    Marker already converted to LaTeX. Slots with no PyMuPDF native keep Marker's
    image (a figure PyMuPDF didn't have)."""
    if pq is None:
        return mq

    def swap_in(text_m, text_p):
        m_imgs = MD_IMG_RE.findall(text_m or "")
        p_nat = _native_refs(text_p)
        if p_nat and len(p_nat) == len(m_imgs) and m_imgs:
            out = text_m
            for mref, pref in zip(m_imgs, p_nat):
                out = out.replace(f"]({mref})", f"]({pref})", 1)
            return out
        return text_m

    mq["question_text"] = swap_in(mq.get("question_text", ""), pq.get("question_text", ""))

    p_opts = {o.get("id"): o for o in pq.get("options", []) or []}
    for o in mq.get("options", []) or []:
        po = p_opts.get(o.get("id"))
        if not po:
            continue
        # option native image lives either in text markdown or image_url
        p_nat = _native_refs(po.get("text", ""))
        if not p_nat:
            iu = (po.get("image_url") or "")
            if iu.replace("\\", "/").split("/")[-1].startswith("native_"):
                p_nat = [iu]
        m_imgs = MD_IMG_RE.findall(o.get("text", ""))
        if p_nat and len(p_nat) == len(m_imgs) and m_imgs:
            for mref, pref in zip(m_imgs, p_nat):
                o["text"] = o["text"].replace(f"]({mref})", f"]({pref})", 1)
            if o.get("image_url"):
                o["image_url"] = p_nat[0]
    return mq


def _live_refs(q):
    """Image refs from the AUTHORITATIVE post-swap fields (text + option
    image_url) — NOT the question_images[] arrays, which may still hold stale
    pre-swap hashes until normalize regenerates them."""
    refs = list(MD_IMG_RE.findall(q.get("question_text", "") or ""))
    refs += MD_IMG_RE.findall(q.get("explanation", "") or "")
    for o in q.get("options", []) or []:
        refs += MD_IMG_RE.findall(o.get("text", "") or "")
        if o.get("image_url"):
            refs.append(o["image_url"])
    return refs


def copy_question_images(q, src_images: Path, alt_images: Path, dst_images: Path):
    """Copy every image the question references from whichever source dir holds
    it (PyMuPDF native/vector live in one dir, Marker hashes in the other)."""
    dst_images.mkdir(parents=True, exist_ok=True)
    for ref in set(_live_refs(q)):
        name = ref.replace("\\", "/").split("/")[-1]
        if not name or name.startswith("data:"):
            continue
        for src_dir in (src_images, alt_images):
            src = src_dir / name if src_dir else None
            if src and src.exists():
                try:
                    shutil.copy(src, dst_images / name)
                except Exception:
                    pass
                break


def main():
    ap = argparse.ArgumentParser(description="Merge PyMuPDF + Marker extractions")
    ap.add_argument("--pymupdf", required=True)
    ap.add_argument("--marker", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    P, P_imgs = load(Path(args.pymupdf))
    M, M_imgs = load(Path(args.marker))
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_imgs = out_dir / "marker_images"

    if not P and not M:
        print("Nothing to merge (both empty).")
        sys.exit(1)
    if not M:                    # Marker failed → just copy PyMuPDF through
        print("Marker result empty — using PyMuPDF as-is.")
        shutil.copytree(Path(args.pymupdf), out_dir, dirs_exist_ok=True)
        return

    all_nums = sorted(set(P) | set(M))
    merged, picks = [], {"pymupdf": 0, "marker": 0}
    detail = []

    native_swaps = 0
    for n in all_nums:
        qp, qm = P.get(n), M.get(n)
        if qp is None:
            chosen, src_imgs, tag = qm, M_imgs, "marker"
        elif qm is None:
            chosen, src_imgs, tag = qp, P_imgs, "pymupdf"
        else:
            ep = error_count(qp, P_imgs)
            em = error_count(qm, M_imgs)
            p_refs = _live_refs(qp)
            m_refs = _live_refs(qm)

            # DIGITAL-PDF IMAGE POLICY (hard invariant): if either source says
            # the question contains an image/diagram and a PyMuPDF question is
            # available, choose the complete PyMuPDF question. This guarantees
            # every final image comes from the original digital PDF extraction
            # (native_ or vector_ file), never from a lower-fidelity Marker OCR
            # crop. Scanned PDFs never enter this merge path; they use Marker
            # directly, so Marker cropped images remain correct for scans.
            if p_refs or m_refs:
                chosen, src_imgs, tag = qp, P_imgs, "pymupdf"
            elif ep < em:                     # PyMuPDF strictly better → keep it
                chosen, src_imgs, tag = qp, P_imgs, "pymupdf"
            elif em < ep:                     # Marker strictly better → keep it
                chosen, src_imgs, tag = qm, M_imgs, "marker"
            else:
                # TIE: prefer PyMuPDF for digital PDFs — its text comes from
                # the actual text layer (clean, no OCR drift).
                chosen, src_imgs, tag = qp, P_imgs, "pymupdf"
            if tag == "marker" and em != ep:
                detail.append(f"Q{n}: marker (errs {ep}->{em})")
            elif tag == "pymupdf" and ep != em:
                detail.append(f"Q{n}: pymupdf (errs {em}->{ep})")

        # IMAGES: always prefer PyMuPDF's native embedded images (best source).
        if tag == "marker" and qp is not None:
            before = json.dumps(chosen)
            chosen = prefer_native_images(chosen, qp)
            if json.dumps(chosen) != before:
                native_swaps += 1

        picks[tag] += 1
        # chosen text may now reference both P natives and M hashes → search both dirs
        copy_question_images(chosen, src_imgs, P_imgs if src_imgs is M_imgs else M_imgs, out_imgs)
        merged.append(chosen)

    merged.sort(key=lambda q: q.get("question_number", 0))
    (out_dir / "all_extracted_data.json").write_text(
        json.dumps({"questions": merged}, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Merged {len(merged)} questions: {picks['marker']} text from Marker, "
          f"{picks['pymupdf']} text from PyMuPDF")
    print(f"  native-image swaps (kept PyMuPDF's embedded images): {native_swaps}")
    if detail:
        print("  error-count wins:", "; ".join(detail[:20]))
    print(f"Output: {out_dir/'all_extracted_data.json'}")


if __name__ == "__main__":
    main()
