import { useEffect, useRef, useState } from 'react';
import type { BirgaSession, BirgaSettings, Speed } from '../../types/birga';
import { formatDuration, stageKey, stageSeconds, totalSeconds } from '../../utils/birga/timing';
import { Segmented, Toggle, stageLabel, zamRakats, type Gender, type ZamChoice } from './shared';
import { ZamSuraSelect } from './ZamSuraSelect';
import { PartPicker } from './PartPicker';
import { SourcesList } from './Sources';
import { prayerTitle } from '../../utils/prayerNames';
import { useI18n } from '../../i18n';

interface Props {
  session: BirgaSession;
  settings: BirgaSettings;
  update: <K extends keyof BirgaSettings>(key: K, value: BirgaSettings[K]) => void;
  zam: ZamChoice;
  onZam: (rakat: number, slug: string) => void;
  gender: Gender;
  onGender: (g: Gender) => void;
  offline: boolean;
  onPart: (index: number) => void;
  partLoading: boolean;
  partError: boolean;
  onStart: () => void;
  onExit: () => void;
}

const SPEEDS: { id: Speed; label: [string, string] }[] = [
  { id: 'sekin', label: ['Sekin', 'Медленно'] },
  { id: 'ortacha', label: ['O‘rtacha', 'Средне'] },
  { id: 'tez', label: ['Tez', 'Быстро'] },
  { id: 'shaxsiy', label: ['Shaxsiy', 'Своя'] },
];
export function BirgaSetup({ session, settings, update, zam, onZam, gender, onGender, offline, onPart, partLoading, partError, onStart, onExit }: Props) {
  const [agreed, setAgreed] = useState(false);
  const { t, lang } = useI18n();
  const title = prayerTitle(session.category.slug, session.category.name, lang);
  const [customOpen, setCustomOpen] = useState(settings.speed === 'shaxsiy');
  const [measurement, setMeasurement] = useState<{ key: string; startedAt: number } | null>(null);
  const [measured, setMeasured] = useState<{ key: string; seconds: number } | null>(null);
  const [clock, setClock] = useState(Date.now());
  const customRef = useRef<HTMLDetailsElement>(null);
  const customListRef = useRef<HTMLDivElement>(null);
  const setDuration = (key: string, seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 3600) return;
    update('durations', { ...settings.durations, [key]: seconds });
    update('speed', 'shaxsiy');
  };
  useEffect(() => {
    if (!measurement) return;
    const id = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [measurement]);
  const wakeLockSupported = 'wakeLock' in navigator;
  const zamOptions = session.zam_suras.map((s) => session.recitations[s]).filter(Boolean);

  return (
    <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Chap: ketma-ketlik va ogohlantirish */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} aria-label={t('Orqaga', 'Назад')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 transition hover:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div>
            <h2 className="font-display text-lg font-bold min-[400px]:text-xl sm:text-2xl"><span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300 sm:hidden">{t('Birga o‘qish', 'Читать вместе')}</span><span className="hidden sm:inline">{t('Birga o‘qish', 'Читать вместе')} — </span>{title}</h2>
            <p className="text-sm text-white/60">{t(`${session.rakats} rakat · ${session.stages.length} bosqich · boshlangandan keyin tugma bosish shart emas`, `Ракаатов: ${session.rakats} · этапов: ${session.stages.length} · после начала нажимать ничего не нужно`)}</p>
          </div>
        </div>

        <PartPicker parts={session.parts} value={session.part} onChange={onPart} loading={partLoading} />
        {partError && (
          <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-400/30">{t('Tanlangan qism yuklanmadi — internetni tekshirib, qayta tanlang.', 'Выбранная часть не загрузилась — проверьте интернет и выберите снова.')}</p>
        )}

        {offline && (
          <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-300/30">{t('Internet yo‘q — oxirgi saqlangan matnlar ko‘rsatilmoqda.', 'Нет интернета — показаны последние сохранённые тексты.')}</p>
        )}

        <div role="note" className="rounded-2xl bg-amber-400/[0.08] p-4 ring-1 ring-amber-300/30">
          <p className="flex items-center gap-2 font-bold text-amber-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
            {t('Boshlashdan oldin o‘qing', 'Прочитайте перед началом')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{session.safety_notice}</p>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-white">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" />
            {t('Ogohlantirishni o‘qidim va tushundim', 'Я прочитал(а) и понял(а) предупреждение')}
          </label>
        </div>

        <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
          <h3 className="text-sm font-bold text-white/80">{t('Ketma-ketlik', 'Последовательность')}</h3>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {session.stages.map((s, i) => (
              <li key={s.index} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/75 ring-1 ring-white/10">
                {(i === 0 || session.stages[i - 1].rakat !== s.rakat) && <span className="mr-1 font-bold text-accent-400">{t(`${s.rakat}-r.`, `${s.rakat}-й р.`)}</span>}
                {stageLabel(s, session, zam)}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-white/45">{t('Ketma-ketlik muslim.uz’dagi tasdiqlangan dars qadamlaridan tuzilgan.', 'Последовательность составлена по проверенным шагам урока с muslim.uz.')}</p>
        </div>

        <SourcesList sources={session.sources} />
      </div>

      {/* O'ng: sozlamalar */}
      <section aria-labelledby="birga-sozlama" className="space-y-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
        <h3 id="birga-sozlama" className="flex items-center gap-2 font-bold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-emerald-300" aria-hidden><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
          {t('Namoz rejimi sozlamalari', 'Настройки режима намаза')}
        </h3>

        {zamOptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-white/60">{t('Har rakatda o‘qiladigan zam sura', 'Дополнительная сура в каждом ракаате')}</p>
            {zamRakats(session).map((rakat) => {
              const value = zam[rakat] ?? zamOptions[0].slug;
              const repeated = zamRakats(session).find((r) => r !== rakat && zam[r] === value);
              return (
                <ZamSuraSelect
                  key={rakat}
                  label={t(`${rakat}-rakat zam surasi`, `Сура для ${rakat}-го ракаата`)}
                  options={zamOptions}
                  value={value}
                  onChange={(slug) => onZam(rakat, slug)}
                  warning={repeated ? t(`Bu sura ${repeated}-rakatda ham tanlangan`, `Эта сура уже выбрана в ${repeated}-м ракаате`) : undefined}
                />
              );
            })}
          </div>
        )}

        <div>
          <span className="mb-1 block text-xs text-white/60">{t('Rasmlar', 'Иллюстрации')}</span>
          <Segmented label={t('Rasmlar', 'Иллюстрации')} value={gender} onChange={onGender} options={[{ id: 'erkak', label: t('Erkaklar', 'Мужчины') }, { id: 'ayol', label: t('Ayollar', 'Женщины') }]} />
        </div>
        <div>
          <span className="mb-1 block text-xs text-white/60">{t('Qiroat tezligi', 'Скорость чтения')}</span>
          <Segmented label={t('Qiroat tezligi', 'Скорость чтения')} value={settings.speed} onChange={(v) => { update('speed', v); if (v === 'shaxsiy') { setCustomOpen(true); window.requestAnimationFrame(() => customRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); } }} options={SPEEDS.map((o) => ({ id: o.id, label: t(...o.label) }))} />
        </div>
        <div role="note" className="flex items-start gap-3 rounded-xl bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100 ring-1 ring-amber-300/40">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
          <p><strong className="text-amber-200">{t('Eslatma:', 'Напоминание:')}</strong> {t('Agar tayyor tezliklar sizga mos kelmasa, «Shaxsiy» bo‘limida har bir bosqich va amal uchun kerakli vaqtni tanlang. Namoz paytida ekrandagi bosqich ko‘rsatmalari siz belgilagan vaqt bo‘yicha avtomatik almashadi. Vaqtni kengroq belgilang — shoshilib qolish ehtimoli kamayadi. Shoshilish namozni buzishi mumkin!', 'Если готовые скорости вам не подходят, выберите нужное время для каждого этапа и действия в разделе «Своя». Во время намаза подсказки на экране будут автоматически переключаться через заданное вами время. Задайте время с запасом, чтобы читать без спешки. Спешка может нарушить намаз!')}</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 p-3 text-sm ring-1 ring-emerald-400/25">
          {t('Taxminiy umumiy davomiylik', 'Примерная общая длительность')}: <strong className="ml-1 text-emerald-300">{formatDuration(totalSeconds(session, zam, settings))}</strong>
          <p className="mt-1 text-xs text-white/55">{t('Vaqt faqat ko‘rsatmani almashtiradi; o‘qish tugaganini tasdiqlamaydi. Shoshmaslik uchun shaxsiy vaqtlarni uzunroq belgilang.', 'Время лишь переключает подсказку и не подтверждает завершение чтения. При необходимости увеличьте время каждого этапа.')}</p>
        </div>
        <div className="rounded-xl bg-black/25 p-3 ring-1 ring-white/10" aria-label={t('Bosqichlar va ularning vaqti', 'Этапы и их длительность')}>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white/90">{t('Har bir bosqich vaqti', 'Время каждого этапа')}</h4>
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/25">{t(...(SPEEDS.find((speed) => speed.id === settings.speed)?.label ?? SPEEDS[1].label))}</span>
          </div>
          <p className="mt-1 text-xs text-white/50">{t('Tanlangan namoz qismi tartibida, avtomatik qo‘yiladigan vaqtlar.', 'В порядке выбранной части намаза, время автоматического перехода.')}</p>
          <ol className="birga-custom-scroll mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
            {session.stages.map((stage, index) => (
              <li key={stage.index} className="flex min-w-0 items-start gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2 text-xs">
                <span className="w-5 shrink-0 text-right tabular-nums text-white/40">{index + 1}.</span>
                <span className="min-w-0 flex-1 break-words leading-snug text-white/85">
                  {(index === 0 || session.stages[index - 1].rakat !== stage.rakat) && <span className="mr-1.5 font-semibold text-accent-400">{t(`${stage.rakat}-rakat`, `${stage.rakat}-й ракаат`)}</span>}
                  {stageLabel(stage, session, zam)}
                </span>
                <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-emerald-300">{stageSeconds(stage, session, zam, settings)} {t('soniya', 'с')}</span>
              </li>
            ))}
          </ol>
        </div>
        <details
          ref={customRef}
          className={`scroll-mt-20 rounded-2xl transition-all duration-300 ${
            customOpen || settings.speed === 'shaxsiy'
              ? 'bg-gradient-to-b from-emerald-950/40 to-black/40 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-950/30 p-4'
              : 'bg-emerald-950/20 ring-1 ring-emerald-500/30 hover:ring-emerald-400/50 p-3.5'
          }`}
          open={customOpen}
          onToggle={(e) => setCustomOpen(e.currentTarget.open)}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m-6 8a2 2 0 1 0 0-4m0 4a2 2 0 1 1 0-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 1 0 0-4m0 4a2 2 0 1 1 0-4m0 4v2m0-6V4" />
                </svg>
              </span>
              <div>
                <span className="text-sm font-bold text-white block">
                  {t('Shaxsiy sozlash va o‘zimni sinab ko‘rish', 'Личная настройка и пробное чтение')}
                </span>
                <span className="text-[11px] text-emerald-300/80 block">
                  {t('Har bir duo va harakat vaqtini o‘zingizga moslang', 'Настройте время каждого дуа и действия под себя')}
                </span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/40">
              {customOpen ? '▲' : t('Ochish ⚙', 'Открыть ⚙')}
            </span>
          </summary>
          <div className="mt-3.5 rounded-xl bg-emerald-500/[0.12] p-3 text-xs leading-relaxed text-emerald-100 ring-1 ring-emerald-400/30">
            <p className="font-medium text-white">{t('Har bir duo, sura yoki harakat uchun −/+ tugmalari bilan 1–3600 soniya orasida vaqt belgilang. Namozda shu vaqt tugagach keyingi ko‘rsatma avtomatik chiqadi.', 'Задайте время каждого дуа, суры или действия кнопками −/+ в пределах 1–3600 секунд. Затем подсказка переключится автоматически.')}</p>
            <p className="mt-2 text-emerald-200/90">{t('O‘zingizni sinash uchun «Boshlash»ni bosing, o‘qib bo‘lgach «Tugatish»ni, so‘ng «Vaqtni saqlash»ni tanlang. Bir xil bosqich vaqti barcha rakatlarda qo‘llanadi va qurilmada saqlanadi.', 'Для пробного чтения нажмите «Начать», после чтения — «Завершить», затем «Сохранить время». Одинаковые этапы используют одно время во всех ракаатах; настройки сохраняются на устройстве.')}</p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-emerald-300/70">{t('Bosqichlar vaqti (soniyalarda):', 'Время этапов (в секундах):')}</span>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" onClick={() => customListRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={t('Ro‘yxat boshiga', 'В начало списка')} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-base text-white/80 ring-1 ring-white/15 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">↑</button>
              <button type="button" onClick={() => customListRef.current?.scrollTo({ top: customListRef.current.scrollHeight, behavior: 'smooth' })} aria-label={t('Ro‘yxat oxiriga', 'В конец списка')} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-base text-white/80 ring-1 ring-white/15 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">↓</button>
            </div>
          </div>
          <div ref={customListRef} className="birga-custom-scroll mt-2 max-h-80 space-y-2 overflow-y-auto overscroll-contain rounded-xl bg-black/35 p-2 pr-2 ring-1 ring-white/15">
            {Array.from(new Map(session.stages.map((stage) => [stageKey(stage, session, zam), stage])).entries()).map(([key, stage]) => (
              <div key={key} className="min-w-0 rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/15 transition hover:bg-white/[0.08]">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <label className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-white/90" htmlFor={`duration-${key}`}>{stageLabel(stage, session, zam)}</label>
                  <div className="flex shrink-0 items-center overflow-hidden rounded-lg bg-black/60 ring-1 ring-white/20 focus-within:ring-emerald-400">
                    <button type="button" onClick={() => setDuration(key, (settings.durations?.[key] ?? stageSeconds(stage, session, zam, settings)) - 1)} aria-label={t(`${stageLabel(stage, session, zam)} vaqtini kamaytirish`, `Уменьшить время: ${stageLabel(stage, session, zam)}`)} className="flex h-9 w-9 items-center justify-center border-r border-white/10 text-lg text-white/80 transition hover:bg-white/10 disabled:opacity-30" disabled={(settings.durations?.[key] ?? stageSeconds(stage, session, zam, settings)) <= 1}>−</button>
                    <input id={`duration-${key}`} type="number" min="1" max="3600" inputMode="numeric" value={settings.durations?.[key] ?? stageSeconds(stage, session, zam, settings)} onChange={(e) => setDuration(key, Number(e.target.value))} className="birga-duration-input w-12 bg-transparent px-1 text-center text-sm font-semibold tabular-nums text-white focus:outline-none" />
                    <button type="button" onClick={() => setDuration(key, (settings.durations?.[key] ?? stageSeconds(stage, session, zam, settings)) + 1)} aria-label={t(`${stageLabel(stage, session, zam)} vaqtini oshirish`, `Увеличить время: ${stageLabel(stage, session, zam)}`)} className="flex h-9 w-9 items-center justify-center border-l border-white/10 text-lg text-white/80 transition hover:bg-white/10 disabled:opacity-30" disabled={(settings.durations?.[key] ?? stageSeconds(stage, session, zam, settings)) >= 3600}>+</button>
                  </div>
                </div>
                <p className="mt-1 text-right text-[10px] text-white/45">{t('soniya', 'с')}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
                  {measurement?.key === key ? (
                    <>
                      <span role="timer" className="mr-auto text-xs font-semibold tabular-nums text-emerald-300">{formatDuration((clock - measurement.startedAt) / 1000)}</span>
                      <button type="button" onClick={() => { setMeasured({ key, seconds: Math.max(1, Math.ceil((Date.now() - measurement.startedAt) / 1000)) }); setMeasurement(null); }} className="min-h-9 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-950">{t('Tugatish', 'Завершить')}</button>
                    </>
                  ) : measured?.key === key ? (
                    <>
                      <span className="mr-auto text-xs font-semibold text-emerald-300">{measured.seconds} {t('soniya', 'с')}</span>
                      <button type="button" onClick={() => { const startedAt = Date.now(); setClock(startedAt); setMeasured(null); setMeasurement({ key, startedAt }); }} className="min-h-9 rounded-lg bg-white/5 px-3 text-xs font-semibold text-white/80 ring-1 ring-white/15 transition hover:bg-white/10">{t('Qaytadan', 'Повторить')}</button>
                      <button type="button" onClick={() => { update('durations', { ...settings.durations, [key]: measured.seconds }); update('speed', 'shaxsiy'); setMeasured(null); }} className="min-h-9 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-950">{t('Vaqtni saqlash', 'Сохранить время')}</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setClock(Date.now()); setMeasured(null); setMeasurement({ key, startedAt: Date.now() }); }} className="min-h-9 rounded-lg bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/40 hover:bg-emerald-500/30 transition">{t('O‘zimni sinab ko‘rish · Boshlash', 'Пробное чтение · Начать')}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>

        <Toggle label={t('Katta matn (masofadan o‘qish)', 'Крупный текст (читать издалека)')} checked={settings.large_text} onChange={(v) => update('large_text', v)} />
        <Toggle label={t('Ekran doim yoniq', 'Экран не гаснет')} hint={wakeLockSupported ? undefined : t('Bu brauzer qo‘llamaydi', 'Браузер не поддерживает')} checked={settings.wake_lock && wakeLockSupported} disabled={!wakeLockSupported} onChange={(v) => update('wake_lock', v)} />
        <Toggle label={t('Tungi rejim', 'Ночной режим')} hint={t('Ekran yorqinligi pasayadi', 'Яркость экрана снижается')} checked={settings.night} onChange={(v) => update('night', v)} />
        <Toggle label={t('Offline matn va rasmlar', 'Офлайн тексты и картинки')} hint={t('Keyingi safar internetsiz ham ochiladi', 'В следующий раз откроется и без интернета')} checked={settings.offline} onChange={(v) => update('offline', v)} />

        {/* Vaqtlar qurilmada saqlanadi. */}

        <button
          type="button"
          onClick={onStart}
          disabled={!agreed || partLoading}
          className="min-h-[3rem] w-full rounded-xl bg-emerald-500 text-base font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
        >
          {t('Boshlash', 'Начать')}
        </button>
        {!agreed && <p className="text-center text-[11px] text-white/50">{t('Boshlash uchun ogohlantirishni tasdiqlang', 'Чтобы начать, подтвердите предупреждение')}</p>}
      </section>
    </div>
  );
}
