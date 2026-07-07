import os, re, json, sys

ROOT = '/app/frontend'
DIRS = ['app', 'src/components']
I18N_DIR = os.path.join(ROOT, 'src/i18n')
SKIP = {'+html.tsx'}

UI_PROPS = ['title', 'label', 'placeholder', 'message', 'subtitle', 'description', 'emptyText',
            'confirmLabel', 'cancelLabel', 'buttonText', 'headerTitle', 'successMessage', 'errorMessage']
UI_KEYS = ['label', 'title', 'text', 'message', 'subtitle', 'description', 'placeholder',
           'emptyText', 'hint', 'buttonText', 'desc']

def has_letters(s):
    return re.search(r'[A-Za-z\u00C0-\u00FF]{2,}', s) is not None

def is_translatable(s):
    s2 = s.strip()
    if not s2 or '{' in s2 or '}' in s2 or '<' in s2:
        return False
    if not has_letters(s2):
        return False
    if re.search(r'[\u00C0-\u00FF]', s2):
        return True
    words = [w for w in re.split(r'\s+', s2) if re.search(r'[A-Za-z]', w)]
    return len(words) >= 2

def js_string(s):
    return json.dumps(s, ensure_ascii=False)

def unescape_sq(s):
    return s.replace("\\'", "'").replace('\\\\', '\\')

def unescape_dq(s):
    return s.replace('\\"', '"').replace('\\\\', '\\')

def tx_text_nodes(src):
    pat = re.compile(r'(<Text\b[^>]*>)([^<>{}]+?)(</Text>)', re.S)
    def rep(m):
        inner = m.group(2).strip()
        if not is_translatable(inner):
            return m.group(0)
        norm = re.sub(r'\s+', ' ', inner)
        return m.group(1) + '{t(' + js_string(norm) + ')}' + m.group(3)
    return pat.sub(rep, src)

def tx_label_expr(src):
    pat = re.compile(r'(<Text\b[^>]*>)\{(\w+(?:\.\w+)*\.(?:label|title))\}(</Text>)')
    return pat.sub(lambda m: m.group(1) + '{t(' + m.group(2) + ')}' + m.group(3), src)

def tx_props(src):
    pat = re.compile(r'\b(' + '|'.join(UI_PROPS) + r')="([^"]+)"')
    def rep(m):
        val = m.group(2)
        if not has_letters(val):
            return m.group(0)
        return m.group(1) + '={t(' + js_string(val) + ')}'
    return pat.sub(rep, src)

def tx_obj_props(src):
    def make_rep(unesc):
        def rep(m):
            raw = unesc(m.group(2))
            if not is_translatable(raw):
                return m.group(0)
            return m.group(1) + ': t(' + js_string(raw) + ')'
        return rep
    pat_sq = re.compile(r"\b(" + '|'.join(UI_KEYS) + r")\s*:\s*'((?:[^'\\\n]|\\.)+)'")
    pat_dq = re.compile(r'\b(' + '|'.join(UI_KEYS) + r')\s*:\s*"((?:[^"\\\n]|\\.)+)"')
    src = pat_sq.sub(make_rep(unescape_sq), src)
    src = pat_dq.sub(make_rep(unescape_dq), src)
    return src

def tx_ternary(src):
    pat = re.compile(r"\?\s*'((?:[^'\\\n]|\\.)+)'\s*:\s*'((?:[^'\\\n]|\\.)+)'")
    def rep(m):
        a, b = unescape_sq(m.group(1)), unescape_sq(m.group(2))
        wa = is_translatable(a)
        wb = is_translatable(b)
        if not wa and not wb:
            return m.group(0)
        pa = 't(' + js_string(a) + ')' if wa else "'" + m.group(1) + "'"
        pb = 't(' + js_string(b) + ')' if wb else "'" + m.group(2) + "'"
        return '? ' + pa + ' : ' + pb
    return pat.sub(rep, src)

def tx_alert(src):
    pat = re.compile(r"Alert\.alert\(\s*'((?:[^'\\\n]|\\.)*)'(\s*,\s*)'((?:[^'\\\n]|\\.)*)'")
    def rep2(m):
        a, b = unescape_sq(m.group(1)), unescape_sq(m.group(3))
        pa = 't(' + js_string(a) + ')' if has_letters(a) else "'" + m.group(1) + "'"
        pb = 't(' + js_string(b) + ')' if has_letters(b) else "'" + m.group(3) + "'"
        return 'Alert.alert(' + pa + m.group(2) + pb
    src = pat.sub(rep2, src)
    pat1 = re.compile(r"Alert\.alert\(\s*'((?:[^'\\\n]|\\.)*)'\s*\)")
    def rep1(m):
        a = unescape_sq(m.group(1))
        if not has_letters(a):
            return m.group(0)
        return 'Alert.alert(t(' + js_string(a) + '))'
    return pat1.sub(rep1, src)

def add_import(src, filepath):
    if re.search(r"from\s+'[^']*src/i18n'", src) or re.search(r"from\s+'\.\.?/i18n'", src):
        m = re.search(r"import\s*\{([^}]*)\}\s*from\s*'([^']*i18n)'", src)
        if m and re.search(r'\bt\b', m.group(1)) is None:
            names = m.group(1).strip()
            src = src.replace(m.group(0), "import { " + names + ", t } from '" + m.group(2) + "'")
        return src
    rel = os.path.relpath(I18N_DIR, os.path.dirname(filepath)).replace('\\', '/')
    if not rel.startswith('.'):
        rel = './' + rel
    imp = "import { t } from '" + rel + "';\n"
    lines = src.split('\n')
    last_import = 0
    for i, line in enumerate(lines):
        if line.startswith('import ') or (line.startswith('} from ')):
            last_import = i
    lines.insert(last_import + 1, imp.rstrip('\n'))
    return '\n'.join(lines)

def process(filepath, dry=False):
    with open(filepath, 'r', encoding='utf-8') as f:
        src = f.read()
    orig = src
    src = tx_text_nodes(src)
    src = tx_label_expr(src)
    src = tx_props(src)
    src = tx_obj_props(src)
    src = tx_ternary(src)
    src = tx_alert(src)
    if src != orig:
        src = add_import(src, filepath)
        if not dry:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(src)
        return True
    return False

def main():
    dry = '--dry' in sys.argv
    changed = []
    for d in DIRS:
        base = os.path.join(ROOT, d)
        for root, _, files in os.walk(base):
            if 'i18n' in root:
                continue
            for fn in files:
                if not fn.endswith('.tsx') or fn in SKIP:
                    continue
                fp = os.path.join(root, fn)
                if process(fp, dry):
                    changed.append(fp)
    print(('DRY RUN — ' if dry else '') + f'{len(changed)} files modified')
    for c in changed:
        print(' ', c)

if __name__ == '__main__':
    main()
