interface PrayerCardProps {
  name: string;
  time: string;
  tag?: string;
  active?: boolean;
}

export function PrayerCard({ name, time, tag, active = false }: PrayerCardProps) {
  return (
    <li
      className={`flex items-center justify-between rounded-xl px-3 py-2 transition ${
        active ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-accent-400' : 'bg-white/25'}`}
        />
        <span className={`text-sm font-semibold ${active ? 'text-accent-400' : 'text-white/90'}`}>{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {tag && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white/60 ring-1 ring-white/15">
            {tag}
          </span>
        )}
        <span className={`text-sm font-bold tabular-nums ${active ? 'text-accent-400' : 'text-white'}`}>
          {time}
        </span>
      </div>
    </li>
  );
}
