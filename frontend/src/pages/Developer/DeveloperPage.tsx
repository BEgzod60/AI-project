import { useState, type FormEvent, type ReactNode } from 'react';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { ApiError, apiPost } from '../../services/api';
import { useT } from '../../i18n';

interface IssuedKey {
  key: string;
  prefix: string;
  name: string;
  daily_limit: number;
}

const BASE = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1`;

type Pair = [string, string];

const ENDPOINTS: { path: string; params?: string; text: Pair }[] = [
  { path: '/prayer-times/', params: 'city, date (DD-MM-YYYY)', text: ['Shahar bo‘yicha kunlik namoz vaqtlari', 'Расписание намазов на день по городу'] },
  { path: '/prayer-times/month/', params: 'city, month, year', text: ['Oylik namoz vaqtlari', 'Расписание намазов на месяц'] },
  { path: '/surahs/', params: 'lang (uz | ru)', text: ['114 sura ro‘yxati', 'Список 114 сур'] },
  { path: '/surahs/{raqam}/', params: 'lang (uz | ru)', text: ['Sura: arabcha oyatlar, ma’no (uz — M. Sodiq, ru — Kuliev), o‘qilishi, audio', 'Сура: арабские аяты, смысл (uz — М. Содик, ru — Кулиев), транскрипция, аудио'] },
  { path: '/prayers/', text: ['Namoz turlari (bomdod, peshin…) va rakatlari', 'Виды намазов (бомдод, пешин…) и ракааты'] },
  { path: '/prayers/{slug}/lesson/', text: ['Namoz tartibi: qadamlar, rasmlar, sura va duolar', 'Порядок намаза: шаги, иллюстрации, суры и дуа (узб.)'] },
  { path: '/prayers/{slug}/sequence/', params: 'qism, lang', text: ['Namozning to‘liq ketma-ketligi (rakatlar, zikrlar, vaqtlar)', 'Полная последовательность намаза (ракааты, зикры, время)'] },
  { path: '/topics/namoz/', text: ['«Namoz» bo‘limi mavzulari', 'Темы раздела «Намаз» (узб.)'] },
  { path: '/topics/namoz/{slug}/', text: ['Mavzu: bo‘limlar, matn va manbalar', 'Тема: разделы, текст и источники (узб.)'] },
  { path: '/topics/iymon/', text: ['«Iymon» bo‘limi mavzulari', 'Темы раздела «Иман» (узб.)'] },
  { path: '/topics/zakot/', text: ['«Zakot» bo‘limi mavzulari', 'Темы раздела «Закят» (узб.)'] },
  { path: '/topics/roza/', text: ['«Ro‘za» bo‘limi mavzulari', 'Темы раздела «Пост» (узб.)'] },
  { path: '/me/', text: ['Kalitingiz holati va bugungi sarf', 'Статус ключа и расход за сегодня'] },
];

const ERRORS: [string, string, Pair][] = [
  ['401', 'missing_key / invalid_key', ['Kalit yuborilmagan yoki noto‘g‘ri', 'Ключ не передан или неверен']],
  ['403', 'disabled_key', ['Kalit o‘chirilgan', 'Ключ отключён']],
  ['429', 'rate_limited', ['Kunlik limit tugagan (ertaga yangilanadi)', 'Дневной лимит исчерпан (обновится завтра)']],
  ['404', 'not_found', ['Bunday sura, namoz yoki mavzu yo‘q', 'Такой суры, намаза или темы нет']],
];

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
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
      <pre className="overflow-x-auto rounded-2xl bg-neutral-950 p-4 pt-[3.25rem] text-[13px] lg:pr-24 lg:pt-4 leading-relaxed text-emerald-200 ring-1 ring-white/10"><code>{children}</code></pre>
      <button type="button" onClick={copy} className="absolute right-2 top-2 min-h-[40px] rounded-lg bg-white/10 px-3 py-1 text-[12px] font-semibold lg:min-h-0 lg:px-2 lg:text-[11px] text-white opacity-80 transition hover:bg-white/20 hover:opacity-100">
        {copied ? t('✓ Nusxalandi', '✓ Скопировано') : t('Nusxalash', 'Копировать')}
      </button>
    </div>
  );
}

function Card({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-20 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 md:rounded-3xl md:p-8 lg:scroll-mt-24 dark:bg-neutral-900 dark:ring-white/10">
      <h2 className="font-display text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">{title}</h2>
      <div className="mt-3 space-y-4 text-[15px] sm:mt-4 leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</div>
    </section>
  );
}

/** Kod namunalari: telefonda — tablar (bittasi ko'rinadi), desktopda — hammasi ketma-ket */
function CodeExamples({ items }: { items: { label: string; code: string }[] }) {
  const [active, setActive] = useState(0);
  const t = useT();
  return (
    <>
      <div role="tablist" aria-label={t('Kod namunalari', 'Примеры кода')} className="seg lg:hidden">
        {items.map((item, i) => (
          <button key={item.label} type="button" role="tab" aria-selected={active === i} onClick={() => setActive(i)} className="seg-btn px-1 text-[13px]">
            {item.label}
          </button>
        ))}
      </div>
      <div className="lg:space-y-4">
        {items.map((item, i) => (
          <div key={item.label} role="tabpanel" className={`space-y-4 ${active === i ? '' : 'hidden lg:block'}`}>
            <p className="hidden text-sm font-semibold lg:block">{item.label}</p>
            <Code>{item.code}</Code>
          </div>
        ))}
      </div>
    </>
  );
}

function KeyForm() {
  const [form, setForm] = useState({ name: '', email: '', agree: false, website: '' });
  const t = useT();
  const [state, setState] = useState<{ kind: 'idle' | 'sending' } | { kind: 'done'; key: IssuedKey } | { kind: 'error'; message: string }>({ kind: 'idle' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ kind: 'sending' });
    try {
      const key = await apiPost<IssuedKey>('/dev/keys/', form);
      setState({ kind: 'done', key });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof ApiError ? err.message : t('Kalit olinmadi — qayta urinib ko‘ring.', 'Ключ не получен — попробуйте ещё раз.') });
    }
  };

  const input = 'mt-1 w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[15px] text-neutral-900 ring-1 ring-black/10 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:text-white dark:ring-white/10';

  if (state.kind === 'done') {
    return (
      <div className="space-y-3" role="status">
        <p className="font-semibold text-primary-700 dark:text-emerald-300">{t(`✓ «${state.key.name}» uchun API kalit tayyor`, `✓ API-ключ для «${state.key.name}» готов`)}</p>
        <Code>{state.key.key}</Code>
        <p className="rounded-xl bg-accent-100 px-3 py-2 text-sm text-neutral-800 ring-1 ring-accent-400/40 dark:bg-accent-500/10 dark:text-neutral-200">
          <strong>{t('Kalitni hozir saqlab qo‘ying', 'Сохраните ключ сейчас')}</strong> — {t('xavfsizlik uchun u bazada saqlanmaydi va qayta ko‘rsatilmaydi.', 'в целях безопасности он не хранится в базе и больше не будет показан.')}
          {' '}{t(`Kunlik limit: ${state.key.daily_limit} so‘rov.`, `Дневной лимит: ${state.key.daily_limit} запросов.`)}
        </p>
        <button type="button" onClick={() => setState({ kind: 'idle' })} className="text-sm font-semibold text-primary-700 underline dark:text-emerald-300">{t('Yana kalit olish', 'Получить ещё ключ')}</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          {t('Ilova yoki loyiha nomi', 'Название приложения или проекта')}
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} required className={input} placeholder={t('Masalan: Namoz vaqtlari bot', 'Например: бот времени намаза')} />
        </label>
        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" className={input} placeholder={t('siz@example.com', 'you@example.com')} />
        </label>
      </div>
      <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
        <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-primary-600" />
        {t('', 'Я согласен(на) с ')}<span><a href="#shartlar" className="font-semibold text-primary-700 underline dark:text-emerald-300">{t('Foydalanish shartlari', 'условиями использования')}</a>{t('ga roziman: ma’lumotlar manbasini ko‘rsataman va matnlarni o‘zgartirmayman.', ': буду указывать источник данных и не изменять тексты.')}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state.kind === 'sending'} className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
          {state.kind === 'sending' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />}
          {t('API kalit olish', 'Получить API-ключ')}
        </button>
        {state.kind === 'error' && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{state.message}</p>}
      </div>
    </form>
  );
}

export function DeveloperPage() {
  const t = useT();
  return (
    <div className="page">
      <section className="hero p-4 sm:p-6 md:p-10">
        <div aria-hidden className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative">
          <Breadcrumb items={[{ label: t('Bosh sahifa', 'Главная'), to: '/' }, { label: t('Dasturchilar uchun API', 'API для разработчиков') }]} />
          <h1 className="hero-title mt-3 md:mt-5">{t('Dasturchilar uchun', 'Для разработчиков')} <span className="text-accent-400">API</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base sm:leading-relaxed md:mt-3">
            {t('Namoz vaqtlari, Qur’on suralari, namoz tartibi va «Namoz», «Iymon», «Zakot», «Ro‘za» mavzularini o‘z ilovangiz, botingiz yoki saytingizda ishlating. Bepul API kalit oling — kuniga 1000 tagacha so‘rov.', 'Используйте время намаза, суры Корана, порядок намаза и темы «Намаз», «Иман», «Закят», «Пост» в своём приложении, боте или сайте. Получите бесплатный API-ключ — до 1000 запросов в день.')}
          </p>
          <code className="mt-4 inline-block break-all rounded-xl bg-black/30 px-3 py-2 text-[13px] sm:text-sm md:mt-5 text-emerald-200 ring-1 ring-white/10">{BASE}</code>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 sm:mt-4 sm:gap-4 md:mt-6 md:gap-6">
        <Card id="kalit" title={t('1. API kalit oling', '1. Получите API-ключ')}>
          <KeyForm />
        </Card>

        <Card id="foydalanish" title={t('2. So‘rov yuboring', '2. Отправьте запрос')}>
          <p>{t('Kalitni har bir so‘rovda', 'Передавайте ключ в каждом запросе в заголовке')} <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-white/10">X-API-Key</code>{t(' sarlavhasida yuboring. Javoblar JSON formatida.', '. Ответы в формате JSON.')} {t('Ruscha ma’no va yorliqlar uchun', 'Для русских смыслов и подписей добавьте')} <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-white/10">lang=ru</code>{t(' qo‘shing.', '.')}</p>
          <CodeExamples
            items={[
              { label: 'cURL', code: `curl -H "X-API-Key: SIZNING_KALITINGIZ" \\\n  "${BASE}/prayer-times/?city=Toshkent"` },
              { label: 'JavaScript', code: `const res = await fetch('${BASE}/surahs/112/', {\n  headers: { 'X-API-Key': 'SIZNING_KALITINGIZ' },\n});\nconst sura = await res.json();\nconsole.log(sura.name_uz, sura.ayahs.length);` },
              { label: 'Python', code: `import requests\n\nr = requests.get('${BASE}/prayer-times/',\n                 params={'city': 'Samarqand'},\n                 headers={'X-API-Key': 'SIZNING_KALITINGIZ'})\nprint(r.json()['timings'])` },
              { label: t('Javob namunasi', 'Пример ответа'), code: `{\n  "city": "Toshkent",\n  "date": "2026-10-17",\n  "timings": { "bomdod": "05:18", "quyosh": "06:37", "peshin": "12:08",\n               "asr": "15:56", "shom": "17:44", "xufton": "18:58" },\n  "source": "islom.uz",\n  "timezone": "Asia/Tashkent"\n}` },
            ]}
          />
          <p className="text-sm text-neutral-500">{t('Kalitni brauzerdagi ochiq kodga emas, server tomoniga (bot, backend) joylashtirish tavsiya etiladi.', 'Храните ключ на стороне сервера (бот, бэкенд), а не в открытом коде браузера.')}</p>
        </Card>

        <Card id="endpointlar" title={t('Endpointlar', 'Эндпоинты')}>
          {/* Telefonda har bir endpoint — alohida qator-kartochka (gorizontal skrollsiz), desktopda — jadval */}
          <div className="lg:overflow-x-auto">
            <table className="block w-full text-left text-sm lg:table lg:min-w-[560px]">
              <thead className="hidden text-xs uppercase tracking-wider text-neutral-500 lg:table-header-group"><tr><th className="py-2 pr-4">GET</th><th className="py-2 pr-4">{t('Parametrlar', 'Параметры')}</th><th className="py-2">{t('Nima qaytaradi', 'Что возвращает')}</th></tr></thead>
              <tbody className="block divide-y divide-neutral-100 lg:table-row-group dark:divide-neutral-800">
                {ENDPOINTS.map((e) => (
                  <tr key={e.path} className="block py-2.5 lg:table-row lg:py-0">
                    <td className="block break-all font-mono text-[13px] text-primary-700 lg:table-cell lg:break-normal lg:py-2.5 lg:pr-4 dark:text-emerald-300">{e.path}</td>
                    <td className="block break-all font-mono text-[12px] text-neutral-500 lg:table-cell lg:break-normal lg:py-2.5 lg:pr-4">{e.params ?? '—'}</td>
                    <td className="mt-0.5 block lg:mt-0 lg:table-cell lg:py-2.5">{t(...e.text)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4 md:gap-6 lg:grid-cols-2">
          <Card id="limitlar" title={t('Limit va xatolar', 'Лимиты и ошибки')}>
            <p>{t('Har bir kalit uchun', 'Для каждого ключа')} <strong>{t('kuniga 1000 so‘rov', '1000 запросов в день')}</strong>. {t('Qolgan miqdor har javobning', 'Остаток — в заголовке каждого ответа')} <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-white/10">X-RateLimit-Remaining</code>{t(' sarlavhasida.', '.')}</p>
            <ul className="space-y-2 text-sm">
              {ERRORS.map(([status, code, text]) => (
                <li key={code} className="flex gap-3"><span className="w-10 shrink-0 font-mono font-bold text-rose-600 dark:text-rose-300">{status}</span><span><code className="text-[13px]">{code}</code> — {t(...text)}</span></li>
              ))}
            </ul>
            <Code>{`{ "error": { "code": "rate_limited", "message": "Kunlik limit (1000 so‘rov) tugadi. Ertaga yangilanadi." } }`}</Code>
          </Card>

          <Card id="shartlar" title={t('Foydalanish shartlari', 'Условия использования')}>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              <li><strong>{t('Manbani ko‘rsating.', 'Указывайте источник.')}</strong> {t('Namoz, Iymon, Zakot va Ro‘za matnlari — O‘zbekiston musulmonlari idorasi (muslim.uz); ilovangizda «O‘zbekiston musulmonlari idorasi rasmiy veb-portali xabar beradi» deb, muslim.uz havolasi bilan yozing.', 'Тексты «Намаз», «Иман», «Закят» и «Пост» — Управление мусульман Узбекистана (muslim.uz); в приложении укажите «O‘zbekiston musulmonlari idorasi rasmiy veb-portali xabar beradi» со ссылкой на muslim.uz.')}</li>
              <li><strong>{t('Qur’on matni', 'Текст Корана')}</strong> — {t('Tanzil Project (CC BY 3.0): manba va litsenziyani ko‘rsating, matnni o‘zgartirmang.', 'Tanzil Project (CC BY 3.0): укажите источник и лицензию, не изменяйте текст.')}</li>
              <li><strong>{t('Ma’nolar tarjimasi', 'Переводы смыслов')}</strong> {t('(Muhammad Sodiq Muhammad Yusuf, E. Kuliev) — faqat notijoriy foydalanish uchun.', '(Мухаммад Содик Мухаммад Юсуф, Э. Кулиев) — только для некоммерческого использования.')}</li>
              <li><strong>{t('Namoz vaqtlari', 'Время намаза')}</strong> — {t('islom.uz ma’lumotlari asosida; javobdagi', 'по данным islom.uz; указывайте поле')} <code>source</code>{t(' maydonini ko‘rsating.', ' из ответа.')}</li>
              <li>{t('Diniy matnlarni o‘zgartirmang va ularni fatvo sifatida taqdim etmang.', 'Не изменяйте религиозные тексты и не выдавайте их за фетву.')}</li>
              <li>{t('Suiste’mol qilingan kalitlar ogohlantirishsiz o‘chiriladi.', 'Ключи, используемые со злоупотреблением, отключаются без предупреждения.')}</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
