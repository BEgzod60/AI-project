import { useId, useState, type ReactNode } from 'react';

interface Props {
  title: ReactNode;
  children: ReactNode;
  /** Boshida ochiqmi (telefonda) */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Telefon/planshetda yig'iladigan bo'lim (accordion); desktopda (lg+) har doim ochiq,
 * sarlavha esa oddiy sarlavha bo'lib ko'rinadi — desktop dizayni o'zgarmaydi.
 */
export function Collapsible({ title, children, defaultOpen = false, className = '' }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left lg:pointer-events-none lg:min-h-0"
      >
        <span className="min-w-0 flex-1">{title}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-300 lg:hidden ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={id} className={open ? 'motion-safe:animate-fade-in' : 'hidden lg:block'}>
        {children}
      </div>
    </div>
  );
}
