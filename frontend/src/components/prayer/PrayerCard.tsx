interface PrayerCardProps {
  name: string;
  time: string;
  tag?: string;
  active?: boolean;
}

export function PrayerCard({ name, time, tag, active = false }: PrayerCardProps) {
  return (
    <li
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 transition lg:flex-row lg:justify-between lg:gap-0 lg:px-3 ${
        active ? 'bg-white/10 ring-1 ring-accent-400/40 lg:ring-0' : 'bg-white/[0.04] hover:bg-white/5 lg:bg-transparent lg:hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`hidden h-1.5 w-1.5 shrink-0 rounded-full lg:block ${active ? 'bg-accent-400' : 'bg-white/25'}`}
        />
        <span className={`text-sm font-semibold ${active ? 'text-accent-400' : 'text-white/90'}`}>{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {tag && (
          <span className="hidden rounded-full px-2 py-0.5 lg:inline text-[10px] font-semibold text-white/60 ring-1 ring-white/15">
            {tag}
          </span>
        )}
        <span className={`text-[15px] font-bold tabular-nums lg:text-sm ${active ? 'text-accent-400' : 'text-white'}`}>
          {time}
        </span>
      </div>
    </li>
  );
}
