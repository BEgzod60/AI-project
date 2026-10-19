import { apiGet } from './api';
import { getLang } from '../i18n';
import type { SearchResponse, SearchResult } from '../types/search';
import type { TopicCategory } from '../types/namoz';

/** Natijadagi bo'lim nomi: [o'zbekcha, ruscha] */
export const CATEGORY_LABEL: Record<TopicCategory, [string, string]> = { namoz: ['Namoz', 'Намаз'], iymon: ['Iymon', 'Иман'], zakot: ['Zakot', 'Закят'], roza: ['Ro‘za', 'Пост'] };

export function searchContent(q: string): Promise<SearchResponse> {
  return apiGet<SearchResponse>('/search/', { q });
}

/** Natija havolasi: mavzu sahifasi (+ bo'lim langari) */
export function resultHref(r: SearchResult): string {
  return `/${r.category}/${r.slug}${r.section_id ? `#bolim-${r.section_id}` : ''}`;
}

/** Saytdagi sahifalar — nomi bo'yicha tez topish uchun (backendsiz) */
const PAGES = [
  { label: 'Bosh sahifa', label_ru: 'Главная', to: '/', keywords: 'bosh sahifa asosiy главная' },
  { label: 'Namoz', label_ru: 'Намаз', to: '/namoz', keywords: 'namoz tahorat g‘usl tayammum suralar duolar намаз омовение тахарат гусль таяммум дуа' },
  { label: 'Namoz vaqtlari', label_ru: 'Время намаза', to: '/namoz-vaqtlari', keywords: 'namoz vaqtlari bomdod peshin asr shom xufton taqvim qibla hijriy время намаза расписание календарь хиджра' },
  { label: 'Iymon', label_ru: 'Иман', to: '/iymon', keywords: 'iymon aqida din shariat halol harom иман вера акида шариат халяль харам' },
  { label: 'Ro‘za', label_ru: 'Пост', to: '/roza', keywords: 'ro‘za roza ramazon saharlik iftor og‘iz ochish пост ураза рамадан сухур ифтар' },
  { label: 'Zakot', label_ru: 'Закят', to: '/zakot', keywords: 'zakot nisob sadaqa tilla kumush chorva tijorat naqd pul закят закат нисаб садака золото серебро скот' },
  { label: 'Suralar va oyatlar', label_ru: 'Суры и аяты', to: '/suralar', keywords: 'sura suralar zam sura qur’on quron fotiha ixlos falaq nos oyat ma’nosi tarjima сура суры аят коран фатиха ихлас перевод' },
  { label: 'Qibla', label_ru: 'Кибла', to: '/qibla', keywords: 'qibla ka’ba kaaba yo‘nalish kompas masjid yaqin masjidlar кибла кааба направление компас мечеть мечети' },
];

/** Saytdagi sahifalar joriy tilda */
export const searchPages = () => PAGES.map((p) => ({ ...p, label: getLang() === 'ru' ? p.label_ru : p.label }));
