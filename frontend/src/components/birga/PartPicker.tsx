import type { PrayerPart } from '../../types/birga';
import { useI18n, type T } from '../../i18n';
import { rakatLabel } from '../../utils/prayerNames';

const KIND_STYLE: Record<PrayerPart['kind'], { chip: string; label: [string, string] }> = {
  farz: { chip: 'bg-accent-400 text-primary-900', label: ['Farz', 'Фард'] },
  sunnat: { chip: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50', label: ['Sunnat', 'Сунна'] },
  vojib: { chip: 'bg-sky-400/20 text-sky-200 ring-1 ring-sky-300/50', label: ['Vojib', 'Ваджиб'] },
  nafl: { chip: 'bg-white/10 text-white/80 ring-1 ring-white/20', label: ['Nafl', 'Нафль'] },
};

/** Farzga nisbatan o'rni: [qisqa (telefon), to'liq] — «Oldin / Farzdan oldin», «Farz», «Keyin / Farzdan keyin» */
function position(part: PrayerPart, farzAt: number, t: T): [string, string] {
  const kind = t(...KIND_STYLE[part.kind].label);
  if (farzAt < 0 || part.kind !== 'sunnat') return [kind, kind];
  return part.index < farzAt ? [t('Oldin', 'До'), t('Farzdan oldin', 'До фарда')] : [t('Keyin', 'После'), t('Farzdan keyin', 'После фарда')];
}

interface Props {
  parts: PrayerPart[];
  value: number | null;
  onChange: (index: number) => void;
  loading?: boolean;
}

/** Qaysi rakatlarni o'qish — masalan Peshin: 4 rakat sunnat · 4 rakat farz · 2 rakat sunnat */
export function PartPicker({ parts, value, onChange, loading = false }: Props) {
  const { t, lang } = useI18n();
  if (parts.length < 2) return null;
  const farzAt = parts.find((p) => p.kind === 'farz')?.index ?? -1;

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs text-white/60">
        {t('Qaysi rakatlarni o‘qiysiz?', 'Какие ракааты читаете?')}
        {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" aria-label={t('Yuklanmoqda', 'Загрузка')} />}
      </p>
      <div role="radiogroup" aria-label={t('Namoz qismi', 'Часть намаза')} className={`grid gap-2 ${parts.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {parts.map((p, i) => {
          const active = p.index === value;
          const style = KIND_STYLE[p.kind];
          const [short, full] = position(p, farzAt, t);
          return (
            <button
              key={p.index}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!p.supported || loading}
              onClick={() => onChange(p.index)}
              title={p.supported ? rakatLabel(p.count, p.kind, lang) : t('Bu qism uchun ketma-ketlik hozircha mavjud emas', 'Для этой части последовательность пока недоступна')}
              className={`group relative flex min-h-[7.25rem] flex-col items-center justify-between overflow-hidden rounded-2xl px-1.5 pb-2.5 pt-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:cursor-not-allowed ${
                active
                  ? 'bg-gradient-to-b from-emerald-500/25 to-emerald-500/5 shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400'
                  : 'bg-black/30 ring-1 ring-white/10 hover:-translate-y-0.5 hover:bg-white/[0.06] hover:ring-emerald-400/40 disabled:opacity-40 disabled:hover:translate-y-0'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-white/50">
                <span className="mr-1 text-white/35">{i + 1}.</span>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{full}</span>
              </span>
              <span className="flex items-baseline gap-1">
                <span className={`font-display text-3xl font-extrabold tabular-nums leading-none sm:text-4xl ${active ? 'text-white' : 'text-white/85'}`}>{p.count}</span>
                <span className="text-xs text-white/60">{t('rakat', p.count >= 2 && p.count <= 4 ? 'ракаата' : 'ракаатов')}</span>
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.chip} ${active ? 'ring-2 ring-white/70' : ''}`}>
                {active && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" className="h-3 w-3" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
                {t(...style.label)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
