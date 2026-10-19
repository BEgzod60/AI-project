import { getLang } from '../../i18n';

interface Props {
  code: 404 | 500;
  title: string;
  message: string;
}

/**
 * To'liq ekranli xato sahifasi (404, 500): sidebar va header'siz.
 * Router va til kontekstidan tashqarida ham ishlaydi (ErrorBoundary ichida) — shuning uchun oddiy <a> va getLang.
 */
export function ErrorPage({ code, title, message }: Props) {
  const ru = getLang() === 'ru';
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-primary-900 px-4 py-10 text-white">
      <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: 'url(/images/mosque.webp)' }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-primary-900/80 via-primary-900/85 to-black/90" />

      <div className="relative w-full max-w-md text-center motion-safe:animate-fade-in-up">
        <a href="/" className="mx-auto mb-8 inline-flex items-center gap-2.5" aria-label={ru ? 'Главная' : 'Bosh sahifa'}>
          <img src="/images/iymon-logo.webp" alt="" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
          <span className="bg-gradient-to-b from-[#f7e3a3] via-[#e9c46a] to-accent-500 bg-clip-text font-brand text-3xl font-bold leading-none text-transparent">Iymon</span>
        </a>

        <p className="bg-gradient-to-b from-[#f7e3a3] via-[#e9c46a] to-accent-500 bg-clip-text font-display text-[5.5rem] font-extrabold leading-none text-transparent drop-shadow-[0_4px_24px_rgb(224_160_46/0.35)] sm:text-[7rem]">
          {code}
        </p>
        <h1 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <div aria-hidden className="mx-auto mt-4 flex items-center justify-center gap-2 text-accent-400">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-accent-400/70" />
          <span className="text-xs">✦</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-accent-400/70" />
        </div>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-white/80">{message}</p>

        <div className="mt-8 grid gap-3 min-[400px]:grid-cols-2">
          <a
            href="/"
            className="tap-press inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-emerald-500 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:brightness-110"
          >
            {ru ? 'На главную' : 'Bosh sahifaga qaytish'}
          </a>
          <button
            type="button"
            onClick={() => (code === 404 ? window.history.back() : window.location.reload())}
            className="tap-press inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white/5 px-5 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/10"
          >
            {code === 404 ? (ru ? 'Назад' : 'Orqaga') : ru ? 'Повторить' : 'Qayta urinish'}
          </button>
        </div>
      </div>
    </main>
  );
}
