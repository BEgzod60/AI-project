import type { ReactNode } from 'react';
import { WEEKDAYS_UZ } from '../../utils/constants';
import { REGION_COORDS, hijriDate, qiblaBearing, type ClockNow } from './clock';

function InfoCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-primary-900 p-5 text-white shadow-sm ring-1 ring-white/5">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-accent-400 ring-1 ring-white/10">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-white/65">{label}</p>
        <p className="font-display text-xl font-bold tabular-nums">{value}</p>
        <p className="text-xs leading-snug text-white/65">{note}</p>
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
  const bearing = qiblaBearing(region);
  const hijri = hijriDate(now.date);

  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
      {bearing !== null && (
        <InfoCard
          icon={<Compass bearing={bearing} />}
          label="Qibla yo‘nalishi"
          value={`${Math.round(bearing)}°`}
          note={`${REGION_COORDS[region]?.city ?? region} uchun, shimoldan soat mili bo‘yicha`}
        />
      )}
      <InfoCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 7v5l3 2" />
          </svg>
        }
        label="Hozirgi vaqt"
        value={now.time}
        note="Toshkent vaqti (UTC+5)"
      />
      {hijri && (
        <InfoCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8" aria-hidden>
              <path strokeLinejoin="round" d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />
            </svg>
          }
          label="Hijriy sana"
          value={hijri}
          note={`${WEEKDAYS_UZ[now.weekday]} · Umm al-Quro taqvimi, ±1 kun farq bo‘lishi mumkin`}
        />
      )}
    </div>
  );
}
