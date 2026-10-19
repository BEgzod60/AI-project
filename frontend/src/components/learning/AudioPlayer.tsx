import { useEffect, useRef, useState } from 'react';
import { getAudio } from '../../services/learningService';
import type { AudioDescriptor } from '../../types/learning';
import { useT } from '../../i18n';

const SPEEDS = [0.75, 1, 1.25, 1.5];
const UNAVAILABLE: [string, string] = ['Audio hozircha mavjud emas', 'Аудио пока недоступно'];

/** Sahifada bir vaqtda faqat bitta audio o'ynasin */
let currentlyPlaying: HTMLAudioElement | null = null;

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Mode = 'full' | 'verses';

interface AudioPlayerProps {
  audio: AudioDescriptor | null;
  label: string;
  /** Audio yo'q bo'lsa ko'rsatiladigan rasmiy maqola havolasi */
  reference?: { url: string; title: string } | null;
}

export function AudioPlayer({ audio, label, reference }: AudioPlayerProps) {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement>(null);
  // Tanzil'da faqat oyatma-oyat bor — birinchi mavjud rejim tanlanadi
  const [mode, setMode] = useState<Mode>(audio?.modes[0] ?? 'full');
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [verses, setVerses] = useState<{ verse: number; url: string }[] | null>(null);
  const [verseIdx, setVerseIdx] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const pendingPlay = useRef(false);

  // Boshqa sura/duo tanlanganda pleyer boshlang'ich holatga qaytadi
  useEffect(() => {
    setMode(audio?.modes[0] ?? 'full');
    setFullUrl(null);
    setVerses(null);
    setVerseIdx(0);
    setStatus('idle');
    setPlaying(false);
    setTime(0);
    setDuration(0);
  }, [audio?.id]);

  useEffect(() => {
    const el = audioRef.current;
    return () => {
      if (el && currentlyPlaying === el) currentlyPlaying = null;
      el?.pause();
    };
  }, []);

  const src = !audio ? null : mode === 'full' ? fullUrl : verses?.[verseIdx]?.url ?? null;

  // Havola olingach (yoki keyingi oyatga o'tilganda) ijroni boshlash — preload="none" bo'lgani uchun
  useEffect(() => {
    if (src && pendingPlay.current) {
      pendingPlay.current = false;
      void play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!audio) {
    return (
      <div className="rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
        <p className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5ZM22 9l-6 6M16 9l6 6" />
          </svg>
          {t(...UNAVAILABLE)}
        </p>
        {reference && (
          <a
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block pl-6 text-[11px] underline decoration-neutral-300 underline-offset-2 hover:text-primary-600"
          >
            {reference.title} ↗
          </a>
        )}
      </div>
    );
  }

  const load = async (m: Mode) => {
    setStatus('loading');
    try {
      const res = await getAudio(audio.id, m);
      if (res.mode === 'verses') {
        setVerses(res.verses);
        setVerseIdx(0);
      } else {
        setFullUrl(res.url);
      }
      setStatus('ready');
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  };

  const play = async () => {
    const el = audioRef.current;
    if (!el) return;
    const needs = mode === 'full' ? !fullUrl : !verses;
    if (needs) {
      pendingPlay.current = true;
      await load(mode);
      return; // <audio> yangi src bilan yuklangach onCanPlay da boshlanadi
    }
    if (currentlyPlaying && currentlyPlaying !== el) currentlyPlaying.pause();
    currentlyPlaying = el;
    el.playbackRate = speed;
    try {
      await el.play();
    } catch {
      setStatus('error');
    }
  };

  const toggle = () => {
    const el = audioRef.current;
    if (playing && el) el.pause();
    else void play();
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    audioRef.current?.pause();
    setMode(m);
    setTime(0);
    setDuration(0);
    setStatus((m === 'full' ? fullUrl : verses) ? 'ready' : 'idle');
  };

  const goVerse = (i: number) => {
    pendingPlay.current = true;
    setVerseIdx(i);
  };

  return (
    <div className="rounded-xl bg-neutral-50 p-3 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      {audio.modes.includes('verses') && audio.modes.includes('full') && (
        <div className="mb-2 flex gap-1 rounded-lg bg-white p-0.5 text-[11px] font-semibold ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10" role="group" aria-label={t('Tinglash usuli', 'Режим прослушивания')}>
          {(['full', 'verses'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-md py-1 transition ${mode === m ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10'}`}
            >
              {m === 'full' ? t('Butun sura', 'Вся сура') : t('Oyatma-oyat', 'По аятам')}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={status === 'loading'}
          aria-label={`${playing ? t('To‘xtatish', 'Пауза') : t('Tinglash', 'Слушать')}: ${label}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow transition hover:bg-primary-700 disabled:opacity-60"
        >
          {status === 'loading' ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-4 w-4" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            disabled={!duration}
            onChange={(e) => {
              const el = audioRef.current;
              if (el) el.currentTime = Number(e.target.value);
              setTime(Number(e.target.value));
            }}
            aria-label={t('Audio o‘rni', 'Позиция аудио')}
            className="h-1.5 w-full cursor-pointer accent-primary-600 disabled:cursor-default"
          />
          <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-neutral-500">
            <span>{fmt(time)}</span>
            <span>
              {mode === 'verses' && verses ? `${t(`${verses[verseIdx]?.verse ?? ''}-oyat`, `аят ${verses[verseIdx]?.verse ?? ''}`)} · ` : ''}
              {fmt(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Tezlik: ochiladigan ro'yxat o'rniga doim ko'rinadigan segmentli tugmalar */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 13l4-4M4.5 18a9 9 0 1 1 15 0" />
          </svg>
          Tezlik
        </span>
        <div
          role="radiogroup"
          aria-label={t('Tinglash tezligi', 'Скорость')}
          className="grid flex-1 grid-cols-4 gap-0.5 rounded-full bg-white p-0.5 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
        >
          {SPEEDS.map((s) => {
            const active = s === speed;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setSpeed(s);
                  if (audioRef.current) audioRef.current.playbackRate = s;
                }}
                className={`rounded-full py-1 text-[11px] font-bold tabular-nums transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  active
                    ? 'bg-gradient-to-br from-accent-400 to-accent-500 text-primary-900 shadow-sm'
                    : 'text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-white/10'
                }`}
              >
                {s}×
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'verses' && verses && verses.length > 1 && (
        <div className="mt-2 flex max-h-20 flex-wrap gap-1 overflow-y-auto" aria-label={t('Oyatlar', 'Аяты')}>
          {verses.map((v, i) => (
            <button
              key={v.verse}
              type="button"
              onClick={() => goVerse(i)}
              aria-current={i === verseIdx ? 'true' : undefined}
              className={`h-6 min-w-[1.5rem] rounded-md px-1 text-[10px] font-semibold tabular-nums transition ${
                i === verseIdx ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 ring-1 ring-black/5 hover:bg-primary-50 dark:bg-neutral-900 dark:text-neutral-300'
              }`}
            >
              {v.verse}
            </button>
          ))}
        </div>
      )}

      {status === 'error' && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
          {t(...UNAVAILABLE)}.{' '}
          <button type="button" onClick={() => void load(mode)} className="font-semibold underline">{t('Qayta urinish', 'Повторить')}</button>
        </p>
      )}

      {audio.display_note && (
        <p className="mt-2 text-[11px] leading-snug text-neutral-600 dark:text-neutral-400">{audio.display_note}</p>
      )}
      <p className="mt-1 break-words text-[10px] leading-snug text-neutral-500">
        {audio.reciter && <>Qori: {audio.reciter} · </>}
        <a href={audio.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">
          {t('Manba', 'Источник')}{audio.provider === 'tanzil' ? ': Tanzil Project (tanzil.net)' : audio.provider === 'muslim_uz' ? ': muslim.uz' : ''}
        </a>
      </p>

      <audio
        ref={audioRef}
        src={src ?? undefined}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          e.currentTarget.playbackRate = speed;
        }}
        onEnded={() => {
          setPlaying(false);
          if (mode === 'verses' && verses && verseIdx < verses.length - 1) goVerse(verseIdx + 1);
        }}
        onError={() => {
          if (src) setStatus('error');
          setPlaying(false);
        }}
      />
    </div>
  );
}
