import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BirgaSession, BirgaSettings } from '../../types/birga';
import { useVoiceActivity } from '../../hooks/useVoiceActivity';
import { speechSupported, isBrave, useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useWakeLock } from '../../hooks/useScreenControls';
import { arabicWords, matchRecitation } from '../../utils/birga/arabic';
import { AYAH_HEARD, latinAyahs } from '../../utils/birga/latin';
import { evaluateStage, expectedSeconds, scrollProgress, type AdvanceReason, type EngineResult } from '../../utils/birga/engine';
import { SourceLine } from './Sources';
import { prayerTitle, rakatLabel } from '../../utils/prayerNames';
import { CountdownRing, MicIndicator, listeningState, stageImage, stageLabel, stageRecitation, type Gender, type ZamChoice } from './shared';
import { useI18n } from '../../i18n';

export interface SessionStats {
  seconds: number;
  rakats: number;
  recitations: number;
  stages: number;
  byReason: Record<AdvanceReason | 'manual', number>;
}

type TextTab = 'lotin' | 'arab' | 'mano' | 'tafsilot';

interface Props {
  session: BirgaSession;
  settings: BirgaSettings;
  zam: ZamChoice;
  gender: Gender;
  fullscreen: { supported: boolean; isFullscreen: boolean; toggle: () => void };
  onExit: () => void;
  onFinish: (stats: SessionStats) => void;
}

const TICK_MS = 200;

