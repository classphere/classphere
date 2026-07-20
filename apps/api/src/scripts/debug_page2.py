"""
Debug what the LLM actually outputs for page 2 (which consistently fails).
We intercept the clean function and print what it tries to parse.
"""
import sys
import os
import json
import re
sys.path.insert(0, r'D:\classphere\apps\api\src\services\extractor')
sys.stdout.reconfigure(encoding='utf-8')

# Patch clean_raw_json_response to be verbose
original_clean = None

def verbose_clean(raw):
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
    
    # Apply the regex fix
    fixed = re.sub(r'\\(?!["\\\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', raw)
    
    # Try to parse
    try:
        json.loads(fixed)
        print("  JSON parse: SUCCESS")
        return fixed
    except json.JSONDecodeError as e:
        print(f"  JSON parse FAILED: {e}")
        # Show context around error
        lines = fixed.splitlines()
        if e.lineno <= len(lines):
            print(f"  Line {e.lineno}: {repr(lines[e.lineno-1][:120])}")
        return "{}"

# Read the existing marker_raw.json
import json as _json
raw = _json.load(open(r'D:\classphere\apps\api\apps\api\temp\extract_1784205291593_uiufkn\extracted_data\marker_raw.json', encoding='utf-8'))
pages = raw['json']['children']

# Print page 2 HTML
page2 = pages[1]
html = page2.get('html', '')
print(f"=== Page 2 HTML ({len(html)} chars) ===")
print(html)
print()
print("=== Line count:", len(html.splitlines()))
