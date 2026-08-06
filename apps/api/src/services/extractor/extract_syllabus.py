#!/usr/bin/env python3
"""Extract chapter/topic structure from JEE/NEET syllabus PDFs."""
import fitz, sys, json

def extract(path, max_pages=None):
    doc = fitz.open(path)
    pages = range(len(doc)) if not max_pages else range(min(max_pages, len(doc)))
    return "\n".join(doc[i].get_text() for i in pages)

neet  = extract(r"C:\Users\Harsh\.gemini\antigravity-ide\brain\0f3152e7-2cfc-4c55-b911-a773cf2d6f3f\.tempmediaStorage\e4f324aa726d15e0.pdf")
jadv  = extract(r"C:\Users\Harsh\.gemini\antigravity-ide\brain\0f3152e7-2cfc-4c55-b911-a773cf2d6f3f\.tempmediaStorage\60fff1ca6d6a3b27.pdf")
jmain = extract(r"C:\Users\Harsh\.gemini\antigravity-ide\brain\0f3152e7-2cfc-4c55-b911-a773cf2d6f3f\.tempmediaStorage\19c478af1214ea15.pdf", max_pages=11)

print("=== NEET ===")
print(neet[:10000])
print("\n=== JEE ADV ===")
print(jadv[:10000])
print("\n=== JEE MAIN ===")
print(jmain[:10000])
