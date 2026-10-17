import { useState, type FormEvent, type ReactNode } from 'react';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { ApiError, apiPost } from '../../services/api';

interface IssuedKey {
  key: string;
  prefix: string;
  name: string;
  daily_limit: number;
}

const BASE = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1`;

const ENDPOINTS: { path: string; params?: string; text: string }[] = [
  { path: '/prayer-times/', params: 'city, date (DD-MM-YYYY)', text: 'Shahar bo‘yicha kunlik namoz vaqtlari' },
  { path: '/prayer-times/month/', params: 'city, month, year', text: 'Oylik namoz vaqtlari' },
  { path: '/surahs/', text: '114 sura ro‘yxati' },
  { path: '/surahs/{raqam}/', text: 'Sura: arabcha oyatlar, o‘zbekcha ma’no, o‘qilishi, audio' },
  { path: '/prayers/', text: 'Namoz turlari (bomdod, peshin…) va rakatlari' },
  { path: '/prayers/{slug}/lesson/', text: 'Namoz tartibi: qadamlar, rasmlar, sura va duolar' },
  { path: '/prayers/{slug}/sequence/', params: 'qism', text: 'Namozning to‘liq ketma-ketligi (rakatlar, zikrlar, vaqtlar)' },
  { path: '/topics/namoz/', text: '«Namoz» bo‘limi mavzulari' },
  { path: '/topics/namoz/{slug}/', text: 'Mavzu: bo‘limlar, matn va manbalar' },
  { path: '/topics/iymon/', text: '«Iymon» bo‘limi mavzulari' },
  { path: '/me/', text: 'Kalitingiz holati va bugungi sarf' },
];

const ERRORS: [string, string, string][] = [
  ['401', 'missing_key / invalid_key', 'Kalit yuborilmagan yoki noto‘g‘ri'],
  ['403', 'disabled_key', 'Kalit o‘chirilgan'],
  ['429', 'rate_limited', 'Kunlik limit tugagan (ertaga yangilanadi)'],
  ['404', 'not_found', 'Bunday sura, namoz yoki mavzu yo‘q'],
];

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* nusxalab bo'lmasa — matnni qo'lda belgilash mumkin */
    }
  };
  return (
    <div className="group relative min-w-0">
      <pre className="overflow-x-auto rounded-2xl bg-neutral-950 p-4 pr-24 text-[13px] leading-relaxed text-emerald-200 ring-1 ring-white/10"><code>{children}</code></pre>
      <button type="button" onClick={copy} className="absolute right-2 top-2 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white opacity-80 transition hover:bg-white/20 hover:opacity-100">
        {copied ? '✓ Nusxalandi' : 'Nusxalash'}
      </button>
    </div>
  );
}

function Card({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8 dark:bg-neutral-900 dark:ring-white/10">
      <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</div>
    </section>
  );
}

function KeyForm() {
  const [form, setForm] = useState({ name: '', email: '', agree: false, website: '' });
  const [state, setState] = useState<{ kind: 'idle' | 'sending' } | { kind: 'done'; key: IssuedKey } | { kind: 'error'; message: string }>({ kind: 'idle' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ kind: 'sending' });
    try {
      const key = await apiPost<IssuedKey>('/dev/keys/', form);
      setState({ kind: 'done', key });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Kalit olinmadi — qayta urinib ko‘ring.' });
    }
  };

  const input = 'mt-1 w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[15px] text-neutral-900 ring-1 ring-black/10 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:text-white dark:ring-white/10';

  if (state.kind === 'done') {
    return (
      <div className="space-y-3" role="status">
        <p className="font-semibold text-primary-700 dark:text-emerald-300">✓ «{state.key.name}» uchun API kalit tayyor</p>
        <Code>{state.key.key}</Code>
        <p className="rounded-xl bg-accent-100 px-3 py-2 text-sm text-neutral-800 ring-1 ring-accent-400/40 dark:bg-accent-500/10 dark:text-neutral-200">
          <strong>Kalitni hozir saqlab qo‘ying</strong> — xavfsizlik uchun u bazada saqlanmaydi va qayta ko‘rsatilmaydi.
          Kunlik limit: {state.key.daily_limit} so‘rov.
        </p>
        <button type="button" onClick={() => setState({ kind: 'idle' })} className="text-sm font-semibold text-primary-700 underline dark:text-emerald-300">Yana kalit olish</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Ilova yoki loyiha nomi
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} required className={input} placeholder="Masalan: Namoz vaqtlari bot" />
        </label>
        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" className={input} placeholder="siz@example.com" />
        </label>
      </div>
      <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
        <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-primary-600" />
        <span><a href="#shartlar" className="font-semibold text-primary-700 underline dark:text-emerald-300">Foydalanish shartlari</a>ga roziman: ma’lumotlar manbasini ko‘rsataman va matnlarni o‘zgartirmayman.</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state.kind === 'sending'} className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
          {state.kind === 'sending' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />}
          API kalit olish
        </button>
        {state.kind === 'error' && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{state.message}</p>}
      </div>
    </form>
  );
}

export function DeveloperPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <section className="relative overflow-hidden rounded-3xl bg-primary-900 p-6 text-white md:p-10">
        <div aria-hidden className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative">
          <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: 'Dasturchilar uchun API' }]} />
          <h1 className="mt-5 font-display text-4xl font-extrabold md:text-5xl">Dasturchilar uchun <span className="text-accent-400">API</span></h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            Namoz vaqtlari, Qur’on suralari, namoz tartibi va «Namoz», «Iymon» mavzularini o‘z ilovangiz, botingiz yoki saytingizda ishlating.
            Bepul API kalit oling — kuniga {1000} tagacha so‘rov.
          </p>
          <code className="mt-5 inline-block break-all rounded-xl bg-black/30 px-3 py-2 text-sm text-emerald-200 ring-1 ring-white/10">{BASE}</code>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6">
        <Card id="kalit" title="1. API kalit oling">
          <KeyForm />
        </Card>

        <Card id="foydalanish" title="2. So‘rov yuboring">
          <p>Kalitni har bir so‘rovda <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-white/10">X-API-Key</code> sarlavhasida yuboring. Javoblar JSON formatida.</p>
          <p className="text-sm font-semibold">cURL</p>
          <Code>{`curl -H "X-API-Key: SIZNING_KALITINGIZ" \\\n  "${BASE}/prayer-times/?city=Toshkent"`}</Code>
          <p className="text-sm font-semibold">JavaScript</p>
          <Code>{`const res = await fetch('${BASE}/surahs/112/', {\n  headers: { 'X-API-Key': 'SIZNING_KALITINGIZ' },\n});\nconst sura = await res.json();\nconsole.log(sura.name_uz, sura.ayahs.length);`}</Code>
          <p className="text-sm font-semibold">Python</p>
          <Code>{`import requests\n\nr = requests.get('${BASE}/prayer-times/',\n                 params={'city': 'Samarqand'},\n                 headers={'X-API-Key': 'SIZNING_KALITINGIZ'})\nprint(r.json()['timings'])`}</Code>
          <p className="text-sm font-semibold">Javob namunasi</p>
          <Code>{`{\n  "city": "Toshkent",\n  "date": "2026-10-17",\n  "timings": { "bomdod": "05:18", "quyosh": "06:37", "peshin": "12:08",\n               "asr": "15:56", "shom": "17:44", "xufton": "18:58" },\n  "source": "islom.uz",\n  "timezone": "Asia/Tashkent"\n}`}</Code>
          <p className="text-sm text-neutral-500">Kalitni brauzerdagi ochiq kodga emas, server tomoniga (bot, backend) joylashtirish tavsiya etiladi.</p>
        </Card>

        <Card id="endpointlar" title="Endpointlar">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-neutral-500"><tr><th className="py-2 pr-4">GET</th><th className="py-2 pr-4">Parametrlar</th><th className="py-2">Nima qaytaradi</th></tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {ENDPOINTS.map((e) => (
                  <tr key={e.path}>
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-primary-700 dark:text-emerald-300">{e.path}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-neutral-500">{e.params ?? '—'}</td>
                    <td className="py-2.5">{e.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
          <Card id="limitlar" title="Limit va xatolar">
            <p>Har bir kalit uchun <strong>kuniga 1000 so‘rov</strong>. Qolgan miqdor har javobning <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-white/10">X-RateLimit-Remaining</code> sarlavhasida.</p>
            <ul className="space-y-2 text-sm">
              {ERRORS.map(([status, code, text]) => (
                <li key={code} className="flex gap-3"><span className="w-10 shrink-0 font-mono font-bold text-rose-600 dark:text-rose-300">{status}</span><span><code className="text-[13px]">{code}</code> — {text}</span></li>
              ))}
            </ul>
            <Code>{`{ "error": { "code": "rate_limited", "message": "Kunlik limit (1000 so‘rov) tugadi. Ertaga yangilanadi." } }`}</Code>
          </Card>

          <Card id="shartlar" title="Foydalanish shartlari">
            <ul className="list-disc space-y-2 pl-5 text-sm">
              <li><strong>Manbani ko‘rsating.</strong> Namoz va Iymon matnlari — O‘zbekiston musulmonlari idorasi (muslim.uz); ilovangizda «O‘zbekiston musulmonlari idorasi rasmiy veb-portali xabar beradi» deb, muslim.uz havolasi bilan yozing.</li>
              <li><strong>Qur’on matni</strong> — Tanzil Project (CC BY 3.0): manba va litsenziyani ko‘rsating, matnni o‘zgartirmang.</li>
              <li><strong>O‘zbekcha ma’no</strong> (Muhammad Sodiq Muhammad Yusuf tarjimasi) — faqat notijoriy foydalanish uchun.</li>
              <li><strong>Namoz vaqtlari</strong> — islom.uz ma’lumotlari asosida; javobdagi <code>source</code> maydonini ko‘rsating.</li>
              <li>Diniy matnlarni o‘zgartirmang va ularni fatvo sifatida taqdim etmang.</li>
              <li>Suiste’mol qilingan kalitlar ogohlantirishsiz o‘chiriladi.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
