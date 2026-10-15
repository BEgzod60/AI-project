import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowRightIcon } from '../common/Icons';

interface FeatureCardProps {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}

/** Bosh sahifadagi 7 ta bo'lim kartasi — har ikki rejimda ham oq (hover effekti — index.css dagi .card-neon) */
export function FeatureCard({ to, icon, title, subtitle }: FeatureCardProps) {
  return (
    <Link
      to={to}
      className="card-neon group flex h-full min-h-[190px] flex-col justify-between rounded-3xl bg-white p-5 text-neutral-800 shadow-sm ring-1 ring-black/5"
    >
      <div>
        <div className="card-neon-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          {icon}
        </div>
        <h3 className="card-neon-title mt-4 font-display text-lg font-bold leading-snug">{title}</h3>
        <p className="card-neon-subtitle mt-1 text-xs text-neutral-500">{subtitle}</p>
      </div>
      <span className="card-neon-arrow mt-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
        <ArrowRightIcon className="h-4 w-4" />
      </span>
    </Link>
  );
}
