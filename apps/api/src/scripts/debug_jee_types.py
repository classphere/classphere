import json, sys
sys.stdout.reconfigure(encoding='utf-8')
data = json.load(open(r'D:\classphere\apps\api\apps\api\temp\extract_1784205291593_uiufkn\extracted_data\all_extracted_data.json', encoding='utf-8'))
qs = data['questions']
num_qs = len(qs)
is_neet = num_qs > 120 or any(q.get('subject','').lower() in ('biology','botany','zoology') for q in qs)
print('num_qs:', num_qs, '  is_neet:', is_neet)
print('60 <= num_qs <= 95:', 60 <= num_qs <= 95)
# Check what types Q21-25 and Q46-50 are
for q in qs:
    n = q.get('question_number', 0)
    if (21 <= n <= 25) or (46 <= n <= 50):
        t = q.get('question_type')
        o = len(q.get('options', []))
        print(f'Q{n}: type={t}  opts={o}')
