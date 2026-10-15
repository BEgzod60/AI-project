import { formatCountdown } from '../../utils/formatTime';

interface PrayerTimerProps {
  /** Keyingi namoz nomi */
  name: string;
  /** Qolgan vaqt (sekund) */
  remaining: number;
}

export function PrayerTimer({ name, remaining }: PrayerTimerProps) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/80">Keyingi namoz</p>
      <p className="text-sm font-bold text-white">{name}</p>
      <p className="mt-0.5 font-display text-3xl font-bold tabular-nums text-white">{formatCountdown(remaining)}</p>
    </div>
  );
}
