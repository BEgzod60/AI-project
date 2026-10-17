"""Botga /start yozgan chatlarni ko'rsatadi va (bitta bo'lsa) TELEGRAM_CHAT_ID ni backend/.env ga yozadi.

    python manage.py telegram_chat_id               # ko'rsatadi
    python manage.py telegram_chat_id --save        # bitta chat bo'lsa .env ga yozadi
    python manage.py telegram_chat_id --set 12345   # ID'ni qo'lda yozadi (botga webhook ulangan bo'lsa)
"""
import re

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.contact import telegram


class Command(BaseCommand):
    help = "Telegram bot chat ID'sini topadi (avval botga /start yuboring)"

    def add_arguments(self, parser):
        parser.add_argument('--save', action='store_true', help="Topilgan chat ID'ni backend/.env ga yozish")
        parser.add_argument('--set', dest='chat_id', help="Chat ID'ni qo'lda yozish (masalan @userinfobot ko'rsatgan raqam)")

    def handle(self, *args, save=False, chat_id=None, **options):
        if chat_id:
            if not re.fullmatch(r'-?\d{5,20}', chat_id.strip()):
                raise CommandError('Chat ID raqam bo‘lishi kerak, masalan 123456789.')
            self._write(chat_id.strip())
            return
        try:
            chats = telegram.recent_chats()
        except telegram.TelegramError as exc:
            hint = (" Botga webhook ulangan (boshqa sayt ishlatmoqda) — chat ID'ni @userinfobot'dan olib, "
                    "`--set <ID>` bilan yozing." if 'webhook' in str(exc).lower() else '')
            raise CommandError(f'{exc}.{hint}') from exc
        if not chats:
            raise CommandError('Chat topilmadi: Telegramda botga /start yuboring va qayta ishga tushiring.')
        for chat_id, label in chats.items():
            self.stdout.write(f'{chat_id}  {label}')
        if save:
            if len(chats) != 1:
                raise CommandError("Bir nechta chat bor — kerakli ID'ni .env ga qo'lda yozing.")
            self._write(str(next(iter(chats))))

    def _write(self, chat_id):
        env = settings.BASE_DIR / '.env'
        text = env.read_text() if env.exists() else ''
        line = f'TELEGRAM_CHAT_ID={chat_id}'
        text = re.sub(r'^TELEGRAM_CHAT_ID=.*$', line, text, flags=re.M) if 'TELEGRAM_CHAT_ID=' in text else text + line + '\n'
        env.write_text(text)
        self.stdout.write(self.style.SUCCESS(f'.env ga yozildi: {line} (serverni qayta ishga tushiring)'))
