import { prayerName, rakatLabel } from '../../utils/prayerNames';
import { Link } from 'react-router-dom';
import type { PrayerCategory, PrayerCategoryIcon, RakatKind } from '../../types/learning';
import { PrayerIcon } from '../prayerTimes/PrayerIcons';
import { TopicIconSvg } from '../namoz/NamozIcons';
import { ArrowRightIcon } from '../common/Icons';
import { useI18n } from '../../i18n';

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
  const { t, lang } = useI18n();
  if (!category.rakats) return null;
  const pad = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-[11px]';
  if (!category.rakat_breakdown.length) {
    return <p className={`inline-block rounded-full bg-white/10 font-semibold text-white ring-1 ring-white/20 ${pad}`}>{category.rakats}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={`${t('Rakatlar', 'Ракааты')}: ${category.rakats}`}>
      {category.rakat_breakdown.map((r, i) => (
        <li key={i} className={`rounded-full font-semibold tabular-nums ${pad} ${KIND_STYLE[r.kind]}`}>
          {rakatLabel(r.count, r.kind, lang)}
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
  const { t, lang } = useI18n();

  return (
    <Link
      to={`/namoz-organish/${category.slug}`}
      // Telefon/planshet: ixcham 2–3 ustunli karta; desktop — avvalgi katta karta
      className="tap-press group relative flex h-full min-h-[170px] flex-col overflow-hidden rounded-2xl bg-primary-900 p-3.5 text-white lg:min-h-[250px] lg:rounded-3xl lg:p-5 shadow-sm ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-900/30 hover:ring-accent-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
    >
      {category.image && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: BACKDROP(category.image) }}
        />
      )}

      <div className="relative flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
        <span className="font-display text-base font-bold tabular-nums text-accent-400 lg:text-xl">
          {String(category.number).padStart(2, '0')}
        </span>
        <span className="text-accent-400">
          <CategoryIcon icon={category.icon} className="h-5 w-5 lg:h-7 lg:w-7" />
        </span>
        {!verified && (
          <span className="rounded-full lg:ml-auto bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-300/40">
            {t('Tekshirilmoqda', 'На проверке')}
          </span>
        )}
      </div>

      <h3 className="relative mt-2 font-display text-base font-bold leading-snug lg:mt-3 lg:text-xl">{prayerName(category.slug, category.name, lang)}</h3>
      <p className="relative mt-1 line-clamp-2 text-[13px] leading-snug text-white/75 lg:line-clamp-none lg:max-w-[70%] lg:text-sm lg:leading-relaxed">
        {verified ? category.description : t('Ma’lumot manba bilan tekshirilmoqda.', 'Данные проверяются по источнику.')}
      </p>
      {verified && (
        <div className="relative mt-2 lg:mt-3 lg:max-w-[75%]">
          <RakatChips category={category} />
        </div>
      )}

      <div className="relative mt-auto hidden pt-5 lg:block">
        <span className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-black/20 transition group-hover:bg-accent-400 group-hover:text-primary-900">
          {t('O‘rganish', 'Изучить')}
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
