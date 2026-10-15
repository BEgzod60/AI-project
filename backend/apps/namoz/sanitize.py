"""Bo'lim HTML matnini xavfsiz holatga keltirish (nh3 / ammonia).

Faqat manbada uchraydigan formatlashga ruxsat beriladi. iframe faqat SoundCloud
pleyeri uchun (namoz duolari tilovati), class faqat oldindan belgilangan qiymatlar.
"""
import re

import nh3

ALLOWED_TAGS = {'p', 'br', 'strong', 'em', 'b', 'i', 'h3', 'ol', 'ul', 'li', 'span', 'iframe'}
ALLOWED_ATTRIBUTES = {
    'p': {'dir', 'lang', 'class'},
    'span': {'dir', 'lang'},
    'ol': {'start', 'class'},
    'ul': {'class'},
    'li': {'value'},
    'iframe': {'src', 'height', 'width', 'frameborder', 'scrolling', 'loading', 'title'},
}
ALLOWED_CLASSES = {'arabic', 'meaning', 'center', 'steps', 'letters'}
IFRAME_PREFIX = 'https://w.soundcloud.com/player/'


def _filter(element, attribute, value):
    if element == 'iframe' and attribute == 'src':
        return value if value.startswith(IFRAME_PREFIX) else None
    if attribute == 'class':
        kept = [c for c in value.split() if c in ALLOWED_CLASSES]
        return ' '.join(kept) or None
    return value


def clean_html(html: str) -> str:
    if not html:
        return ''
    cleaned = nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        attribute_filter=_filter,
        url_schemes={'https'},
        link_rel=None,
    )
    # Ruxsat etilmagan manbali iframe'dan qolgan bo'sh qobiqni olib tashlaymiz
    return re.sub(r'<iframe(?![^>]*\bsrc=)[^>]*>\s*</iframe>', '', cleaned)
