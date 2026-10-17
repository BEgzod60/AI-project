import { useEffect, useMemo, useRef, useState } from 'react';
import type { BirgaSession } from '../../types/birga';
import type { Lesson } from '../../types/learning';
import { useVoiceActivity } from '../../hooks/useVoiceActivity';
import { isBrave, speechSupported, useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { arabicTokens, matchRecitation } from '../../utils/birga/arabic';
import { AYAH_HEARD, latinAyahs } from '../../utils/birga/latin';
import { HeardLatin } from './HeardLatin';
import { AudioPlayer } from '../learning/AudioPlayer';
import { MicIndicator, Segmented, listeningState } from './shared';
import { ZamSuraSelect } from './ZamSuraSelect';
import { PartPicker } from './PartPicker';

interface Props {
  session: BirgaSession;
  lesson: Lesson;
  initialZam: string;
  onExit: () => void;
  onPart: (index: number) => void;
  partLoading: boolean;
  partError: boolean;
}

/** «Birga takrorlash» — mashq: namunani tinglash, ovoz chiqarib o'qish, tanilgan so'zlarni ko'rish */
export function BirgaTakrorlash({ session, lesson, initialZam, onExit, onPart, partLoading, partError }: Props) {
  const [zam, setZam] = useState(() => (session.zam_suras.includes(initialZam) ? initialZam : session.zam_suras[0] ?? ''));
  // Namozdagi tartibda, takrorlanmasdan
  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of session.stages) {
      const slug = s.zam ? zam : s.recitation;
      if (slug && !seen.has(slug) && session.recitations[slug]) {
        seen.add(slug);
        out.push(slug);
      }
    }
    return out;
  }, [session, zam]);

  const [selected, setSelected] = useState(items[0] ?? '');
  const [listening, setListening] = useState(false);
  const [view, setView] = useState<'ikkalasi' | 'arab' | 'lotin'>('ikkalasi');
  const listRef = useRef<HTMLOListElement>(null);
  const canSpeech = speechSupported() && !isBrave();
  const voice = useVoiceActivity(session.settings.sensitivity.ortacha.rms);
  const speech = useSpeechRecognition(listening && canSpeech && voice.status === 'active');

  const rec = session.recitations[selected] ?? session.recitations[items[0]];
  const tokens = useMemo(() => (rec?.arabic ? arabicTokens(rec.arabic.join(' ')) : []), [rec]);
  const match = tokens.length && speech.transcript ? matchRecitation(tokens.map((t) => t.norm), speech.transcript) : null;
  const matchedSet = new Set(match?.indices ?? []);
  // Lotincha oyatlar (muslim.uz) — qaysilari o'qilgani bilan
  const latin = useMemo(
    () => (rec?.arabic ? latinAyahs(rec.arabic, rec.transliteration, match?.indices ?? []) : null),
    [rec, match?.indices],
  );
  const audio = rec ? lesson.recitations[rec.slug]?.audio ?? null : null;
  const reference = rec ? lesson.recitations[rec.slug]?.audio_reference ?? null : null;

  const { start: startMic, stop: stopMic } = voice;
  const { reset } = speech;
  useEffect(() => {
    if (listening) void startMic();
    else stopMic();
  }, [listening, startMic, stopMic]);

  const choose = (slug: string) => {
    setSelected(slug);
    reset();
  };
  const idx = items.indexOf(rec?.slug ?? '');
  const partLabel = session.parts.find((p) => p.index === session.part)?.label;

  // Telefonda gorizontal ro'yxatda tanlangan element ko'rinib tursin (sahifa emas, faqat ro'yxat suriladi)
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !item || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2, behavior: 'smooth' });
  }, [rec?.slug]);

  return (
    <section aria-label="Birga takrorlash" className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#06180e] via-[#040d08] to-black text-white shadow-xl ring-1 ring-emerald-500/25">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-3 py-3 sm:px-5">
        <button type="button" onClick={() => { setListening(false); onExit(); }} aria-label="Orqaga" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 transition hover:bg-white/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-emerald-300 sm:hidden">
            Birga takrorlash{partLabel && <span className="text-accent-400"> · {partLabel}</span>}
          </p>
          <h2 className="truncate font-display text-base font-bold sm:text-xl">
            <span className="hidden sm:inline">Birga takrorlash — </span>{session.category.name} namozi
            {partLabel && <span className="hidden font-semibold text-accent-400 sm:inline"> · {partLabel}</span>}
          </h2>
          <p className="text-[11px] text-white/50">Mashq rejimi: namunani tinglang, so‘ng ovoz chiqarib o‘qing — AI tanigan so‘zlarni belgilaydi.</p>
        </div>
      </header>

      {session.parts.length > 1 && (
        <div className="border-b border-white/10 px-3 py-3 sm:px-5">
          <PartPicker parts={session.parts} value={session.part} onChange={onPart} loading={partLoading} />
          {partError && <p className="mt-2 text-xs text-rose-200">Tanlangan qism yuklanmadi — internetni tekshirib, qayta tanlang.</p>}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Sura va duolar" className="min-w-0">
          <ol ref={listRef} className="relative flex snap-x gap-1.5 overflow-x-auto overscroll-x-contain pb-1 lg:flex-col lg:overflow-visible">
            {items.map((slug, i) => {
              const r = session.recitations[slug];
              const active = slug === rec?.slug;
              return (
                <li key={slug} className="shrink-0 snap-start">
                  <button type="button" onClick={() => choose(slug)} aria-current={active ? 'true' : undefined} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition ${active ? 'bg-emerald-500/15 font-semibold ring-1 ring-emerald-400/60' : 'text-white/75 hover:bg-white/5'}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-emerald-500' : 'ring-1 ring-white/20'}`}>{i + 1}</span>
                    <span className="whitespace-nowrap lg:whitespace-normal">{r.name}</span>
                    {r.arabic && <span className="ml-auto hidden rounded bg-accent-400/15 px-1.5 text-[10px] font-bold text-accent-400 lg:inline">AI</span>}
                  </button>
                </li>
              );
            })}
          </ol>
          {session.zam_suras.length > 0 && (
            <div className="mt-3">
              <ZamSuraSelect
                options={session.zam_suras.map((s) => session.recitations[s]).filter(Boolean)}
                value={zam}
                onChange={(slug) => { setZam(slug); choose(slug); }}
              />
            </div>
          )}
        </nav>

        {rec && (
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-xl font-extrabold sm:text-2xl">{rec.name}</h3>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                <button type="button" onClick={() => choose(items[idx - 1])} disabled={idx <= 0} className="h-11 rounded-xl bg-white/5 px-3 text-sm font-semibold ring-1 ring-white/15 disabled:opacity-30 sm:h-10">← Oldingi</button>
                <button type="button" onClick={() => choose(items[idx + 1])} disabled={idx >= items.length - 1} className="h-11 rounded-xl bg-white/5 px-3 text-sm font-semibold ring-1 ring-white/15 disabled:opacity-30 sm:h-10">Keyingi →</button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-3 text-neutral-900 dark:bg-neutral-900 dark:text-white">
              <p className="mb-2 text-xs font-semibold text-neutral-500">1. Namunani tinglang</p>
              <AudioPlayer audio={audio} label={rec.name} reference={reference} />
            </div>

            <div className="rounded-2xl bg-black/30 p-3 ring-1 ring-white/10 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-white/60">2. Ovoz chiqarib o‘qing</p>
                <div className={`grid w-full gap-2 sm:flex sm:w-auto ${listening ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {listening && <button type="button" onClick={reset} className="h-11 rounded-xl bg-white/5 px-3 text-sm font-semibold ring-1 ring-white/15 sm:h-10">Qaytadan</button>}
                  <button type="button" onClick={() => setListening((v) => !v)} aria-pressed={listening} className={`h-11 rounded-xl px-4 text-sm font-bold transition sm:h-10 ${listening ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}>
                    {listening ? 'To‘xtatish' : 'Mikrofonni yoqish'}
                  </button>
                </div>
              </div>
              {listening && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <MicIndicator state={listeningState(voice.status, speech.status, canSpeech)} level={voice.level} speaking={voice.speaking} />
                  {match && (
                    // O'qib turganda ko'rinib tursin — uzun matn tagida emas
                    <div className="min-w-[10rem] flex-1">
                      <div className="flex justify-between text-xs text-white/60"><span>Tanilgan so‘zlar</span><span className="tabular-nums">{match.matched} / {match.total}</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.round(match.ratio * 100)}%` }} /></div>
                    </div>
                  )}
                </div>
              )}

              {tokens.length > 0 && (
                <div className="mt-4">
                  <Segmented label="Matn ko‘rinishi" value={view} onChange={setView} options={[
                    { id: 'ikkalasi', label: 'Ikkalasi' }, { id: 'arab', label: 'Arabcha' }, { id: 'lotin', label: 'Lotincha' },
                  ]} />
                </div>
              )}
              {tokens.length > 0 && view !== 'lotin' && (
                <p lang="ar" dir="rtl" className="mt-4 font-quran text-[1.65rem] leading-[2.1] min-[400px]:text-3xl sm:text-4xl sm:leading-[2.3]">
                  {tokens.map((t, i) => (
                    <span key={i} className={`transition-colors ${matchedSet.has(i) ? 'text-emerald-300' : 'text-white/85'}`}>{t.display} </span>
                  ))}
                </p>
              )}
              {(tokens.length === 0 || view !== 'arab') && (
                <p className={`whitespace-pre-line break-words text-center font-semibold leading-relaxed ${tokens.length && view === 'ikkalasi' ? 'mt-3 border-t border-white/10 pt-3 text-base text-white/80 sm:text-xl' : 'mt-4 text-lg sm:text-2xl'}`}>
                  {latin
                    ? latin.map((a) => (
                        <span key={a.number} className={`transition-colors ${a.heard >= AYAH_HEARD ? 'text-emerald-300' : ''}`}>
                          {a.label && <span className="text-white/40">{a.label}. </span>}{a.latin}{' '}
                        </span>
                      ))
                    : rec.transliteration}
                </p>
              )}

              {listening && speech.transcript && <HeardLatin transcript={speech.transcript} ayahs={latin} className="mt-3" />}
              <p className="mt-3 text-[11px] leading-relaxed text-white/45">
                {rec.arabic
                  ? 'So‘zlar Tanzil arabcha matni bilan solishtiriladi. Bu talaffuzni baholamaydi — faqat yordamchi belgi.'
                  : 'Bu duo uchun arabcha tasdiqlangan matn bazada yo‘q — faqat ovoz eshitilgani ko‘rsatiladi.'}
                {!canSpeech && ' Bu brauzer so‘zlarni tanimaydi — Google Chrome yoki Microsoft Edge’da oching; ovoz faolligi baribir ishlaydi.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
