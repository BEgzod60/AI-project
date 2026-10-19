import { Link } from 'react-router-dom';
import { useT } from '../../i18n';

interface Crumb {
  label: string;
  to?: string;
}

/** "Bosh sahifa › Namoz › ..." navigatsiya zanjiri (to'q fon uchun) */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const t = useT();
  return (
    <nav aria-label={t('Navigatsiya zanjiri', 'Навигационная цепочка')} className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-white/40">›</span>}
            {c.to ? (
              <Link to={c.to} className="text-emerald-300 transition hover:text-emerald-200">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-white/90">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
