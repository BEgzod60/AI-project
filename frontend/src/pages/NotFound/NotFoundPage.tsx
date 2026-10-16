import { Link } from 'react-router-dom';

/** Topilmagan manzil uchun sahifa */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-extrabold text-primary-600">404</p>
      <h1 className="mt-4 font-display text-2xl font-extrabold text-neutral-900 dark:text-white">
        Sahifa topilmadi
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        Siz izlagan sahifa ko'chirilgan yoki o'chirilgan bo'lishi mumkin.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Bosh sahifa
        </Link>
        <Link
          to="/namoz"
          className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
        >
          Namoz bo'limi
        </Link>
        <Link
          to="/iymon"
          className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
        >
          Iymon bo'limi
        </Link>
      </div>
    </div>
  );
}
