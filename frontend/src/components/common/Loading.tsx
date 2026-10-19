import { useT } from '../../i18n';
export function Spinner({ className = 'h-8 w-8' }: { className?: string }) {
  const t = useT();
  return (
    <span
      role="status"
      aria-label={t('Yuklanmoqda', 'Загрузка')}
      className={`inline-block animate-spin rounded-full border-[3px] border-primary-500/30 border-t-primary-600 ${className}`}
    />
  );
}

export function Loading({ label, className = 'text-neutral-500' }: { label?: string; className?: string }) {
  const t = useT();
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <Spinner />
      <p className="text-sm">{label ?? t('Yuklanmoqda...', 'Загрузка...')}</p>
    </div>
  );
}

/** Kartocha shaklidagi skelet */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-neutral-200/70 dark:bg-neutral-800 ${className}`} />;
}
