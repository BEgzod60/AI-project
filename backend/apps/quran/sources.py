"""Manbalar va o'zbekcha sura nomlari."""
import re

TRANSLATION_TITLE = 'Muhammad Sodiq Muhammad Yusuf — o‘zbekcha (kirill) ma’no tarjimasi (`uz.sodik`)'
TEXT_SOURCE = 'Tanzil Project — Usmoniy Qur’on matni (CC BY 3.0)'
SOURCE_URL = 'https://tanzil.net'
API_TITLE = 'Tanzil Project'
TRANSLATION_TITLE_RU = 'Эльмир Кулиев — смысловой перевод Корана (ru.kuliev, Tanzil)'
TEXT_SOURCE_RU = 'Tanzil Project — текст Корана (CC BY 3.0)'
REVELATION_RU = {'makkiy': 'Мекканская', 'madaniy': 'Мединская'}

# Oyatma-oyat tilovat — Tanzil pleyeri ishlatadigan audio fayllar (SSSAAA.mp3).
AYAH_AUDIO_URL = 'https://tanzil.net/res/audio/{reciter}/{file}.mp3'
AYAH_AUDIO_SOURCE = 'Tanzil Project — oyatma-oyat tilovat'
AYAH_AUDIO_RECITERS = [
    ('afasy', 'Mishari Rashid al-Afasy'),
    ('husary', 'Mahmud Xalil al-Husariy'),
    ('minshawi', 'Muhammad Siddiq al-Minshoviy'),
    ('abdulbasit', 'Abdulbosit Abdussamad'),
    ('sudais', 'Abdurrahmon as-Sudays'),
    ('ghamadi', 'Sa’d al-G‘omidiy'),
]

NAMES_UZ = [
    'Fotiha', 'Baqara', 'Oli Imron', 'Niso', 'Moida', 'An’om', 'A’rof', 'Anfol', 'Tavba', 'Yunus',
    'Hud', 'Yusuf', 'Ra’d', 'Ibrohim', 'Hijr', 'Nahl', 'Isro', 'Kahf', 'Maryam', 'Toha',
    'Anbiyo', 'Haj', 'Mu’minun', 'Nur', 'Furqon', 'Shuaro', 'Naml', 'Qasas', 'Ankabut', 'Rum',
    'Luqmon', 'Sajda', 'Ahzob', 'Saba’', 'Fotir', 'Yosin', 'Soffot', 'Sod', 'Zumar', 'G‘ofir',
    'Fussilat', 'Sho‘ro', 'Zuxruf', 'Duxon', 'Josiya', 'Ahqof', 'Muhammad', 'Fath', 'Hujurot', 'Qof',
    'Zoriyot', 'Tur', 'Najm', 'Qamar', 'Rahmon', 'Voqe’a', 'Hadid', 'Mujodala', 'Hashr', 'Mumtahana',
    'Saf', 'Juma', 'Munofiqun', 'Tag‘obun', 'Taloq', 'Tahrim', 'Mulk', 'Qalam', 'Haqqa', 'Ma’orij',
    'Nuh', 'Jin', 'Muzzammil', 'Muddassir', 'Qiyomat', 'Inson', 'Mursalot', 'Naba’', 'Nozi’ot', 'Abasa',
    'Takvir', 'Infitor', 'Mutaffifin', 'Inshiqoq', 'Buruj', 'Toriq', 'A’lo', 'G‘oshiya', 'Fajr', 'Balad',
    'Shams', 'Layl', 'Zuho', 'Sharh', 'Tin', 'Alaq', 'Qadr', 'Bayyina', 'Zalzala', 'Odiyot',
    'Qori’a', 'Takosur', 'Asr', 'Humaza', 'Fil', 'Quraysh', 'Mo‘un', 'Kavsar', 'Kofirun', 'Nasr',
    'Masad', 'Ixlos', 'Falaq', 'Nos',
]
assert len(NAMES_UZ) == 114


def clean_translation(text):
    """Izoh teglari olib tashlanadi va tutuq belgilari me'yorlanadi."""
    text = re.sub(r'<sup[^>]*>.*?</sup>', '', text or '', flags=re.S)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'(?<=[oOgG])`', '‘', text)
    text = text.replace('`', '’')
    return re.sub(r'\s+', ' ', text).strip()
