/** Namoz turlari va rakat yorliqlari — tanlangan tilda (ruschasi O'zbekistondagi rus tilidagi manbalardagi kabi) */
import type { Lang } from '../i18n';

const NAMES_RU: Record<string, string> = {
  bomdod: 'Бомдод', peshin: 'Пешин', asr: 'Аср', shom: 'Шом', xufton: 'Хуфтон', vitr: 'Витр',
  tahajjud: 'Тахаджуд', nafl: 'Нафль', juma: 'Джума', hayit: 'Хайит',
};

const KINDS: Record<string, [string, string]> = {
  farz: ['farz', 'фард'], sunnat: ['sunnat', 'сунна'], vojib: ['vojib', 'ваджиб'], nafl: ['nafl', 'нафль'],
};

/** Namoz turi nomi: slug bo'yicha (bazadagi o'zbekcha nom — zaxira) */
export function prayerName(slug: string, uzName: string, lang: Lang): string {
  return lang === 'ru' ? NAMES_RU[slug] ?? uzName : uzName;
}

export function kindLabel(kind: string, lang: Lang): string {
  const k = KINDS[kind];
  return k ? (lang === 'ru' ? k[1] : k[0]) : kind;
}

/** «4 rakat sunnat» / «4 ракаата сунна» */
export function rakatLabel(count: number, kind: string, lang: Lang): string {
  if (lang !== 'ru') return `${count} rakat ${kindLabel(kind, lang)}`;
  const word = count === 1 ? 'ракаат' : count >= 2 && count <= 4 ? 'ракаата' : 'ракаатов';
  return `${count} ${word} ${kindLabel(kind, lang)}`;
}

/** «Peshin namozi» / «Намаз Пешин» */
export function prayerTitle(slug: string, uzName: string, lang: Lang): string {
  if (lang === 'ru') return slug === 'nafl' || slug === 'hayit' ? `Намазы ${prayerName(slug, uzName, lang)}` : `Намаз ${prayerName(slug, uzName, lang)}`;
  return slug === 'nafl' || slug === 'hayit' ? `${uzName} namozlari` : `${uzName} namozi`;
}
