import type { BirgaSession } from '../../types/birga';

const linkCls = 'underline decoration-white/30 underline-offset-2 hover:text-white';

/** muslim.uz foydalanish sharti: «Ўзбекистон мусулмонлари идораси расмий веб-портали хабар беради» (havola bilan) */
export function MuslimUzAttribution({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-white/45 ${className}`}>
      O‘zbekiston musulmonlari idorasi{' '}
      <a href="https://muslim.uz/uz" target="_blank" rel="noopener noreferrer" className={linkCls}>rasmiy veb-portali</a>{' '}
      xabar beradi.
    </p>
  );
}

/** Bitta matnning manbasi: «Manba: … ↗» */
export function SourceLine({ title, url, prefix = 'Manba', className = '' }: { title?: string; url?: string; prefix?: string; className?: string }) {
  if (!title && !url) return null;
  return (
    <p className={`text-[11px] leading-snug text-white/45 ${className}`}>
      <span className="font-semibold text-white/55">{prefix}:</span>{' '}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={linkCls}>{title || url} ↗</a>
      ) : (
        <span>{title}</span>
      )}
    </p>
  );
}

/** Rejimda ishlatilgan barcha manbalar — guruhlab, ochiladigan ro'yxat */
export function SourcesList({ sources }: { sources: BirgaSession['sources'] }) {
  if (!sources?.length) return null;
  const groups = [...new Set(sources.map((s) => s.group))];
  return (
    <details className="group rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
      <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-2 text-sm font-bold text-white/80">
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-accent-400" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 21h12" /></svg>
          Manbalar ({sources.length})
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-white/50 transition group-open:rotate-180" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <div key={g}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent-400/80">{g}</p>
            <ul className="mt-1 space-y-1">
              {sources.filter((s) => s.group === g).map((s) => (
                <li key={`${s.url}|${s.title}`} className="text-xs leading-snug text-white/65">
                  {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.title} ↗</a> : <span className="italic text-white/50">{s.title}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <MuslimUzAttribution />
      </div>
    </details>
  );
}
