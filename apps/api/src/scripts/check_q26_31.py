import json, sys
sys.stdout.reconfigure(encoding='utf-8')
data = json.load(open(r'D:\classphere\apps\api\apps\api\temp\extract_1784205291593_uiufkn\extracted_data\all_extracted_data.json', encoding='utf-8'))
qs = {q['question_number']: q for q in data['questions']}
for n in [26, 27, 28, 29, 30, 31]:
    q = qs.get(n)
    if not q:
        print(f'Q{n}: MISSING')
        continue
    t = q.get('question_type')
    o = len(q.get('options', []))
    txt = q.get('question_text', '')
    print(f"Q{n}: type={t}  opts={o}")
    print(f"  text: {repr(txt[:150])}")
    for opt in q.get('options', []):
        print(f"  ({opt['id']}) {repr(opt.get('text','')[:60])}")
    print()
