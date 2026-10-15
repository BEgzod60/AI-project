/** Ilova bo'ylab ishlatiladigan konstantalar */

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

export interface PrayerLabel {
  key: string;
  label: string;
  tag?: string;
}

/** Namozlar tartibi va ko'rsatiladigan yorliqlar */
export const PRAYER_LABELS: PrayerLabel[] = [
  { key: 'bomdod', label: 'Bomdod', tag: 'Saharlik' },
  { key: 'quyosh', label: 'Quyosh' },
  { key: 'peshin', label: 'Peshin' },
  { key: 'asr', label: 'Asr' },
  { key: 'shom', label: 'Shom', tag: 'Iftorlik' },
  { key: 'xufton', label: 'Xufton' },
];

/** Hafta kunlari (Django gregorian sana tartibi: Dk, Du, Ch... emas — JS) */
export const WEEKDAYS_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

export const MONTHS_UZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

/** Oylarning qisqa nomlari (iyun/iyul farqlanishi uchun qo'lda) */
export const MONTHS_SHORT_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export const THEME_STORAGE_KEY = 'iymon-theme';

export const REGION_STORAGE_KEY = 'iymon-region';
