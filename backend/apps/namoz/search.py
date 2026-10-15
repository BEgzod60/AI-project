"""Namoz va Iymon bo'limlari bo'yicha matnli qidiruv.

Ma'lumot hajmi kichik (~100 bo'lim), shuning uchun qidiruv Python'da bajariladi:
chop etilgan matnlar bir marta tozalanib, normallashtirilib keshlanadi; kesh kaliti
bo'lim/mavzularning oxirgi o'zgarish vaqtiga bog'liq — tahrirdan keyin o'zi yangilanadi.

Normallashtirish har bir belgini AYNAN BITTA belgiga almashtiradi (kichik harf, apostrof
turlari -> '), shuning uchun normallashgan matndagi o'rinlar asl matnga ham mos keladi.
"""
import html
import re

from django.core.cache import cache
from django.db.models import Count, Max

from .models import Section, Topic
from .serializers import published_sections

APOSTROPHES = "'‘’ʻʼ`´"
_APOS_TABLE = {ord(c): "'" for c in APOSTROPHES}
SNIPPET_BEFORE, SNIPPET_AFTER = 70, 130
MAX_RESULTS = 30


def normalize(text: str) -> str:
    """Uzunlikni saqlagan holda: kichik harf + apostroflarni birxillashtirish."""
    out = []
    for ch in text.translate(_APOS_TABLE):
        low = ch.lower()
        out.append(low if len(low) == 1 else ch)
    return ''.join(out)


def plain(html_text: str) -> str:
    text = re.sub(r'<iframe\b.*?</iframe>', ' ', html_text or '', flags=re.S)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text).replace(' ', ' ')
    return ' '.join(text.split())


def query_terms(query: str) -> list:
    terms = [t for t in normalize(' '.join(query.split())).split(' ') if len(t) >= 2]
    return list(dict.fromkeys(terms))[:6]  # takrorlarsiz, ko'pi bilan 6 ta so'z


def _cache_key():
    stamp = Section.objects.aggregate(m=Max('updated_at'), n=Count('id'))
    topic_stamp = Topic.objects.aggregate(m=Max('updated_at'), n=Count('id'))
    return f"namoz-search:{stamp['m']}:{stamp['n']}:{topic_stamp['m']}:{topic_stamp['n']}"


def _documents():
    key = _cache_key()
    docs = cache.get(key)
    if docs is not None:
        return docs

    topics = list(Topic.objects.filter(is_visible=True).values(
        'id', 'category', 'number', 'slug', 'title', 'summary', 'icon'))
    topic_by_id = {t['id']: t for t in topics}
    docs = {'topics': [], 'sections': []}
    for t in topics:
        docs['topics'].append({**t, 'n_title': normalize(t['title']), 'n_summary': normalize(t['summary'])})

    for s in published_sections(Section.objects.filter(topic__is_visible=True)).values(
            'id', 'topic_id', 'title', 'body', 'content_html'):
        text = plain(s['body'] + ' ' + s['content_html'])
        docs['sections'].append({
            'id': s['id'],
            'topic': topic_by_id[s['topic_id']],
            'title': s['title'],
            'text': text,
            'n_title': normalize(s['title']),
            'n_text': normalize(text),
        })
    cache.set(key, docs, 60 * 60)
    return docs


def _snippet(text: str, n_text: str, terms: list) -> str:
    positions = [n_text.find(t) for t in terms if t in n_text]
    if not positions:
        cut = text[:SNIPPET_BEFORE + SNIPPET_AFTER]
        return cut + ('…' if len(text) > len(cut) else '')
    pos = min(positions)
    start, end = max(0, pos - SNIPPET_BEFORE), min(len(text), pos + SNIPPET_AFTER)
    # So'z o'rtasidan kesmaslik
    if start > 0:
        space = text.find(' ', start)
        start = space + 1 if 0 <= space < pos else start
    if end < len(text):
        space = text.rfind(' ', pos, end)
        end = space if space > pos else end
    return ('…' if start > 0 else '') + text[start:end] + ('…' if end < len(text) else '')


def search(query: str, category: str = '') -> dict:
    terms = query_terms(query)
    if not terms:
        return {'query': query, 'terms': [], 'results': []}
    docs = _documents()
    results = []

    for t in docs['topics']:
        if category and t['category'] != category:
            continue
        hay = t['n_title'] + ' ' + t['n_summary']
        if all(term in hay for term in terms):
            score = sum(20 if term in t['n_title'] else 4 for term in terms)
            results.append({
                'type': 'topic', 'score': score, 'category': t['category'], 'slug': t['slug'],
                'number': t['number'], 'icon': t['icon'], 'topic_title': t['title'],
                'title': t['title'], 'snippet': t['summary'], 'section_id': None,
            })

    for s in docs['sections']:
        topic = s['topic']
        if category and topic['category'] != category:
            continue
        n_topic = normalize(topic['title'])
        if not all(term in s['n_title'] or term in s['n_text'] or term in n_topic for term in terms):
            continue
        score = 0
        for term in terms:
            score += 10 if term in s['n_title'] else 0
            score += 3 if term in n_topic else 0
            score += min(s['n_text'].count(term), 5)
        results.append({
            'type': 'section', 'score': score, 'category': topic['category'], 'slug': topic['slug'],
            'number': topic['number'], 'icon': topic['icon'], 'topic_title': topic['title'],
            'title': s['title'], 'snippet': _snippet(s['text'], s['n_text'], terms), 'section_id': s['id'],
        })

    results.sort(key=lambda r: (-r['score'], r['category'], r['number'], r['type'] != 'topic'))
    return {'query': query, 'terms': terms, 'count': len(results), 'results': results[:MAX_RESULTS]}
