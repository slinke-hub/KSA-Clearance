"""Import the supplied fixed-layout SASO notice, checking every code is captured."""
import hashlib, json, re, shutil, sys
from datetime import datetime, timezone
from urllib.request import urlopen
from pathlib import Path
import pdfplumber
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
source_url = 'https://saber.sa/Assets/Home/hscodes-8-2026.pdf'
# Always import from the official URL; never from the former user upload.
with urlopen(source_url, timeout=60) as response:
    if response.geturl() != source_url:
        raise ValueError('Unexpected source redirect; review before importing')
    content = response.read(20 * 1024 * 1024 + 1)
if len(content) > 20 * 1024 * 1024 or not content.startswith(b'%PDF-'):
    raise ValueError('Source is not a supported PDF')
source = root / 'scratch' / 'saber-hs-reference.pdf'
source.parent.mkdir(parents=True, exist_ok=True)
source.write_bytes(content)
retrieved_at = datetime.now(timezone.utc).isoformat()
target = root / 'public' / 'references' / 'hscodes-8-2026.pdf'
records = []
previous = {}
with pdfplumber.open(source) as pdf:
    for number, page in enumerate(pdf.pages, 1):
        replacement = 16 <= number <= 32 or number == 41
        columns = 7 if replacement else 6
        clusters = []
        for edge in sorted((e for e in page.edges if e['orientation'] == 'v' and e['height'] > 20), key=lambda e: e['x0']):
            if not clusters or edge['x0'] - clusters[-1][-1]['x0'] > 8: clusters.append([])
            clusters[-1].append(edge)
        boundaries = [sum(e['x0'] * e['height'] for e in c) / sum(e['height'] for e in c) for c in sorted(sorted(clusters, key=lambda c: sum(e['height'] for e in c), reverse=True)[:columns], key=lambda c: c[0]['x0'])]
        if len(boundaries) != columns: raise ValueError(f'Unexpected column boundaries on page {number}: {boundaries}')
        tables = page.extract_tables({'vertical_strategy': 'explicit',
            'explicit_vertical_lines': boundaries, 'horizontal_strategy': 'lines'})
        for table in tables:
            for cells in table:
                values = [re.sub(r'\s+', ' ', cell or '').strip() for cell in cells]
                if replacement:
                    groups = [('alternative', values[0], '', values[2]), ('deleted', values[3], '', values[5])]
                else:
                    groups = [('listed', values[2], values[0], values[4])]
                for kind, description, regulation, code in groups:
                    if re.fullmatch(r'\d{12}', code):
                        record = {'hsCode': code, 'description': description, 'regulation': regulation, 'page': number, 'endPage': number, 'kind': kind}
                        records.append(record)
                        previous[kind] = record
                    elif not code and kind in previous and (description or regulation):
                        previous[kind]['description'] += ' ' + description
                        previous[kind]['regulation'] += ' ' + regulation
                        previous[kind]['endPage'] = number
                    elif re.search(r'\d', code):
                        raise ValueError(f'Unexpected code cell on page {number}: {code}')
reader = PdfReader(source)
# Deleted-code cell at the open top edge of page 25 is outside the detected grid.
# Preserve it for exclusion; it must never become a candidate.
assert '760692100002' in reader.pages[24].extract_text()
records.append({'hsCode': '760692100002', 'description': 'Deleted code continued from page 24',
    'regulation': '', 'page': 25, 'endPage': 25, 'kind': 'deleted'})
expected = re.findall(r'(?<!\d)\d{12}(?!\d)', '\n'.join(p.extract_text() for p in reader.pages))
actual = [r['hsCode'] for r in records]
from collections import Counter
print('Missing', Counter(expected)-Counter(actual), 'Extra', Counter(actual)-Counter(expected))
assert sorted(expected) == sorted(actual), f'Code coverage mismatch: PDF {len(expected)}, index {len(actual)}'
assert all(r['description'].strip() for r in records)
target.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source, target)
data = {'filename': target.name, 'url': source_url, 'publisher': 'SABER', 'retrievedAt': retrieved_at, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'noticeDates': sorted(set(re.findall(r'20\d{2}-\d{2}-\d{2}', '\n'.join(p.extract_text() for p in reader.pages)))), 'pages': len(reader.pages), 'records': records}
output = root / 'src' / 'data' / 'hs-reference.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'pages': data['pages'], 'records': len(records), 'sha256': data['sha256'], 'sample': records[:2]}))




