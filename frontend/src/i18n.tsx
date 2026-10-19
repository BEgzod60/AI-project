/**
 * Ikki tilli interfeys: o'zbekcha (asosiy) va ruscha.
 *
 * Matnlar komponentning o'zida yonma-yon yoziladi: t('Namoz vaqtlari', 'Время намаза').
 * Diniy mazmun (namoz tartibi, mavzular) faqat rasmiy manbada ruschasi bo'lsa ruscha ko'rsatiladi —
 * aks holda o'zbekcha qoladi va bu haqda izoh chiqadi (ContentLanguageNote).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'uz' | 'ru';
export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'uz', label: 'O‘zbekcha', short: 'UZ' },
  { id: 'ru', label: 'Русский', short: 'RU' },
];

const KEY = 'iymon-lang';
const TITLES: Record<Lang, string> = {
  uz: 'Iymon — Islomiy ta’lim platformasi',
  ru: 'Iymon — Исламская образовательная платформа',
};

/** React'dan tashqaridagi modullar (API so'rovlari) uchun joriy til */
let current: Lang = readInitial();
export const getLang = (): Lang => current;

function readInitial(): Lang {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'ru' || fromUrl === 'uz') return fromUrl;
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'ru' || saved === 'uz') return saved;
  } catch {
    /* localStorage yopiq bo'lishi mumkin */
  }
  return 'uz';
}

export type T = (uz: string, ru: string) => string;

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: T;
  /** Lotin/kirill sana va sonlar uchun locale */
  locale: string;
}

const Ctx = createContext<I18n>({ lang: 'uz', setLang: () => {}, t: (uz) => uz, locale: 'uz-Latn-UZ' });

export function LangProvider({ children }: { children: (lang: Lang) => ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);

  const setLang = useCallback((next: Lang) => {
    current = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* saqlab bo'lmasa ham ishlaydi */
    }
    setLangState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = TITLES[lang];
  }, [lang]);

  const value = useMemo<I18n>(() => ({
    lang,
    setLang,
    t: (uz, ru) => (lang === 'ru' ? ru : uz),
    locale: lang === 'ru' ? 'ru-RU' : 'uz-Latn-UZ',
  }), [lang, setLang]);

  // Til almashsa sahifalar qayta yuklanadi — ma'lumotlar yangi tilda olinadi
  return <Ctx.Provider value={value}>{children(lang)}</Ctx.Provider>;
}

export function useI18n(): I18n {
  return useContext(Ctx);
}

export function useT(): T {
  return useContext(Ctx).t;
}
