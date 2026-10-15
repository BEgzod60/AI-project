import type { TopicTheme } from '../../types/namoz';

export interface ThemeClasses {
  /** Karta foni va asosiy matn rangi */
  card: string;
  number: string;
  summary: string;
  iconBadge: string;
  /** Katta fon ikonkasi va arka chizig'i */
  watermark: string;
  button: string;
  badge: string;
  /** Rasm ustidagi gradient rangi (RGB kanallari, masalan '248 236 210') — chapda shaffof emas, o'ngda shaffof */
  fadeRgb: string;
  dark: boolean;
}

/** Mavzu rang uslublari: yorug' (cream/gold/sand) va to'q (emerald/forest/teal) */
export const TOPIC_THEMES: Record<TopicTheme, ThemeClasses> = {
  cream: {
    card: 'bg-gradient-to-br from-[#fdf8ec] via-[#f8ecd2] to-[#efdcb4] text-neutral-900',
    number: 'text-primary-600',
    summary: 'text-neutral-600',
    iconBadge: 'bg-primary-600 text-white',
    watermark: 'text-primary-900/[0.07]',
    button: 'bg-primary-800 text-white group-hover:bg-primary-700',
    badge: 'bg-white/70 text-neutral-600 ring-1 ring-black/5',
    fadeRgb: '248 236 210',
    dark: false,
  },
  gold: {
    card: 'bg-gradient-to-br from-[#fcf1d6] via-[#f2d79a] to-[#e2b660] text-neutral-900',
    number: 'text-[#8a5a00]',
    summary: 'text-neutral-700',
    iconBadge: 'bg-[#8a5a00] text-white',
    watermark: 'text-[#6b4500]/[0.10]',
    button: 'bg-primary-800 text-white group-hover:bg-primary-700',
    badge: 'bg-white/60 text-neutral-700 ring-1 ring-black/5',
    fadeRgb: '242 215 154',
    dark: false,
  },
  sand: {
    card: 'bg-gradient-to-br from-[#faf6ef] via-[#efe5d3] to-[#dfcfb2] text-neutral-900',
    number: 'text-[#7a5a2e]',
    summary: 'text-neutral-600',
    iconBadge: 'bg-[#7a5a2e] text-white',
    watermark: 'text-[#5a3f1a]/[0.08]',
    button: 'bg-primary-800 text-white group-hover:bg-primary-700',
    badge: 'bg-white/70 text-neutral-600 ring-1 ring-black/5',
    fadeRgb: '239 229 211',
    dark: false,
  },
  emerald: {
    card: 'bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white',
    number: 'text-accent-400',
    summary: 'text-white/80',
    iconBadge: 'bg-white/15 text-accent-400 ring-1 ring-white/20',
    watermark: 'text-white/[0.08]',
    button: 'bg-accent-400 text-primary-900 group-hover:bg-accent-500',
    badge: 'bg-black/20 text-white/80 ring-1 ring-white/15',
    fadeRgb: '18 92 49',
    dark: true,
  },
  forest: {
    card: 'bg-gradient-to-br from-[#11502f] via-[#0b3a22] to-[#052012] text-white',
    number: 'text-accent-400',
    summary: 'text-white/75',
    iconBadge: 'bg-white/10 text-accent-400 ring-1 ring-white/15',
    watermark: 'text-accent-400/[0.10]',
    button: 'bg-primary-500 text-white group-hover:bg-primary-600',
    badge: 'bg-black/25 text-white/80 ring-1 ring-white/15',
    fadeRgb: '11 58 34',
    dark: true,
  },
  teal: {
    card: 'bg-gradient-to-br from-[#14706a] via-[#0e524d] to-[#08322f] text-white',
    number: 'text-[#f2d79a]',
    summary: 'text-white/80',
    iconBadge: 'bg-white/15 text-[#f2d79a] ring-1 ring-white/20',
    watermark: 'text-white/[0.08]',
    button: 'bg-[#f2d79a] text-[#08322f] group-hover:bg-[#e9c47a]',
    badge: 'bg-black/20 text-white/80 ring-1 ring-white/15',
    fadeRgb: '14 82 77',
    dark: true,
  },
};

export function themeOf(theme: TopicTheme): ThemeClasses {
  return TOPIC_THEMES[theme] ?? TOPIC_THEMES.emerald;
}

/** '1' -> '01' */
export function topicNumber(n: number): string {
  return String(n).padStart(2, '0');
}

/** Butun kartani qoplovchi fon qatlamlari: ko'p bosqichli gradient + rasm (cover, center) */
export function imageBackground(fadeRgb: string, image: string): string {
  const c = (alpha: number) => `rgb(${fadeRgb} / ${alpha})`;
  const gradient = `linear-gradient(to right, ${c(1)} 0%, ${c(0.97)} 30%, ${c(0.88)} 45%, ${c(0.62)} 62%, ${c(0.28)} 80%, ${c(0)} 100%)`;
  return `${gradient}, url("${image}")`;
}
