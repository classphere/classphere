"""
Test what exact escape sequences are failing the JSON parser.
"""
import json
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Simulate what the LLM outputs for a math-heavy page
test_cases = [
    # Case 1: LaTeX \frac - \f is valid JSON escape (form feed) but \r is valid too
    # The issue is \f followed by 'r' - \f is valid but the whole \frac seems wrong
    # Actually in JSON: \f = form feed (valid). \frac should be \\frac
    r'{"text": "The integral \frac{1}{2}"}',  # \f is valid JSON escape! \r too! But \a, \c are not
    
    # Case 2: What actually fails - \i, \s, etc
    r'{"text": "intersection \in and \subset"}',  # \i is invalid JSON escape
    r'{"text": "$\sqrt{x}$ and $\alpha$"}',  # \s, \a are invalid
    r'{"text": "use \vec{F} and \hat{i}"}',  # \v, \h are invalid
    r'{"text": "x^{2} + \omega t"}',  # \o is invalid
    r'{"text": "let A \cap B"}',  # \c is invalid
    r'{"text": "find x \ge 0"}',  # \g is invalid
    r'{"text": "y \le x"}',  # \l is invalid
    r'{"text": "\pi r^2"}',  # \p is invalid
    r'{"text": "\theta = 30"}',  # \t IS valid JSON escape (tab)! But we don't want it here
]

current_regex = re.compile(r'\\(?!["\\\\/bfnrt]|u[0-9a-fA-F]{4})')

for tc in test_cases:
    fixed = current_regex.sub(r'\\\\', tc)
    try:
        obj = json.loads(fixed)
        print(f"OK after fix: {repr(tc[:50])}")
    except json.JSONDecodeError as e:
        print(f"STILL FAILS: {repr(tc[:50])} -> {e}")
        # Try to find what's still wrong
        try:
            obj = json.loads(tc)
            print(f"  (Actually original parses fine)")
        except json.JSONDecodeError as e2:
            print(f"  Original error: {e2}")
