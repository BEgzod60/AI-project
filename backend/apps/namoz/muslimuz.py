"""muslim.uz «Namoz» sahifasini (https://muslim.uz/uz/c/prayer) tahlil qilish.

Sahifa tuzilishi: har bir <article> — bitta mavzu; uning ichida bloklar:
    <h2 id=blockNNN class="title_block">SARLAVHA</h2><div class="text_islom">…</div>

Matn O'ZGARTIRILMAYDI — faqat belgilash (markup) qayta tuziladi:
  • bo'sh xatboshilar olib tashlanadi;
  • arabcha xatboshi -> <p class="arabic" dir="rtl" lang="ar"> (import sukut bo'yicha ularni
    `strip_arabic` bilan olib tashlaydi — saytda faqat lotincha matn ko'rsatiladi);
  • «Ma'nosi:» bilan boshlanuvchi xatboshi -> <p class="meaning">;
  • ketma-ket «1. …», «2. …» xatboshilari -> <ol class="steps"><li value="1">…;
  • ketma-ket «a) …», «b) …» xatboshilari -> <ul class="letters"><li>…;
  • SoundCloud pleyerlari saqlanadi.
`plain_text(original) == plain_text(transformed)` tekshiruvi bilan kafolatlanadi.
"""
import html as html_lib
import re
from dataclasses import dataclass, field

ARABIC_RE = re.compile('[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]')
LETTER_RE = re.compile(r'[^\W\d_]', re.UNICODE)
NUMBERED_RE = re.compile(r'^\s*(\d{1,2})\.\s+')
LETTERED_RE = re.compile(r'^\s*[a-zа-яёўқғҳ]\)\s', re.IGNORECASE)
MEANING_RE = re.compile(r'^\s*ma[’‘\'`ʼ]?nosi\s*:', re.IGNORECASE)

BLOCK_RE = re.compile(
    r'<h2 id=["\']?(block\d+)["\']? class="title_block">(.*?)</h2>\s*'
    r'<div class="text_islom">(.*?)</div>\s*</div>\s*</div>',
    re.S,
)
TOP_RE = re.compile(r'<(p|h2|h3|div)\b([^>]*)>(.*?)</\1>', re.S | re.I)
IFRAME_RE = re.compile(r'<iframe\b[^>]*\bsrc="([^"]+)"[^>]*>\s*</iframe>', re.S | re.I)

# Lotin matni ichiga tushib qolgan kirillcha "egizak" harflar (bеrgan -> bergan)
HOMOGLYPHS = str.maketrans({
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y',
    'А': 'A', 'Е': 'E', 'О': 'O', 'Р': 'P', 'С': 'C', 'Х': 'X', 'Т': 'T',
    'М': 'M', 'Н': 'H', 'К': 'K', 'В': 'B',
})
MIXED_WORD_RE = re.compile(r'\w*[A-Za-z]\w*')


@dataclass
class Block:
    key: str            # blockNNN
    title: str          # manbadagi sarlavha (katta harflarda)
    body: str           # manbadagi xom HTML


@dataclass
class Article:
    blocks: list = field(default_factory=list)


def parse_page(page_html: str) -> list:
    start = page_html.find('class="cd-articles')
    if start < 0:
        raise ValueError("Sahifada 'cd-articles' bloki topilmadi — sahifa tuzilishi o'zgargan bo'lishi mumkin.")
    articles = []
    for raw in re.findall(r'<article>(.*?)</article>', page_html[start:], re.S):
        art = Article()
        for key, title, body in BLOCK_RE.findall(raw):
            art.blocks.append(Block(key, plain_text(title), body))
        if art.blocks:
            articles.append(art)
    return articles


def plain_text(fragment: str) -> str:
    """Teglarsiz, bo'shliqlari bittaga keltirilgan matn."""
    text = re.sub(r'<[^>]+>', ' ', fragment)
    text = html_lib.unescape(text).replace(' ', ' ')
    text = re.sub('[‎‏]', '', text)  # LRM/RLM yo'nalish belgilari
    return ' '.join(text.split())


def fix_homoglyphs(text: str) -> str:
    """Faqat lotin harfi ham bor so'zlardagi kirillcha egizaklarni almashtiradi."""
    return MIXED_WORD_RE.sub(lambda m: m.group(0).translate(HOMOGLYPHS), text)


def sentence_case(title: str) -> str:
    # Katta harfli sarlavhada undoshdan keyingi «Ye» — kirilldagi «Е» (BYeRUVChI -> BERUVCHI)
    t = re.sub(r'(?<=[BCDFGHJKLMNPQRSTVXZ])Ye', 'E', title.strip()).lower()
    return t[:1].upper() + t[1:]


def _is_arabic(fragment: str) -> bool:
    text = plain_text(fragment)
    letters = LETTER_RE.findall(text)
    return bool(letters) and len(ARABIC_RE.findall(text)) / len(letters) > 0.5


def _iframe(src: str) -> str:
    src = html_lib.unescape(src).replace('visual=true', 'visual=false')
    height = 20 if 'visual=false' not in src else 120
    return (
        f'<iframe src="{html_lib.escape(src, quote=True)}" height="{height}" width="100%" '
        f'frameborder="no" scrolling="no" loading="lazy" title="Tilovat"></iframe>'
    )


def _strip_number(inner: str, number: str):
    """Ichki HTML boshidagi «N. » ni olib tashlaydi (faqat teg ichida bo'lmasa)."""
    m = re.match(r'^\s*' + re.escape(number) + r'\.\s+', inner)
    return inner[m.end():] if m else None


