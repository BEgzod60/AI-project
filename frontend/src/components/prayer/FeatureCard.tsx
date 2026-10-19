import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowRightIcon } from '../common/Icons';

interface FeatureCardProps {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}

/** Bosh sahifadagi 7 ta bo'lim kartasi — har ikki rejimda ham oq (hover effekti — index.css dagi .card-neon).
 *  Telefonda — ixcham gorizontal karta (ikonka + nom), desktopda — baland karta. */
export function FeatureCard({ to, icon, title, subtitle }: FeatureCardProps) {
  return (
    <Link
      to={to}
      className="card-neon group flex h-full min-h-[64px] items-center gap-3 rounded-2xl bg-white p-3 text-neutral-800 shadow-sm ring-1 ring-black/5 lg:min-h-[190px] lg:flex-col lg:items-stretch lg:justify-between lg:gap-0 lg:rounded-3xl lg:p-5"
    >
      <div className="flex min-w-0 items-center gap-3 lg:block">
        <div className="card-neon-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 lg:h-11 lg:w-11 lg:rounded-2xl">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="card-neon-title font-display text-[14px] font-bold leading-snug sm:text-[15px] lg:mt-4 lg:text-lg lg:leading-snug">{title}</h3>
          <p className="card-neon-subtitle mt-1 hidden text-xs text-neutral-500 md:line-clamp-1 lg:line-clamp-none lg:block">{subtitle}</p>
        </div>
      </div>
      <span className="card-neon-arrow mt-3 hidden h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 lg:inline-flex">
        <ArrowRightIcon className="h-4 w-4" />
      </span>
    </Link>
  );
}