export function BirgaLive({ session, settings, zam, gender, fullscreen, onExit, onFinish }: Props) {
  const stages = session.stages;
  const schema = session.settings;
  const sens = schema.sensitivity[settings.sensitivity];
  const { t, lang } = useI18n();
  const title = prayerTitle(session.category.slug, session.category.name, lang);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => performance.now());
  const [tab, setTab] = useState<TextTab>('lotin');
  const stageStart = useRef(performance.now());
  const pausedElapsed = useRef(0);
  const sessionStart = useRef(Date.now());
  const reasons = useRef<(AdvanceReason | 'manual')[]>([]);
  const textRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const finished = useRef(false);
  // Zaxira taymer qachon boshlangani (AI tasdiqlay olmaganda)
  const countdownFrom = useRef<number | null>(null);
  // Shu bosqichda jami gapirilgan vaqt (soniya) va oxirgi tik vaqti
  const spokeFor = useRef(0);
  const lastTick = useRef(performance.now());
  const [result, setResult] = useState<EngineResult>({ advance: null, countdownFrom: null, countdown: null });

  const voice = useVoiceActivity(sens.rms);
  const speechOn = settings.speech && speechSupported() && !isBrave();
  useWakeLock(settings.wake_lock);

  // Mikrofon bir marta ishga tushiriladi; xato bo'lsa — vizual taymer davom etadi
  const { start: startMic, stop: stopMic } = voice;
  useEffect(() => {
    void startMic();
    return stopMic;
  }, [startMic, stopMic]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(performance.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const stage = stages[index];
  const next = stages[index + 1];
  // Nutq tanish faqat sura va duolarda kerak (ruku', sajdada — yo'q): mikrofon keraksiz qayta ulanmaydi.
  // Android'da jimlikdan keyin gapira boshlaganda ulanadi (har ulanish ovoz chiqaradi).
  const speech = useSpeechRecognition(speechOn && voice.status === 'active' && stage.kind === 'recitation', 'ar-SA', voice.speaking);
  const rec = stageRecitation(stage, session, zam);
  const bigText = rec ? rec.transliteration : stage.text;
  const zikr = stage.zikr ?? [];
  const expected = useMemo(() => expectedSeconds(stage, rec?.transliteration ?? '', settings, schema), [stage, rec, settings, schema]);
  const expectedWords = useMemo(() => (rec?.arabic ? arabicWords(rec.arabic.join(' ')) : []), [rec]);
  const elapsed = paused ? pausedElapsed.current : (now - stageStart.current) / 1000;

  const { reset: resetTranscript } = speech;
  const goTo = useCallback((i: number, reason: AdvanceReason | 'manual') => {
    if (finished.current) return;
    reasons.current[index] = reason;
    if (i >= stages.length) {
      finished.current = true;
      const counts = { speech: 0, voice: 0, timer: 0, manual: 0 };
      reasons.current.forEach((r) => { if (r) counts[r] += 1; });
      onFinish({
        seconds: (Date.now() - sessionStart.current) / 1000,
        rakats: session.rakats,
        recitations: stages.filter((s) => s.kind === 'recitation').length,
        stages: stages.length,
        byReason: counts,
      });
      return;
    }
    setIndex(Math.max(0, i));
    stageStart.current = performance.now();
    pausedElapsed.current = 0;
    countdownFrom.current = null;
    spokeFor.current = 0;
    setResult({ advance: null, countdownFrom: null, countdown: null });
    resetTranscript();
    setTab('lotin');
    textRef.current?.scrollTo({ top: 0 });
  }, [index, stages, session.rakats, onFinish, resetTranscript]);

  const match = expectedWords.length && speech.status === 'listening' ? matchRecitation(expectedWords, speech.transcript) : null;
  // Lotincha (muslim.uz) oyatlar — tanilganlari yashil
  const latin = rec?.arabic ? latinAyahs(rec.arabic, rec.transliteration, match?.indices ?? []) : null;

  // Asosiy qaror: har tikda bir marta
  useEffect(() => {
    if (paused) return;
    const last = voice.lastVoiceAt.current;
    const heard = last !== null && last >= stageStart.current;
    const dt = Math.min(1, (now - lastTick.current) / 1000);
    lastTick.current = now;
    if (voice.speaking) spokeFor.current += dt;
    const r = evaluateStage({
      stage, elapsed, expected, fallback: settings.fallback,
      voice: {
        active: voice.status === 'active',
        speaking: voice.speaking,
        heard,
        silence: heard ? (now - last!) / 1000 : elapsed,
        spokeFor: spokeFor.current,
      },
      match,
      matchThreshold: sens.match,
      countdownFrom: countdownFrom.current,
    });
    countdownFrom.current = r.countdownFrom;
    if (r.advance) goTo(index + 1, r.advance);
    else setResult(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // Uzun matn o'z-o'zidan pastga suriladi (qo'l tegizmasdan o'qish uchun):
  // AI so'zlarni tanisa — o'qilayotgan oyat tepaga keladi; aks holda vaqt bo'yicha (tezroq)
  const lastHeardAyah = latin ? latin.reduce((acc, a, i) => (a.heard > 0 ? i : acc), -1) : -1;
  useEffect(() => {
    const el = textRef.current;
    if (!el || tab !== 'lotin' || paused) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    const node = lastHeardAyah >= 0 ? el.querySelector<HTMLElement>(`[data-ayah="${lastHeardAyah}"]`) : null;
    const top = node ? node.offsetTop - el.clientHeight * 0.2 : max * scrollProgress(elapsed, expected);
    el.scrollTo({ top: Math.min(max, Math.max(0, top)), behavior: 'smooth' });
  }, [Math.floor(elapsed * 4), tab, lastHeardAyah, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ro'yxatda faol bosqich ko'rinib tursin — faqat ro'yxatning o'zi suriladi, sahifa emas
  useEffect(() => {
    const nav = navRef.current;
    const item = nav?.querySelector<HTMLElement>(`[data-stage="${index}"]`);
    if (!nav || !item) return;
    const top = item.offsetTop; // nav — `relative`, shuning uchun offsetTop unga nisbatan
    if (top < nav.scrollTop || top + item.offsetHeight > nav.scrollTop + nav.clientHeight) {
      nav.scrollTo({ top: top - nav.clientHeight / 3, behavior: 'smooth' });
    }
  }, [index]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (p) stageStart.current = performance.now() - pausedElapsed.current * 1000;
      else pausedElapsed.current = (performance.now() - stageStart.current) / 1000;
      return !p;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, select, textarea')) return;
      if (e.key === ' ') { e.preventDefault(); togglePause(); }
      else if (e.key === 'ArrowRight') goTo(index + 1, 'manual');
      else if (e.key === 'ArrowLeft' && index > 0) goTo(index - 1, 'manual');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, index, togglePause]);

  const curPart = session.parts.length > 1 ? session.parts.find((p) => p.index === session.part) : undefined;
  const partLabel = curPart ? rakatLabel(curPart.count, curPart.kind, lang) : undefined;
  const listening = listeningState(voice.status, speech.status, speechOn);
  const statusText = stage.kind !== 'recitation'
    ? t('Taymer faqat taxminiy vaqt — amalni o‘z vaqtida bajaring.', 'Таймер показывает лишь примерное время — выполняйте действие в своём темпе.')
    : voice.status !== 'active'
      ? t('Mikrofon ishlamayapti — taxminiy vaqt bo‘yicha keyingi ko‘rsatma chiqadi.', 'Микрофон не работает — следующая подсказка появится по примерному времени.')
      : !speechOn
        ? result.countdown
          ? t(`Jim bo‘ldingiz — ${Math.ceil(result.countdown.remaining)} soniyadan keyin keyingi ko‘rsatma. O‘qishni davom ettirsangiz, taymer to‘xtaydi.`, `Пауза — следующая подсказка через ${Math.ceil(result.countdown.remaining)} с. Продолжите читать, и таймер остановится.`)
          : t(`O‘qing — ovozingiz faqat qurilmada kuzatiladi, taymer yo‘q. O‘qib bo‘lib jim bo‘lsangiz, keyingi ko‘rsatma chiqadi (zaxira: ${settings.fallback} soniya).`, `Читайте — голос отслеживается только на устройстве, таймера нет. Когда закончите и замолчите, появится следующая подсказка (запас: ${settings.fallback} с).`)
      : result.countdown
        ? t(`AI tasdiqlay olmadi — ${Math.ceil(result.countdown.remaining)} soniyadan keyin keyingi ko‘rsatma. O‘qishni davom ettirsangiz, taymer to‘xtaydi.`, `ИИ не смог подтвердить — следующая подсказка через ${Math.ceil(result.countdown.remaining)} с. Продолжите читать, и таймер остановится.`)
        : t(`O‘qing — AI tinglayapti, taymer yo‘q. Tanib olsa o‘zi o‘tadi; tanimasa, jim bo‘lganingizdan keyin ${settings.fallback} soniyalik taymer boshlanadi.`, `Читайте — ИИ слушает, таймера нет. Если распознает, перейдёт сам; если нет — после паузы начнётся таймер на ${settings.fallback} с.`);
  // Ruku'dan oldingi qiroat (zam sura yoki Fotiha): «Allohu akbar»ni oldindan eslatish.
  // Takbir matni — ruku' bosqichining o'zidagi manba zikri («Borishda: Allohu akbar»).
  // 3–4-rakatlarda zam sura yo'q: «Fotiha → Amiyn → Ruku'» — «Amiyn» o'tkazib yuborilib, undan keyingisi qaraladi.
  const isAmiyn = (s: typeof stage) => s.kind === 'action' && s.title === 'Amiyn';
  const ahead = stages.slice(index + 1).find((s) => !isAmiyn(s));
  const takbirBeforeRuku = (stage.kind === 'recitation' || isAmiyn(stage)) && ahead?.kind === 'posture' && /ruku/i.test(ahead.title)
    ? ahead.zikr?.find((z) => /^allohu akbar/i.test(z.text))?.text ?? 'Allohu akbar'
    : null;
  // Qiroat oxiriga yaqinlashganda (yoki taymer boshlanganda) eslatma ajralib ko'rinadi
  const takbirSoon = !!takbirBeforeRuku && (!!result.countdown || elapsed >= expected * 0.6);
  const img = stageImage(stage, gender);
  const textSize = settings.large_text ? 'text-3xl leading-[1.6] md:text-5xl md:leading-[1.5]' : 'text-2xl leading-[1.7] md:text-[2rem] md:leading-[1.6]';
  const instruction = gender === 'ayol' && stage.text_female ? `${stage.text}\n\n${t('Ayollar uchun', 'Для женщин')}: ${stage.text_female}` : stage.text;
  const tabs: { id: TextTab; label: string; show: boolean }[] = [
    { id: 'lotin', label: rec ? t('Lotincha', 'Латиницей') : zikr.length || stage.kind === 'posture' ? t('O‘qiladi', 'Читается') : t('Matn', 'Текст'), show: true },
    { id: 'arab', label: t('Arabcha', 'По-арабски'), show: !!rec?.arabic },
    { id: 'mano', label: t('Ma’nosi', 'Смысл'), show: !!rec?.meaning },
    { id: 'tafsilot', label: t('Tafsilot', 'Подробно'), show: !!rec || zikr.length > 0 || stage.kind === 'posture' },
  ];

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${fullscreen.isFullscreen ? 'h-full' : ''}`}>
      {/* Sarlavha */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-3 py-3 sm:px-5">
        <button type="button" onClick={onExit} aria-label={t('Rejimdan chiqish', 'Выйти из режима')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 transition hover:bg-white/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-emerald-300 sm:hidden">
            {t('Birga o‘qish', 'Читать вместе')}{partLabel && <span className="text-accent-400"> · {partLabel}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-base font-bold sm:text-xl">
              <span className="hidden sm:inline">{t('Birga o‘qish', 'Читать вместе')} — </span>{title}
              {partLabel && <span className="hidden font-semibold text-accent-400 sm:inline"> · {partLabel}</span>}
            </h2>
            <span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/40 sm:inline-flex">{t('Haqiqiy namoz rejimi', 'Режим настоящего намаза')}</span>
          </div>
          <p className="hidden text-[11px] text-white/50 sm:block">{t('AI ovoz chiqarmaydi, sizdan tasdiqlash so‘ramaydi.', 'ИИ не говорит вслух и не просит подтверждений.')}</p>
        </div>
        {/* Telefonda progress alohida qatorda (oxirida) */}
        <div className="order-last flex w-full items-center gap-2 text-sm font-semibold tabular-nums sm:order-none sm:w-auto">
          <span className="text-xs text-white/50 sm:hidden">{t('Bosqich', 'Этап')} {index + 1}/{stages.length} ·</span>
          <span>{stage.rakat}/{session.rakats} {t('rakat', 'ракаат')}</span>
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: session.rakats }, (_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i + 1 < stage.rakat ? 'bg-emerald-400' : i + 1 === stage.rakat ? 'bg-emerald-300 ring-2 ring-emerald-300/30' : 'bg-white/20'}`} />
            ))}
          </span>
        </div>
        <button type="button" onClick={togglePause} aria-pressed={paused} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/5 px-3 text-sm font-semibold ring-1 ring-white/15 transition hover:bg-white/10">
          {paused ? <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M7 4v16l13-8z" /></svg> : <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>}
          <span className="hidden sm:inline">{paused ? t('Davom', 'Дальше') : t('Pauza', 'Пауза')}</span>
        </button>
        {fullscreen.supported && (
          <button type="button" onClick={fullscreen.toggle} aria-label={fullscreen.isFullscreen ? t('To‘liq ekrandan chiqish', 'Выйти из полноэкранного режима') : t('To‘liq ekran', 'Во весь экран')} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/15 transition hover:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
              {fullscreen.isFullscreen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </svg>
          </button>
        )}
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Bosqichlar ro'yxati */}
        <nav ref={navRef} aria-label={t('Namoz bosqichlari', 'Этапы намаза')} className="relative hidden min-h-0 overflow-y-auto border-r border-white/10 p-3 lg:block">
          <ol className="space-y-1">
            {stages.map((s, i) => {
              const active = i === index;
              const done = i < index;
              const firstOfRakat = i === 0 || stages[i - 1].rakat !== s.rakat;
              return (
                <li key={s.index} data-stage={i}>
                  {firstOfRakat && <p className="mb-1 mt-3 px-2 text-[10px] font-bold uppercase tracking-wider text-accent-400/80 first:mt-0">{t(`${s.rakat}-rakat`, `${s.rakat}-й ракаат`)}</p>}
                  <div className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm ${active ? 'bg-emerald-500/15 font-semibold text-white ring-1 ring-emerald-400/60' : done ? 'text-white/45' : 'text-white/75'}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${active ? 'bg-emerald-500 text-white' : done ? 'bg-white/10 text-emerald-300' : 'ring-1 ring-white/20'}`}>{done ? '✓' : i + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate">{stageLabel(s, session, zam)}</span>
                      {s.timing && <span className="block text-[11px] text-white/45">~ {s.timing[0]}–{s.timing[1]} {t('soniya', 'с')}</span>}
                    </span>
                    {active && !paused && <span className="ml-auto h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-emerald-400" aria-hidden />}
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Asosiy qism */}
        <div className="flex min-h-0 min-w-0 flex-col">
          {/* Telefonda: rasm + nom bir qatorda, mikrofon holati ostida to'liq kenglikda.
              Kattaroq ekranda: rasm chapda ikki qator bo'ylab. */}
          <div className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-white/10 p-3 sm:gap-x-4 sm:p-4">
            <div className="relative aspect-[3/2] w-28 shrink-0 self-start overflow-hidden rounded-2xl bg-black ring-1 ring-white/10 min-[400px]:w-32 sm:row-span-2 sm:w-48 lg:w-60">
              {img && <img key={img} src={img} alt={stage.images[0]?.caption ?? ''} className="h-full w-full object-cover motion-safe:animate-fade-in" />}
            </div>

            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">{t('Hozirgi amal', 'Сейчас')}</span>
                <h3 className="mt-1.5 break-words font-display text-lg font-extrabold leading-tight min-[400px]:text-xl sm:text-3xl">{stageLabel(stage, session, zam)}</h3>
                {rec && <p className="text-xs text-white/55 sm:text-sm">{stage.title}</p>}
                {next && (
                  <p className="mt-1 truncate text-[11px] text-white/50 md:hidden">
                    {t('Keyingi', 'Далее')}: <span className="font-semibold text-white/75">{stageLabel(next, session, zam)}</span>
                  </p>
                )}
              </div>
              {next && (
                <div className="hidden max-w-[13rem] rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 md:block">
                  <p className="text-[11px] text-white/55">{t('Keyingi amal', 'Следующее действие')}</p>
                  <p className="truncate text-sm font-semibold">{stageLabel(next, session, zam)}</p>
                  {next.rakat !== stage.rakat && <p className="text-[11px] text-accent-400">{t(`${next.rakat}-rakat`, `${next.rakat}-й ракаат`)}</p>}
                </div>
              )}
            </div>

            <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:col-span-1 sm:col-start-2 sm:self-end">
              <MicIndicator state={listening} level={voice.level} speaking={voice.speaking} />
              {result.countdown && (
                <CountdownRing remaining={result.countdown.remaining} total={result.countdown.total} small />
              )}
              <p className="min-w-[12rem] flex-1 text-[11px] leading-snug text-white/65">{statusText}</p>
            </div>

            {paused && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <button type="button" onClick={togglePause} className="rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-white shadow-lg">{t('Davom ettirish', 'Продолжить')}</button>
              </div>
            )}
          </div>

          {/* Matn */}
          <div className="flex min-h-0 flex-1 flex-col bg-[#06150d] px-3 pb-3 pt-3 sm:px-5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => goTo(index - 1, 'manual')} disabled={index === 0} aria-label={t('Oldingi bosqich', 'Предыдущий этап')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 disabled:opacity-30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
              </button>
              <div role="tablist" aria-label={t('Matn ko‘rinishi', 'Вид текста')} className="flex flex-1 gap-1 overflow-x-auto rounded-xl bg-black/30 p-1">
                {tabs.filter((tb) => tb.show).map((tb) => (
                  <button key={tb.id} type="button" role="tab" aria-selected={tab === tb.id} onClick={() => setTab(tb.id)} className={`min-h-[2.25rem] flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition ${tab === tb.id ? 'bg-emerald-500 text-white' : 'text-white/65 hover:bg-white/5'}`}>
                    {tb.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => goTo(index + 1, 'manual')} aria-label={t('Keyingi bosqich', 'Следующий этап')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
            {takbirBeforeRuku && (
              <div
                role="status"
                className={`mt-3 flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-center text-sm font-bold transition-colors duration-500 sm:text-base ${
                  takbirSoon
                    ? 'bg-accent-400 text-primary-900 shadow-lg shadow-accent-500/20 motion-safe:animate-pulse'
                    : 'bg-accent-400/10 text-accent-400 ring-1 ring-accent-400/40'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3m12 0h3m-2.6-6.4-2.1 2.1M8 21h8M9 17h6a5 5 0 1 0-6 0Z" />
                </svg>
                <span>
                  {t('Keyin ruku’:', 'Далее руку’:')} «{takbirBeforeRuku}» {t('deb ruku’ga boring', '— и совершите руку’')}
                </span>
              </div>
            )}
            <div ref={textRef} role="tabpanel" className={`relative mt-3 flex-1 overflow-y-auto overscroll-contain ${fullscreen.isFullscreen ? 'max-h-[60vh]' : 'max-h-[55vh] min-h-[8rem]'}`}>
              {tab === 'lotin' && zikr.length > 0 && (
                <ul className="flex flex-col items-center gap-4 text-center">
                  {zikr.map((z, i) => (
                    <li key={i}>
                      {z.label && <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-accent-400/90 md:text-xs">{z.label}</span>}
                      <span className={`inline-flex items-baseline gap-3 font-semibold text-white ${textSize}`}>
                        {z.text}
                        {z.times > 1 && (
                          <span className="rounded-full bg-accent-400/15 px-2.5 py-0.5 text-base font-bold text-accent-400 ring-1 ring-accent-400/40 md:text-lg" title={t(`Kamida ${z.times} marta`, `Не менее ${z.times} раз`)}>
                            ×{z.times}
                          </span>
                        )}
                      </span>
                      {z.meaning && <span className="mt-1 block text-sm text-white/55 md:text-base">{z.meaning}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {tab === 'lotin' && zikr.length === 0 && stage.kind === 'posture' && (
                <p className="text-center text-base text-white/60">{t('Manbada bu holat uchun alohida zikr ko‘rsatilmagan.', 'В источнике для этого положения отдельный зикр не указан.')}</p>
              )}
              {tab === 'lotin' && zikr.length === 0 && stage.kind !== 'posture' && latin && (
                <p className={`text-center font-semibold text-white ${textSize}`}>
                  {latin.map((a) => (
                    <span key={a.number} data-ayah={a.number - 1} className={`transition-colors ${a.heard >= AYAH_HEARD ? 'text-emerald-300' : ''}`}>
                      {a.label && <span className="text-white/35">{a.label}. </span>}{a.latin}{' '}
                    </span>
                  ))}
                </p>
              )}
              {tab === 'lotin' && zikr.length === 0 && stage.kind !== 'posture' && !latin && <p className={`whitespace-pre-line text-center font-semibold text-white ${textSize}`}>{bigText}</p>}
              {tab === 'arab' && rec?.arabic && (
                <p lang="ar" dir="rtl" className={`font-quran text-center text-white ${settings.large_text ? 'text-5xl leading-[2.2]' : 'text-4xl leading-[2.2]'}`}>
                  {rec.arabic.map((a, i) => <span key={i}>{a} <span className="text-accent-400">﴿{i + 1}﴾</span> </span>)}
                </p>
              )}
              {tab === 'mano' && <p className="whitespace-pre-line text-lg leading-8 text-white/85">{rec?.meaning}</p>}
              {tab === 'tafsilot' && <p className="whitespace-pre-line text-lg leading-8 text-white/85">{instruction}</p>}
            </div>
            {/* Ko'rsatilayotgan matnning manbasi */}
            <div className="mt-2 text-center">
              {tab === 'arab' ? (
                <SourceLine prefix={t('Arabcha matn', 'Арабский текст')} title="Tanzil Project (CC BY 3.0)" url="https://tanzil.net" />
              ) : rec && (tab === 'lotin' || tab === 'mano') && !stage.zikr?.length ? (
                <SourceLine title={rec.source_title} url={rec.source_url} />
              ) : (
                <SourceLine title={stage.source_title} url={stage.source_url} />
              )}
            </div>
            {match && match.matched > 0 && (
              <p className="mt-2 text-center text-[11px] text-emerald-300/80">{t('Tanilgan so‘zlar', 'Распознано слов')}: {match.matched} / {match.total}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
