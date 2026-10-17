import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../services/api';
import { sendContactMessage } from '../../services/contactService';

/** Loyiha egasi bilan bog'lanish ma'lumotlari. Havolasi bo'sh bo'lganlari ko'rsatilmaydi. */
const CONTACTS: { label: string; value: string; href: string; icon: ReactNode }[] = [
  {
    label: 'Telefon',
    value: '+998 93 384 93 50',
    href: 'tel:+998933849350',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  },
  {
    label: 'Email',
    value: 'begzodmavlonov250@gmail.com',
    href: 'mailto:begzodmavlonov250@gmail.com',
    icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" /></>,
  },
];

/** Ijtimoiy tarmoqlar — havola qo'shilsa, kartasi chiqadi */
const SOCIALS: { label: string; href: string; icon: ReactNode }[] = [
  { label: 'GitHub', href: 'https://github.com/BEgzod60', icon: <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" fill="currentColor" stroke="none" /> },
  { label: 'Instagram', href: 'https://instagram.com/bakht1yorviich', icon: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></> },
  { label: 'Telegram', href: 'https://t.me/begzodmavlonov', icon: <path strokeLinejoin="round" d="m21 4-18 7.5 6 2L11 20l3.5-4.5L19 19Z M9 13.5 19 6" /> },
];

const LIMITS = { name: 100, contact: 100, message: 2000 };

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>{children}</svg>;
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

export function ContactSection() {
  const [form, setForm] = useState({ name: '', contact: '', message: '', website: '' });
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const socials = SOCIALS.filter((s) => s.href);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2 || form.message.trim().length < 5) {
      setStatus({ kind: 'error', message: 'Ismingiz va xabaringizni yozing (xabar kamida 5 belgi).' });
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      await sendContactMessage(form);
      setStatus({ kind: 'sent' });
      setForm({ name: '', contact: '', message: '', website: '' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xabar yuborilmadi — qayta urinib ko‘ring.' });
    }
  };

  const input = 'mt-1 w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[15px] text-neutral-900 ring-1 ring-black/10 transition placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:text-white dark:ring-white/10 dark:focus:bg-neutral-800';

  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" aria-labelledby="aloqa">
      <div className="rounded-3xl bg-primary-900 p-6 text-white shadow-sm md:p-8">
        <h2 id="aloqa" className="font-display text-2xl font-bold md:text-3xl">Aloqa</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-white/75">
          Taklif, xato yoki savolingiz bo‘lsa — yozing. Xabaringiz to‘g‘ridan-to‘g‘ri loyiha muallifiga yetib boradi.
        </p>
        <ul className="mt-6 space-y-3">
          {CONTACTS.map((c) => (
            <li key={c.label}>
              <a href={c.href} className="group flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-accent-400/50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-400 text-primary-900"><Icon>{c.icon}</Icon></span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/50">{c.label}</span>
                  <span className="block truncate font-semibold">{c.value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        {socials.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold ring-1 ring-white/15 transition hover:bg-white/20">
                <Icon>{s.icon}</Icon>{s.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} noValidate className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8 dark:bg-neutral-900 dark:ring-white/10">
        <h3 className="font-display text-xl font-bold text-neutral-900 dark:text-white">Xabar yuborish</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Ismingiz <span className="text-rose-500">*</span>
            <input value={form.name} onChange={set('name')} maxLength={LIMITS.name} autoComplete="name" required className={input} placeholder="Ismingiz" />
          </label>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Telefon yoki Telegram
            <input value={form.contact} onChange={set('contact')} maxLength={LIMITS.contact} autoComplete="tel" className={input} placeholder="+998… yoki @username" />
          </label>
        </div>
        <label className="mt-4 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Xabar <span className="text-rose-500">*</span>
          <textarea value={form.message} onChange={set('message')} maxLength={LIMITS.message} rows={5} required className={`${input} resize-y`} placeholder="Taklif, xato yoki savolingiz…" />
          <span className="mt-1 block text-right text-[11px] font-normal tabular-nums text-neutral-400">{form.message.length} / {LIMITS.message}</span>
        </label>
        {/* Bot-tuzoq: ekranda ko'rinmaydi */}
        <input value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website" />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={status.kind === 'sending'}
            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
            {status.kind === 'sending' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden /> : null}
            {status.kind === 'sending' ? 'Yuborilmoqda…' : 'Yuborish'}
          </button>
          <p role="status" aria-live="polite" className="text-sm">
            {status.kind === 'sent' && <span className="font-semibold text-primary-700 dark:text-emerald-300">✓ Xabaringiz yuborildi. Rahmat!</span>}
            {status.kind === 'error' && <span className="text-rose-600 dark:text-rose-300">{status.message}</span>}
          </p>
        </div>
        <p className="mt-4 text-[11px] text-neutral-500">Xabaringiz faqat loyiha muallifiga yuboriladi va boshqa maqsadda ishlatilmaydi.</p>
      </form>
    </section>
  );
}
