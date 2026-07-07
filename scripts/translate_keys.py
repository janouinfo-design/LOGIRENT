import asyncio, json, os, sys
sys.path.insert(0, '/app/backend')
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
from emergentintegrations.llm.chat import LlmChat, UserMessage

KEYS_FILE = '/tmp/i18n_keys.json'
OUT_EN = '/app/frontend/src/i18n/translations.en.ts'
OUT_DE = '/app/frontend/src/i18n/translations.de.ts'
STATE = '/tmp/i18n_translated.json'
BATCH = 50

SYSTEM = """You are a professional translator for a Swiss car rental web application (LogiRent).
You translate French UI strings to English and German.
Rules:
- Keep the same tone: short UI labels stay short, sentences stay natural.
- Keep punctuation, trailing spaces, ellipses, exclamation marks as in source.
- Do NOT translate brand names (LogiRent, Stripe, TWINT, SUV, GPS, Email, OK).
- Placeholders/format patterns: translate date format hints (AAAA-MM-JJ -> YYYY-MM-DD for EN, JJJJ-MM-TT for DE). Phone number patterns stay unchanged.
- German: use formal "Sie" form.
- Reply ONLY with a valid JSON array, same length and order as input, each item: {"en": "...", "de": "..."}. No markdown."""

async def translate_batch(chat_id, batch):
    chat = LlmChat(
        api_key=os.environ['EMERGENT_LLM_KEY'],
        session_id=f'i18n-{chat_id}',
        system_message=SYSTEM,
    ).with_model('openai', 'gpt-5.2')
    prompt = 'Translate these French strings:\n' + json.dumps(batch, ensure_ascii=False)
    resp = await chat.send_message(UserMessage(text=prompt))
    txt = resp.strip()
    if txt.startswith('```'):
        txt = txt.split('```')[1]
        if txt.startswith('json'):
            txt = txt[4:]
    data = json.loads(txt)
    assert len(data) == len(batch), f'length mismatch {len(data)} vs {len(batch)}'
    return data

async def main():
    keys = json.load(open(KEYS_FILE))
    state = {}
    if os.path.exists(STATE):
        state = json.load(open(STATE))
    todo = [k for k in keys if k not in state]
    print(f'{len(keys)} keys, {len(todo)} to translate', flush=True)
    batches = [todo[i:i+BATCH] for i in range(0, len(todo), BATCH)]
    for i, batch in enumerate(batches):
        for attempt in range(3):
            try:
                res = await translate_batch(f'{i}-{attempt}', batch)
                for k, r in zip(batch, res):
                    state[k] = r
                json.dump(state, open(STATE, 'w'), ensure_ascii=False)
                print(f'batch {i+1}/{len(batches)} done', flush=True)
                break
            except Exception as e:
                print(f'batch {i+1} attempt {attempt+1} failed: {e}', flush=True)
                await asyncio.sleep(2)
    en = {k: v['en'] for k, v in state.items() if k in keys}
    de = {k: v['de'] for k, v in state.items() if k in keys}
    def write_ts(path, name, d):
        body = json.dumps(d, ensure_ascii=False, indent=2, sort_keys=True)
        open(path, 'w').write(f'const {name}: Record<string, string> = {body};\nexport default {name};\n')
    write_ts(OUT_EN, 'en', en)
    write_ts(OUT_DE, 'de', de)
    print(f'WROTE {len(en)} en / {len(de)} de translations', flush=True)

asyncio.run(main())
