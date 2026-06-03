import json
import re
from pathlib import Path
text = Path('app.js').read_text(encoding='utf-8')
out = ''
i = 0
state = 'code'
while i < len(text):
    c = text[i]
    if state == 'code':
        if c == '"':
            state = 'dq'
        elif c == "'":
            state = 'sq'
        elif c == '`':
            state = 'bq'
        elif c == '/' and i + 1 < len(text) and text[i + 1] == '/':
            state = 'line'
        elif c == '/' and i + 1 < len(text) and text[i + 1] == '*':
            state = 'block'
        elif c in '{}':
            out += c
        elif c == '\\':
            i += 1
    elif state in ['dq', 'sq', 'bq']:
        if c == '\\':
            i += 1
        elif state == 'dq' and c == '"':
            state = 'code'
        elif state == 'sq' and c == "'":
            state = 'code'
        elif state == 'bq' and c == '`':
            state = 'code'
        elif c == '$' and state == 'bq' and i + 1 < len(text) and text[i + 1] == '{':
            out += '${'
            i += 1
    elif state == 'line' and c == '\n':
        state = 'code'
    elif state == 'block' and c == '*' and i + 1 < len(text) and text[i + 1] == '/':
        state = 'code'
        i += 1
    i += 1
balance = 0
issue = None
for idx, ch in enumerate(out):
    if ch == '{':
        balance += 1
    elif ch == '}':
        balance -= 1
    if balance < 0 and issue is None:
        issue = idx
print(json.dumps({'balance': balance, 'issue': issue}))
