import { formatCountdown } from '../../utils/formatTime';
import { useT } from '../../i18n';

interface PrayerTimerProps {
  /** Keyingi namoz nomi */
  name: string;
  /** Qolgan vaqt (sekund) */
  remaining: number;
}

export function PrayerTimer({ name, remaining }: PrayerTimerProps) {
  const t = useT();
  return (
    <div className="text-center">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/80">{t('Keyingi namoz', 'Следующий намаз')}</p>
      <p className="text-sm font-bold text-white">{name}</p>
      <p className="mt-0.5 font-display text-[1.75rem] font-bold leading-tight tabular-nums text-white lg:text-3xl">{formatCountdown(remaining)}</p>
    </div>
  );
}