def transform(body: str) -> str:
    """Manba HTML -> tuzilgan HTML (matn o'zgarmaydi)."""
    nodes = []  # (kind, html)
    for tag, attrs, inner in TOP_RE.findall(body):
        tag = tag.lower()
        if tag == 'div':
            for src in IFRAME_RE.findall(inner):
                nodes.append(('iframe', _iframe(src)))
            continue
        iframes = IFRAME_RE.findall(inner)
        if iframes:
            for src in iframes:
                nodes.append(('iframe', _iframe(src)))
            inner = IFRAME_RE.sub('', inner)
        if not plain_text(inner):
            continue
        if tag in ('h2', 'h3'):
            nodes.append(('h3', f'<h3>{inner.strip()}</h3>'))
            continue
        attrs_l = attrs.lower()
        rtl = 'dir="rtl"' in attrs_l
        centered = 'center' in attrs_l
        text = plain_text(inner)
        if _is_arabic(inner):
            nodes.append(('p', f'<p class="arabic" dir="rtl" lang="ar">{inner.strip()}</p>'))
        elif MEANING_RE.match(text):
            nodes.append(('p', f'<p class="meaning">{inner.strip()}</p>'))
        elif NUMBERED_RE.match(inner) and NUMBERED_RE.match(text):
            nodes.append(('num', NUMBERED_RE.match(text).group(1), inner.strip()))
        elif LETTERED_RE.match(text) and LETTERED_RE.match(inner):
            nodes.append(('let', inner.strip()))
        else:
            cls = ' class="center"' if centered else ''
            direction = ' dir="rtl"' if rtl else ''
            nodes.append(('p', f'<p{cls}{direction}>{inner.strip()}</p>'))

    out, i = [], 0
    while i < len(nodes):
        kind = nodes[i][0]
        if kind in ('num', 'let'):
            j = i
            while j < len(nodes) and nodes[j][0] == kind:
                j += 1
            group = nodes[i:j]
            if len(group) >= 2 and kind == 'num':
                items = []
                for _, number, inner in group:
                    stripped = _strip_number(inner, number)
                    items.append(f'<li value="{number}">{stripped}</li>' if stripped is not None else f'<li>{inner}</li>')
                out.append('<ol class="steps">' + ''.join(items) + '</ol>')
            elif len(group) >= 2:
                out.append('<ul class="letters">' + ''.join(f'<li>{g[1]}</li>' for g in group) + '</ul>')
            else:
                out.append(f'<p>{group[0][-1]}</p>')
            i = j
        else:
            out.append(nodes[i][1])
            i += 1
    return '\n'.join(out)


def strip_arabic(body: str) -> str:
    """Arab yozuvidagi xatboshilarni olib tashlaydi (ichidagi tilovat pleyeri saqlanadi)."""
    def repl(m):
        inner = m.group(2)
        if not _is_arabic(re.sub(r'<iframe\b.*?</iframe>', ' ', inner, flags=re.S)):
            return m.group(0)
        iframes = re.findall(r'<iframe\b.*?</iframe>', inner, flags=re.S)
        return ''.join(f'<p>{f}</p>' for f in iframes)
    return re.sub(r'<p\b([^>]*)>(.*?)</p>', repl, body, flags=re.S | re.I)


def transformed_plain_text(result: str) -> str:
    """Tekshiruv uchun: <li value=N> raqamini matnga qaytarib, oddiy matn oladi."""
    restored = re.sub(r'<li value="(\d+)">', lambda m: f'<li>{m.group(1)}. ', result)
    return plain_text(re.sub(r'<iframe\b.*?</iframe>', ' ', restored, flags=re.S))


def source_plain_text(body: str) -> str:
    return plain_text(re.sub(r'<iframe\b.*?</iframe>', ' ', body, flags=re.S))


# --- Kirill -> lotin (O'zbekiston lotin alifbosi qoidalari) -----------------
_CYR = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y',
    'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'x', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ы': 'i', 'э': 'e',
    'ю': 'yu', 'я': 'ya', 'ё': 'yo', 'ў': 'o‘', 'қ': 'q', 'ғ': 'g‘', 'ҳ': 'h',
    'ъ': '’', 'ь': '', 'ц': 's',
}
_VOWELS = set('аеёиоуэюяўАЕЁИОУЭЮЯЎ')


def cyr_to_lat(text: str) -> str:
    out = []
    for idx, ch in enumerate(text):
        low = ch.lower()
        if low == 'е':
            prev = text[idx - 1] if idx else ''
            # so'z boshida, unli yoki ъ/ь dan keyin — «ye»
            lat = 'ye' if (not prev.isalpha() or prev in _VOWELS or prev.lower() in 'ъь') else 'e'
        elif low in _CYR:
            lat = _CYR[low]
        else:
            out.append(ch)
            continue
        if ch.isupper() and lat:
            nxt = text[idx + 1] if idx + 1 < len(text) else ''
            lat = lat.upper() if nxt.isupper() else lat[0].upper() + lat[1:]
        out.append(lat)
    return ''.join(out)


def transliterate_html(fragment: str) -> str:
    """Faqat matn qismlarini o'giradi; teglar va arabcha matnga tegmaydi."""
    return re.sub(r'>([^<]+)<', lambda m: '>' + cyr_to_lat(m.group(1)) + '<', '>' + fragment + '<')[1:-1]
