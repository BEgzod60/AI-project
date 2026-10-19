import { useEffect, useRef } from 'react';
import { PRAYER_LABELS, prayerLabel } from '../../utils/constants';
import type { PrayerDay, PrayerTimings } from '../../types/prayer';
import { useI18n } from '../../i18n';

interface MonthTableProps {
  days: PrayerDay[];
}

/** Mahalliy sana 'YYYY-MM-DD' */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Oylik namoz vaqtlari jadvali (ota flex konteynerning qolgan balandligini egallaydi); bugungi kun ajratib ko'rsatiladi va ko'rinishga suriladi */
export function MonthTable({ days }: MonthTableProps) {
  const { t, lang } = useI18n();
  const today = todayIso();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const box = scrollRef.current;
    const row = todayRef.current;
    if (!box) return;
    // Faqat jadval ichida suramiz (sahifa o'zi siljimasligi uchun)
    box.scrollTop = row ? row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2 : 0;
  }, [days]);

  return (
    <div ref={scrollRef} className="relative mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-primary-900/40">
      <table className="w-full text-center text-[11px] tabular-nums">
        <thead className="sticky top-0 bg-primary-900 text-white/60">
          <tr>
            <th scope="col" className="py-2 pl-3 text-left font-semibold">{t('Kun', 'День')}</th>
            {PRAYER_LABELS.map(({ key }) => (
              <th key={key} scope="col" className="px-1 py-2 font-semibold">
                {prayerLabel(key, lang).slice(0, 4)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const isToday = day.date === today;
            return (
              <tr
                key={day.date}
                ref={isToday ? todayRef : undefined}
                className={isToday ? 'bg-white/10 font-bold text-accent-400' : 'text-white/85 even:bg-white/[0.03]'}
              >
                <td className="py-1.5 pl-3 text-left">{Number(day.date.slice(8, 10))}</td>
                {PRAYER_LABELS.map(({ key }) => (
                  <td key={key} className="px-1 py-1.5">
                    {day.timings[key as keyof PrayerTimings]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
