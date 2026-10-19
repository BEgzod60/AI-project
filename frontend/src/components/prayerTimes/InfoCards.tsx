import type { ReactNode } from 'react';
import { weekdays } from '../../utils/constants';
import { useI18n } from '../../i18n';
import { cityLabel, hijriDate, qiblaBearing, type ClockNow } from './clock';

function InfoCard({ icon, label, value, note, className = '' }: { icon: ReactNode; label: string; value: string; note: string; className?: string }) {
  return (
    // Telefonda — ixcham (2 ustun), sm+ — avvalgidek
    <div className={`flex items-start gap-3 rounded-2xl bg-primary-900 p-3 text-white shadow-sm ring-1 ring-white/5 sm:items-center sm:gap-4 sm:rounded-3xl sm:p-5 ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent-400 ring-1 ring-white/10 sm:h-14 sm:w-14 sm:rounded-2xl max-sm:[&>svg]:h-7 max-sm:[&>svg]:w-7">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-white/65">{label}</p>
        <p className="font-display text-base font-bold leading-tight tabular-nums sm:text-xl">{value}</p>
        <p className="line-clamp-2 text-[11px] leading-snug text-white/65 sm:line-clamp-none sm:text-xs sm:leading-snug">{note}</p>
      </div>
    </div>
  );
}

/** Kompas: strelka qibla yo'nalishiga buriladi (shimol — yuqori) */
function Compass({ bearing }: { bearing: number }) {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden>
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
      <text x="20" y="9" textAnchor="middle" fontSize="6" fill="currentColor" fillOpacity=".7">N</text>
      <g transform={`rotate(${bearing} 20 20)`}>
        <path d="M20 7 23.5 20h-7L20 7Z" fill="currentColor" />
        <path d="M20 33 16.5 20h7L20 33Z" fill="currentColor" fillOpacity=".3" />
      </g>
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
  );
}

export function InfoCards({ region, now }: { region: string; now: ClockNow }) {
  const { t, lang } = useI18n();
  const bearing = qiblaBearing(region);
  const hijri = hijriDate(now.date, lang);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-1">
      {bearing !== null && (
        <InfoCard
          icon={<Compass bearing={bearing} />}
          label={t('Qibla yo‘nalishi', 'Направление киблы')}
          value={`${Math.round(bearing)}°`}
          note={t(`${cityLabel(region, lang)} uchun, shimoldan soat mili bo‘yicha`, `Для г. ${cityLabel(region, lang)}, от севера по часовой стрелке`)}
        />
      )}
      <InfoCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 7v5l3 2" />
          </svg>
        }
        className="order-last col-span-2 sm:order-none sm:col-span-1"
        label={t('Hozirgi vaqt', 'Текущее время')}
        value={now.time}
        note={t('Toshkent vaqti (UTC+5)', 'Ташкентское время (UTC+5)')}
      />
      {hijri && (
        <InfoCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8" aria-hidden>
              <path strokeLinejoin="round" d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />
            </svg>
          }
          label={t('Hijriy sana', 'Дата по хиджре')}
          value={hijri}
          note={`${weekdays(lang)[now.weekday]} · ${t('Umm al-Quro taqvimi, ±1 kun farq bo‘lishi mumkin', 'календарь Умм аль-Кура, возможна разница ±1 день')}`}
        />
      )}
    </div>
  );
}
