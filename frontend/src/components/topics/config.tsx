import type { ReactNode } from 'react';
import type { TopicIcon } from '../../types/namoz';

/** Mavzuli bo'lim (Namoz, Iymon, ...) sahifalari uchun sozlama */
export interface TopicCategoryConfig {
  /** Backend kategoriyasi va API yo'li: /api/<category>/topics/ */
  category: 'namoz' | 'iymon';
  /** Frontend yo'li, masalan /namoz */
  basePath: string;
  /** Bo'lim nomi (breadcrumb, qaytish tugmasi) */
  label: string;
  /** Qaytish tugmasidagi ikonka */
  icon: TopicIcon;
  /** Hero matni */
  intro: ReactNode;
  heroImage: string;
  /** Hero'dagi qisqa ma'lumotlar (birinchisi — mavzular soni bilan almashtiriladi) */
  stats: { value: string; label: string }[];
  note: { title: string; text: string };
}

export const NAMOZ_CONFIG: TopicCategoryConfig = {
  category: 'namoz',
  basePath: '/namoz',
  label: 'Namoz',
  icon: 'mosque',
  heroImage: '/images/mosque.webp',
  intro: (
    <>
      Bu bo'limda poklanishdan tortib namozning o'qilish tartibi, duolar, qazo namozlari va turli
      namozlargacha bo'lgan mavzular <strong className="text-white">Hanafiy</strong> mazhabi asosida jamlangan.
      Har bir mavzu bo'yicha ma'lumotlar mutaxassis tekshiruvidan so'ng manbasi bilan birga joylanadi.
    </>
  ),
  stats: [
    { value: '12', label: 'mavzu' },
    { value: 'Hanafiy', label: 'mazhabi' },
    { value: 'Manbali', label: "ma'lumot" },
  ],
  note: {
    title: "Ma'lumotlar qanday tayyorlanadi?",
    text:
      "Oyat, hadis va fiqhiy hukmlar faqat Hanafiy fiqhi bo'yicha mutaxassis tekshirgandan so'ng va manbasi ko'rsatilgan holda chop etiladi. \"Tekshiruvda\" belgisi qo'yilgan mavzular ustida ish olib borilmoqda.",
  },
};

export const IYMON_CONFIG: TopicCategoryConfig = {
  category: 'iymon',
  basePath: '/iymon',
  label: 'Iymon',
  icon: 'heart',
  heroImage: '/images/quran-sidebar.webp',
  intro: (
    <>
      Bu bo'limda din va shariat tushunchalari, iymon asoslari — Allohga, farishtalarga, kitoblarga,
      payg'ambarlarga, oxirat kuniga va qadarga iymon, shuningdek aqida hamda halol va harom mavzulari
      jamlangan. Matnlar <strong className="text-white">O'zbekiston musulmonlari idorasi</strong> rasmiy
      saytidan manbasi bilan olingan.
    </>
  ),
  stats: [
    { value: '13', label: 'mavzu' },
    { value: 'Aqida', label: 'asoslari' },
    { value: 'Manbali', label: "ma'lumot" },
  ],
  note: {
    title: "Ma'lumotlar manbasi",
    text:
      "Matnlar O'zbekiston musulmonlari idorasining rasmiy sayti (muslim.uz) dan o'zgartirilmasdan olingan; har bir bo'lim ostida asl manbaga havola berilgan.",
  },
};
