/** Ilova bo'ylab ishlatiladigan konstantalar */
import type { Lang } from '../i18n';

/** namoz-vaqtlari API qo'llab-quvvatlaydigan hududlar (backend REGIONS bilan bir xil) */
export const REGIONS = [
  'Toshkent',
  'Andijon',
  'Buxoro',
  "Farg'ona",
  'Jizzax',
  'Namangan',
  'Navoiy',
  'Qashqadaryo',
  "Qoraqalpog'iston",
  'Samarqand',
  'Sirdaryo',
  'Surxandaryo',
  'Xiva',
] as const;

export const DEFAULT_REGION = 'Toshkent';

/** Hududlarning ruscha nomlari (API'ga o'zbekcha nom yuboriladi, faqat ko'rinishi) */
const REGIONS_RU: Record<string, string> = {
  Toshkent: 'Ташкент', Andijon: 'Андижан', Buxoro: 'Бухара', "Farg'ona": 'Фергана', Jizzax: 'Джизак',
  Namangan: 'Наманган', Navoiy: 'Навои', Qashqadaryo: 'Кашкадарья', "Qoraqalpog'iston": 'Каракалпакстан',
  Samarqand: 'Самарканд', Sirdaryo: 'Сырдарья', Surxandaryo: 'Сурхандарья', Xiva: 'Хива',
};

export function regionLabel(region: string, lang: Lang): string {
  return lang === 'ru' ? REGIONS_RU[region] ?? region : region;
}

export interface PrayerLabel {
  key: string;
  label: string;
  tag?: string;
  label_ru: string;
  tag_ru?: string;
}

/** Namozlar tartibi va ko'rsatiladigan yorliqlar (ruschasi — O'zbekistondagi rus tilidagi manbalardagi kabi) */
export const PRAYER_LABELS: PrayerLabel[] = [
  { key: 'bomdod', label: 'Bomdod', tag: 'Saharlik', label_ru: 'Бомдод', tag_ru: 'Сухур' },
  { key: 'quyosh', label: 'Quyosh', label_ru: 'Восход' },
  { key: 'peshin', label: 'Peshin', label_ru: 'Пешин' },
  { key: 'asr', label: 'Asr', label_ru: 'Аср' },
  { key: 'shom', label: 'Shom', tag: 'Iftorlik', label_ru: 'Шом', tag_ru: 'Ифтар' },
  { key: 'xufton', label: 'Xufton', label_ru: 'Хуфтон' },
];

export function prayerLabel(key: string, lang: Lang): string {
  const p = PRAYER_LABELS.find((x) => x.key === key);
  if (!p) return key;
  return lang === 'ru' ? p.label_ru : p.label;
}

export function prayerTag(key: string, lang: Lang): string | undefined {
  const p = PRAYER_LABELS.find((x) => x.key === key);
  return lang === 'ru' ? p?.tag_ru : p?.tag;
}

/** Hafta kunlari (Django gregorian sana tartibi: Dk, Du, Ch... emas — JS) */
export const WEEKDAYS_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

export const MONTHS_UZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

/** Oylarning qisqa nomlari (iyun/iyul farqlanishi uchun qo'lda) */
export const MONTHS_SHORT_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export const WEEKDAYS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
/** Sana ichida (родительный падеж): «17 октября» */
export const MONTHS_RU_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
/** Oy nomi alohida: «Октябрь» */
export const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const MONTHS_SHORT_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

export const weekdays = (lang: Lang) => (lang === 'ru' ? WEEKDAYS_RU : WEEKDAYS_UZ);
export const monthsShort = (lang: Lang) => (lang === 'ru' ? MONTHS_SHORT_RU : MONTHS_SHORT_UZ);
/** Oy nomi alohida (sarlavha): «oktabr» / «Октябрь» */
export const monthName = (i: number, lang: Lang) => (lang === 'ru' ? MONTHS_RU[i] : MONTHS_UZ[i]);

export const THEME_STORAGE_KEY = 'iymon-theme';

export const REGION_STORAGE_KEY = 'iymon-region';
