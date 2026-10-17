"""Aloqa formasidagi xabarni Telegram botga yuborish.

Token va chat ID faqat serverdagi muhit o'zgaruvchilarida (backend/.env) saqlanadi —
frontendga va git'ga hech qachon chiqmaydi:
    TELEGRAM_BOT_TOKEN — @BotFather bergan token
    TELEGRAM_CHAT_ID   — xabarlar boradigan chat (botga /start yuborilgach `python manage.py telegram_chat_id`)
"""
import os

import requests

API = 'https://api.telegram.org/bot{token}/{method}'
TIMEOUT = 15


class TelegramError(Exception):
    """Xabar Telegramga yetib bormadi."""


class NotConfigured(TelegramError):
    """Token yoki chat ID sozlanmagan."""


def _token():
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    if not token:
        raise NotConfigured('TELEGRAM_BOT_TOKEN sozlanmagan')
    return token


def send_message(text: str) -> None:
    chat_id = os.environ.get('TELEGRAM_CHAT_ID', '').strip()
    if not chat_id:
        raise NotConfigured('TELEGRAM_CHAT_ID sozlanmagan')
    try:
        resp = requests.post(
            API.format(token=_token(), method='sendMessage'),
            # parse_mode berilmaydi — foydalanuvchi matni oddiy matn sifatida boradi (HTML/Markdown in'ektsiyasi yo'q)
            json={'chat_id': chat_id, 'text': text[:4000], 'disable_web_page_preview': True},
            timeout=TIMEOUT,
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        raise TelegramError('Telegram javob bermadi') from exc
    if not data.get('ok'):
        raise TelegramError(data.get('description') or 'Telegram xabarni qabul qilmadi')


def recent_chats() -> dict:
    """Botga yozgan chatlar: {chat_id: 'ism (@username)'} — chat ID'ni topish uchun."""
    try:
        data = requests.get(API.format(token=_token(), method='getUpdates'), timeout=TIMEOUT).json()
    except (requests.RequestException, ValueError) as exc:
        raise TelegramError('Telegram javob bermadi') from exc
    if not data.get('ok'):
        # Masalan, botga webhook ulangan bo'lsa (boshqa sayt ishlatayotgan bo'lsa) — xabarlarni o'qib bo'lmaydi
        raise TelegramError(data.get('description') or 'Telegram xatosi')
    chats = {}
    for update in data.get('result', []):
        chat = (update.get('message') or update.get('my_chat_member') or {}).get('chat') or {}
        if chat:
            label = chat.get('first_name') or chat.get('title') or ''
            if chat.get('username'):
                label += f" (@{chat['username']})"
            chats[chat['id']] = label.strip()
    return chats
