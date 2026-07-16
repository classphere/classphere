import os
import re
import sys
import json
import fitz
from pathlib import Path
from dotenv import load_dotenv

# Force stdout/stderr to use UTF-8 encoding on Windows to prevent console print crashes
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv()

from cerebras.cloud.sdk import Cerebras

# ── Setup ─────────────────────────────────────────────────────────────────────
if len(sys.argv) < 3:
    print("Usage: python parse_pdf_answer_key.py <pdf_path> <output_json_path>")
    sys.exit(1)

PDF_PATH = Path(sys.argv[1]).resolve()
OUTPUT_JSON = Path(sys.argv[2]).resolve()

# Load Cerebras keys
KEYS_FILE = Path(__file__).parent / "api_keys.txt"
api_keys = []
if KEYS_FILE.exists():
    api_keys = [k.strip() for k in KEYS_FILE.read_text().splitlines()
                if k.strip() and not k.startswith("#")]
if not api_keys and os.environ.get("CEREBRAS_API_KEY"):
    api_keys.append(os.environ["CEREBRAS_API_KEY"])

clients = [Cerebras(api_key=k) for k in api_keys]
client_idx = 0

def get_client():
    global client_idx
    if not clients:
        raise Exception("ALL API KEYS EXHAUSTED.")
    c = clients[client_idx % len(clients)]
    client_idx += 1
    return c

def remove_exhausted_key(client_to_remove):
    if client_to_remove in clients:
        clients.remove(client_to_remove)
        print(f"Removed exhausted key. {len(clients)} keys remaining.")

# ── Extract final pages text ──────────────────────────────────────────────────
doc = fitz.open(str(PDF_PATH))
total_pages = len(doc)
pages_to_read = min(3, total_pages)  # Read last 3 pages

combined_text = ""
for idx in range(total_pages - pages_to_read, total_pages):
    page_text = doc[idx].get_text()
    combined_text += f"\n--- PAGE {idx + 1} ---\n{page_text}"

print(f"[parse_pdf_answer_key] Read last {pages_to_read} pages of PDF (total {total_pages} pages)")

# ── Cerebras extraction ───────────────────────────────────────────────────────
PROMPT = """You are an AI answer key extractor. 
Below is the text extracted from the final pages of a competitive exam test paper PDF. 
Find the answer key / solution key (which maps question numbers to their corresponding correct options/answers).
Extract the mappings and return them as a clean JSON dictionary where keys are question numbers (as strings) and values are lists of correct options (e.g. ["A"], ["B", "C"]) or numerical integers (e.g. ["42"] or ["-3"]).

Example Input:
"ANSWER KEY
1. (A)  2. (B)  3. (C)  4. (D)
5. (A,C)  6. 42  7. (B)
Numerical Section:
8. 15  9. -2"

Example Output:
{
  "1": ["A"],
  "2": ["B"],
  "3": ["C"],
  "4": ["D"],
  "5": ["A", "C"],
  "6": ["42"],
  "7": ["B"],
  "8": ["15"],
  "9": ["-2"]
}

If no answer key table or solution section is found in the text, return an empty JSON object:
{}

Return ONLY valid JSON. No markdown blocks, no code fences, no explanation, no other text.
"""

def clean_raw_json_response(raw) -> str:
    """State-machine JSON cleaner: fixes unescaped backslashes and control chars inside strings only."""
    if not raw:
        return "{}"
    raw = str(raw).strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines).strip()

    # Fast path
    try:
        json.loads(raw)
        return raw
    except (json.JSONDecodeError, ValueError):
        pass

    VALID_JSON_ESCAPES = {'"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'}
    result = []
    in_string = False
    i = 0
    n = len(raw)

    while i < n:
        ch = raw[i]
        if not in_string:
            result.append(ch)
            if ch == '"':
                in_string = True
            i += 1
        else:
            if ch == '\\':
                nxt = raw[i + 1] if i + 1 < n else ''
                if nxt in VALID_JSON_ESCAPES:
                    result.append(ch)
                    result.append(nxt)
                    i += 2
                    if nxt == 'u' and i + 4 <= n:
                        result.extend(raw[i:i + 4])
                        i += 4
                else:
                    result.append('\\\\')
                    i += 1
            elif ch == '"':
                result.append(ch)
                in_string = False
                i += 1
            elif ch == '\n':
                result.append('\\n')
                i += 1
            elif ch == '\r':
                result.append('\\r')
                i += 1
            elif ch == '\t':
                result.append('\\t')
                i += 1
            elif ord(ch) < 0x20:
                result.append(f'\\u{ord(ch):04x}')
                i += 1
            else:
                result.append(ch)
                i += 1

    return "".join(result)

def call_cerebras(text):
    client = get_client()
    try:
        resp = client.chat.completions.create(
            model="gpt-oss-120b",
            messages=[
                {"role": "system", "content": PROMPT},
                {"role": "user", "content": text}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=2000,
        )
    except Exception as e:
        # Remove the client that actually failed (the rotation index has
        # already advanced, so indexing by client_idx removed the WRONG key).
        if "402" in str(e) or "payment_required" in str(e) or "429" in str(e):
            remove_exhausted_key(client)
        raise
    return resp.choices[0].message.content

# ── Run ───────────────────────────────────────────────────────────────────────
retries = 3
success = False
result = {}

for attempt in range(retries):
    try:
        raw_output = call_cerebras(combined_text)
        cleaned = clean_raw_json_response(raw_output)
        result = json.loads(cleaned)
        success = True
        break
    except Exception as e:
        print(f"[parse_pdf_answer_key] Attempt {attempt + 1} failed: {e}")

if success:
    print(f"[parse_pdf_answer_key] Successfully extracted answer key with {len(result)} entries.")
else:
    print("[parse_pdf_answer_key] Failed to extract answer key. Outputting empty mapping.")
    result = {}

OUTPUT_JSON.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(f"[parse_pdf_answer_key] Output written to {OUTPUT_JSON}")
