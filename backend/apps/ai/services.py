"""Neon AI Gateway orqali matn va rasm bilan ishlash.

Ikkita manba qo'llab-quvvatlanadi:
  1. Neon AI Gateway — `NEON_AI_GATEWAY_BASE_URL` + `NEON_AI_GATEWAY_TOKEN`
     (OpenAI-ga mos `chat/completions` dialekti: {BASE}/v1/chat/completions);
  2. Umumiy OpenAI-ga mos server — `AI_API_KEY` + `AI_BASE_URL` (ixtiyoriy).

Gateway so'ramasa yoki reja cheklovasi bo'lsa (`ai_not_enabled`) xato matni
o'rniga tushiriladi — frontend shuni ko'rsatib, foydalanuvchini chalg'itmaydi.
"""
import base64
import mimetypes
import os
from pathlib import Path

import requests
from django.conf import settings

DEFAULT_MODEL = os.environ.get('AI_MODEL', 'claude-haiku-4-5')
TIMEOUT = 60
MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

SYSTEM_PROMPT = (
    "Siz — «Iymon» sayti yordamchisiz. Islomiy ta'lim platformasi bo'lishingiz uchun "
    "javoblaringiz aniq, qisqa va O'zbek tilida (lotin yozuvi) bo'lsin. "
    "Faqat ishonchli manbalarga tayaning; ishonchingiz yetarli bo'lmasa, buni ochiq ayting. "
    "Hukm va tartib masalalarida Hanafiy mazhabini eslatib o'ting."
)


class AiError(Exception):
    """AI xizmati bilan bog'liq xato (barchasi frontendga aniq kod bilan boradi)."""

    code = 'ai_error'

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message)
        if code:
            self.code = code


def _config():
    """(base_url, token, model) — topilmasa None."""
    base = os.environ.get('NEON_AI_GATEWAY_BASE_URL') or os.environ.get('AI_BASE_URL')
    token = os.environ.get('NEON_AI_GATEWAY_TOKEN') or os.environ.get('AI_API_KEY')
    if not base or not token:
        return None
    base = base.rstrip('/')
    if not base.endswith('/v1'):
        base = f'{base}/v1'
    return base, token, os.environ.get('AI_MODEL', DEFAULT_MODEL)


def is_configured() -> bool:
    return _config() is not None


def _post(payload: dict, stream: bool = False):
    cfg = _config()
    if not cfg:
        raise AiError(
            'AI xizmati hali yoqilgan. Neon rejasini to\'ldiring yoki AI_API_KEY/AI_BASE_URL bering.',
            'ai_not_configured',
        )
    base, token, _ = cfg
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    try:
        response = requests.post(
            f'{base}/chat/completions',
            json=payload,
            headers=headers,
            timeout=TIMEOUT,
            stream=stream,
        )
    except requests.RequestException as exc:
        raise AiError('AI serveriga ulanib bo\'lmadi. Birozdan keyin urinib ko\'ring.', 'ai_network') from exc

    if response.status_code == 402 or 'plan' in response.text[:400].lower():
        raise AiError(
            'AI Gateway faqat to\'lovli rejada ishlaydi. Neon billing sahifasidan rejani yangilang.',
            'ai_plan_required',
        )
    if response.status_code >= 400:
        raise AiError('AI serveri javob bermadi.', 'ai_upstream')
    return response


def complete(messages: list, model: str | None = None, max_tokens: int = 800) -> str:
    """Bir martalik javob (oddiy matn)."""
    cfg = _config()
    if not cfg:
        raise AiError('AI xizmati yoqilmagan.', 'ai_not_configured')
    _, _, default_model = cfg
    response = _post({
        'model': model or default_model,
        'messages': [{'role': 'system', 'content': SYSTEM_PROMPT}, *messages],
        'max_tokens': max_tokens,
        'temperature': 0.2,
    })
    try:
        data = response.json()
        return data['choices'][0]['message']['content'].strip()
    except (ValueError, KeyError, IndexError) as exc:
        raise AiError('AI javobini tushunib bo\'lmadi.', 'ai_bad_response') from exc


def stream(messages: list, model: str | None = None, max_tokens: int = 800):
    """Javobni SSE (server-sent events) ko'rinishida beradi — sekinroq, lekin tezroq ko'rinadi."""
    cfg = _config()
    if not cfg:
        raise AiError('AI xizmati yoqilmagan.', 'ai_not_configured')
    _, _, default_model = cfg
    response = _post({
        'model': model or default_model,
        'messages': [{'role': 'system', 'content': SYSTEM_PROMPT}, *messages],
        'max_tokens': max_tokens,
        'temperature': 0.2,
        'stream': True,
    }, stream=True)

    def chunks():
        for raw in response.iter_lines(decode_unicode=True):
            if not raw or not raw.startswith('data: '):
                continue
            data = raw[6:].strip()
            if data == '[DONE]':
                return
            try:
                import json
                delta = json.loads(data)['choices'][0]['delta'].get('content')
            except (ValueError, KeyError, IndexError):
                continue
            if delta:
                yield delta

    return chunks()


def _image_data_url(path) -> str:
    path = Path(path)
    if not path.exists():
        raise AiError('Rasm topilmadi.', 'image_not_found')
    if path.suffix.lower() not in ALLOWED_IMAGE_EXT:
        raise AiError('Faqat jpg, png, webp va gif qo\'llab-quvvatlanadi.', 'image_bad_type')
    if path.stat().st_size > MAX_IMAGE_BYTES:
        raise AiError('Rasm hajmi 5 MB dan oshmasligi kerak.', 'image_too_large')
    mime = mimetypes.guess_type(path.name)[0] or 'image/webp'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


def describe_image(path_or_url: str, question: str = '', model: str | None = None) -> str:
    """Rasmni AI bilan o'qish: tavsif + berilgan savolga javob (Claude/GPT vision)."""
    if path_or_url.startswith(('http://', 'https://')):
        image_part = {'type': 'image_url', 'image_url': {'url': path_or_url}}
    else:
        # MEDIA_ROOT ga nisbatan yoki to'liq yo'l bilan berilishi mumkin
        candidate = Path(path_or_url)
        if not candidate.is_absolute() and settings.MEDIA_ROOT:
            candidate = Path(settings.MEDIA_ROOT) / path_or_url
        image_part = {'type': 'image_url', 'image_url': {'url': _image_data_url(candidate)}}

    ask = question.strip() or (
        'Bu rasmni batafsil tavsifla: nimani ko\'rsatib beradi, undagi matnni (kirill/ lotin) '
        'imkon qadar aniq yozib ber va islomiy ta\'limga bog\'liq bo\'lsa, qisqa izoh qo\'sh.'
    )
    messages = [{
        'role': 'user',
        'content': [
            {'type': 'text', 'text': ask},
            image_part,
        ],
    }]
    return complete(messages, model=model, max_tokens=900)


def list_models() -> list:
    """Gateway servlatadigan modellar ro'yxati."""
    cfg = _config()
    if not cfg:
        return []
    base, token, _ = cfg
    try:
        response = requests.get(f'{base}/models', headers={'Authorization': f'Bearer {token}'}, timeout=20)
        response.raise_for_status()
        return [m.get('id') for m in response.json().get('data', []) if m.get('id')]
    except (requests.RequestException, ValueError):
        return []
