import type { SourceReference, TopicSection } from '../../types/namoz';

/** Matnni xatboshilarga ajratadi (har bir bo'sh bo'lmagan qator — alohida xatboshi) */
function Paragraphs({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split('\n').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  return (
    <div className={`space-y-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300 ${className}`}>
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Sources({ sources, reviewedBy }: { sources: SourceReference[]; reviewedBy: string }) {
  return (
    <footer className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Manbalar</p>
      <ol className="mt-2 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
        {sources.map((s, i) => {
          const label = [s.title, s.author, s.reference].filter(Boolean).join(' — ');
          return (
            <li key={i} className="flex gap-2">
              <span className="tabular-nums text-neutral-400">{i + 1}.</span>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-neutral-300 underline-offset-2 hover:text-primary-600">
                  {label}
                </a>
              ) : (
                <span>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
      {reviewedBy && <p className="mt-3 text-xs text-neutral-500">Tekshirdi: {reviewedBy}</p>}
    </footer>
  );
}

function Steps({ items }: { items: TopicSection['items'] }) {
  return (
    <ol className="mt-5 space-y-0">
      {items.map((item, i) => (
        <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Bosqichlarni bog'lovchi chiziq */}
          {i < items.length - 1 && <span aria-hidden className="absolute left-[17px] top-10 h-[calc(100%-2.5rem)] w-px bg-primary-100 dark:bg-primary-800" />}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white tabular-nums">
            {i + 1}
          </span>
          <div className="pt-1.5">
            <h4 className="font-display font-bold text-neutral-900 dark:text-white">{item.title}</h4>
            {item.body && <Paragraphs text={item.body} className="mt-1 !text-sm" />}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Cards({ items }: { items: TopicSection['items'] }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-2xl bg-primary-50 p-5 ring-1 ring-primary-100 dark:bg-primary-900/30 dark:ring-primary-800">
          <h4 className="font-display font-bold text-primary-800 dark:text-emerald-300">{item.title}</h4>
          {item.body && <Paragraphs text={item.body} className="mt-2 !text-sm" />}
        </div>
      ))}
    </div>
  );
}

/** Mavzu sahifasidagi bitta tuzilgan bo'lim */
export function SectionBlock({ section }: { section: TopicSection }) {
  const isNote = section.kind === 'note';

  return (
    <section
      id={`bolim-${section.id}`}
      className={`scroll-mt-24 rounded-3xl p-6 shadow-sm ring-1 md:p-8 ${
        isNote
          ? 'bg-accent-100 ring-accent-400/40 dark:bg-accent-500/10'
          : 'bg-white ring-black/5 dark:bg-neutral-900 dark:ring-white/10'
      }`}
    >
      <h2 className="font-display text-xl font-bold text-neutral-900 md:text-2xl dark:text-white">{section.title}</h2>
      <Paragraphs text={section.body} className="mt-3" />
      {section.content_html && (
        // Backend nh3 bilan faqat ruxsat etilgan teglarni qoldiradi (apps/namoz/sanitize.py)
        <div className="namoz-content mt-3" dangerouslySetInnerHTML={{ __html: section.content_html }} />
      )}
      {section.kind === 'steps' && section.items.length > 0 && <Steps items={section.items} />}
      {section.kind === 'cards' && section.items.length > 0 && <Cards items={section.items} />}
      {/* text/note turida elementlar bo'lsa — oddiy kartalar sifatida */}
      {(section.kind === 'text' || isNote) && section.items.length > 0 && <Cards items={section.items} />}
      <Sources sources={section.sources} reviewedBy={section.reviewed_by} />
    </section>
  );
}
