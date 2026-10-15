import { Link } from 'react-router-dom';
import type { PrayerCategory, PrayerCategoryIcon, RakatKind } from '../../types/learning';
import { PrayerIcon } from '../prayerTimes/PrayerIcons';
import { TopicIconSvg } from '../namoz/NamozIcons';
import { ArrowRightIcon } from '../common/Icons';

const PRAYER_ICONS = new Set(['bomdod', 'peshin', 'asr', 'shom', 'xufton']);

export function CategoryIcon({ icon, className = 'h-7 w-7' }: { icon: PrayerCategoryIcon; className?: string }) {
  return PRAYER_ICONS.has(icon) ? (
    <PrayerIcon prayer={icon as 'bomdod'} className={className} />
  ) : (
    <TopicIconSvg icon={icon as 'moon'} className={className} />
  );
}

const KIND_STYLE: Record<RakatKind, string> = {
  farz: 'bg-accent-400 text-primary-900',
  vojib: 'bg-emerald-400/90 text-primary-900',
  sunnat: 'bg-white/15 text-white ring-1 ring-white/25',
  nafl: 'bg-white/10 text-white/90 ring-1 ring-white/20',
};

/** Rakatlar: tuzilgan bo'lsa rangli belgilar, aks holda manbadagi matn */
export function RakatChips({ category, size = 'sm' }: { category: PrayerCategory; size?: 'sm' | 'md' }) {
  if (!category.rakats) return null;
  const pad = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-[11px]';
  if (!category.rakat_breakdown.length) {
    return <p className={`inline-block rounded-full bg-white/10 font-semibold text-white ring-1 ring-white/20 ${pad}`}>{category.rakats}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={`Rakatlar: ${category.rakats}`}>
      {category.rakat_breakdown.map((r, i) => (
        <li key={i} className={`rounded-full font-semibold tabular-nums ${pad} ${KIND_STYLE[r.kind]}`}>
          {r.count} rakat {r.kind}
        </li>
      ))}
    </ul>
  );
}

/** Rasm butun kartani qoplaydi, chapdan to'q zumrad rangga o'tuvchi gradient bilan */
const BACKDROP = (image: string) =>
  `linear-gradient(to right, rgb(6 40 24) 0%, rgb(6 40 24 / 0.95) 35%, rgb(6 40 24 / 0.7) 60%, rgb(6 40 24 / 0.25) 85%, rgb(6 40 24 / 0.1) 100%), url("${image}")`;

export function LessonCard({ category }: { category: PrayerCategory }) {
  const verified = category.review_status === 'published';

  return (
    <Link
      to={`/namoz-organish/${category.slug}`}
      className="group relative flex h-full min-h-[250px] flex-col overflow-hidden rounded-3xl bg-primary-900 p-5 text-white shadow-sm ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-900/30 hover:ring-accent-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
    >
      {category.image && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: BACKDROP(category.image) }}
        />
      )}

      <div className="relative flex items-center gap-3">
        <span className="font-display text-xl font-bold tabular-nums text-accent-400">
          {String(category.number).padStart(2, '0')}
        </span>
        <span className="text-accent-400">
          <CategoryIcon icon={category.icon} />
        </span>
        {!verified && (
          <span className="ml-auto rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-300/40">
            Tekshirilmoqda
          </span>
        )}
      </div>

      <h3 className="relative mt-3 font-display text-xl font-bold">{category.name}</h3>
      <p className="relative mt-1 max-w-[70%] text-sm leading-relaxed text-white/75">
        {verified ? category.description : "Ma'lumot manba bilan tekshirilmoqda."}
      </p>
      {verified && (
        <div className="relative mt-3 max-w-[75%]">
          <RakatChips category={category} />
        </div>
      )}

      <div className="relative mt-auto pt-5">
        <span className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-black/20 transition group-hover:bg-accent-400 group-hover:text-primary-900">
          O‘rganish
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
