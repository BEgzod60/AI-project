import { useEffect, useRef, useState } from 'react';
import type { AyahAudio } from '../../types/quran';

const RECITER_KEY = 'quran-reciter';

/** Oyat fayli nomi Tanzil formatida: 112001 — 112-sura, 1-oyat. */
function ayahFile(surah: number, ayah: number) {
  return `${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}`;
}

function readReciter(reciters: AyahAudio['reciters']) {
  try {
    const saved = localStorage.getItem(RECITER_KEY);
    if (saved && reciters.some((r) => r.id === saved)) return saved;
  } catch { /* localStorage yopiq bo'lishi mumkin */ }
  return reciters[0]?.id ?? '';
}

/** Ismning bosh harflari: «Mishari Rashid al-Afasy» → «MA». */
function initials(name: string) {
  const words = name.replace(/\b(al|as|ad)-/gi, '').split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

function Avatar({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-wide ${active ? 'bg-primary-700 text-white' : 'bg-gradient-to-br from-accent-400/30 to-primary-500/20 text-primary-800 dark:text-accent-400'}`}>
      {initials(name)}
    </span>
  );
}

function ReciterPicker({ reciters, value, onChange }: { reciters: AyahAudio['reciters']; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = reciters.find((r) => r.id === value) ?? reciters[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!selected) return null;

  return (
    <div ref={rootRef} className="relative ml-auto min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-h-[2.75rem] max-w-[15rem] items-center gap-2 rounded-2xl bg-white py-1 pl-1 pr-3 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow dark:bg-neutral-800 ${open ? 'ring-primary-500/60' : 'ring-black/10 hover:ring-primary-500/40 dark:ring-white/15'}`}
      >
        <Avatar name={selected.name} active />
        <span className="min-w-0 leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Qori</span>
          <span className="block truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{selected.name}</span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <ul role="listbox" aria-label="Qorini tanlang" className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/10 dark:bg-neutral-800 dark:ring-white/15">
          {reciters.map((r) => {
            const active = r.id === selected.id;
            return (
              <li key={r.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => { onChange(r.id); setOpen(false); }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm transition ${active ? 'bg-primary-50 font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-emerald-200' : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5'}`}
                >
                  <Avatar name={r.name} active={active} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  {active && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4 shrink-0 text-primary-700 dark:text-accent-400" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface Props {
  audio: AyahAudio;
  surah: number;
  versesCount: number;
  /** Hozir o'qilayotgan oyat (0 — Basmala), to'xtagan bo'lsa null. */
  current: number | null;
  onCurrentChange: (ayah: number | null) => void;
  /** Tashqaridan (oyat ustidagi tugma) boshlash so'rovi. */
  request: { ayah: number; id: number } | null;
}

export function AyahPlayer({ audio, surah, versesCount, current, onCurrentChange, request }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [reciter, setReciter] = useState(() => readReciter(audio.reciters));
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [error, setError] = useState(false);
  // O'zimizdagi fayl ochilmasa, shu oyat Tanzil'dan qayta so'raladi.
  const fallbackRef = useRef(false);

  // Fotiha'da Basmala 1-oyat, Tavba'da Basmala yo'q; qolganlarida avval Basmala (001001) o'qiladi.
  const hasBasmala = surah !== 1 && surah !== 9;
  const first = hasBasmala ? 0 : 1;

  const isLocal = audio.reciters.some((r) => r.id === reciter && r.local);

  const src = (ayah: number, remote: boolean) => (isLocal && !remote ? audio.local_url_template : audio.url_template)
    .replace('{reciter}', reciter)
    .replace('{file}', ayah === 0 ? ayahFile(1, 1) : ayahFile(surah, ayah));

  const play = (ayah: number, remote = false) => {
    const el = ref.current;
    if (!el) return;
    setError(false);
    fallbackRef.current = remote;
    el.src = src(ayah, remote);
    onCurrentChange(ayah);
    el.play().catch(() => setPlaying(false));
  };

  const stop = () => {
    ref.current?.pause();
    setPlaying(false);
    onCurrentChange(null);
  };

  useEffect(() => {
    if (request) play(request.ayah);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const changeReciter = (id: string) => {
    setReciter(id);
    try { localStorage.setItem(RECITER_KEY, id); } catch { /* e'tiborsiz */ }
  };

  // Qori almashsa, o'qilayotgan oyat yangi qori ovozida davom etadi.
  useEffect(() => {
    if (current !== null && playing) play(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciter]);

  const handleEnded = () => {
    if (current === null) return;
    if (repeat) return play(current);
    if (current < versesCount) return play(current + 1);
    stop();
  };

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (current === null) return play(first);
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  const step = (delta: number) => {
    const base = current ?? first - 1;
    play(Math.min(versesCount, Math.max(first, base + delta)));
  };

  const label = current === null ? 'Tinglash' : current === 0 ? 'Basmala' : `${current}-oyat`;
  const btn = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/10 transition hover:ring-primary-500/40 disabled:opacity-40 dark:ring-white/15';

  return (
    <div className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      <audio
        ref={ref}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
        onError={() => {
          if (current === null) return;
          if (isLocal && !fallbackRef.current) return play(current, true);
          setError(true);
          setPlaying(false);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => step(-1)} disabled={current === null || current <= first} aria-label="Oldingi oyat" className={btn}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
        </button>
        <button type="button" onClick={toggle} aria-label={playing ? 'To‘xtatish' : 'Tinglash'} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white shadow-sm transition hover:bg-primary-800">
          {playing
            ? <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5" aria-hidden><path d="M7 4v16l13-8z" /></svg>}
        </button>
        <button type="button" onClick={() => step(1)} disabled={current !== null && current >= versesCount} aria-label="Keyingi oyat" className={btn}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
        </button>
        <button type="button" onClick={() => setRepeat((v) => !v)} aria-pressed={repeat} title="Oyatni takrorlash (yodlash uchun)" className={`${btn} ${repeat ? 'bg-primary-700 text-white ring-primary-700' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" /></svg>
        </button>
        <span className="min-w-[4.5rem] text-sm font-semibold tabular-nums text-neutral-700 dark:text-neutral-200" aria-live="polite">{label}</span>
        {current !== null && (
          <button type="button" onClick={stop} className="text-xs font-semibold text-neutral-500 underline">To‘xtatish</button>
        )}
        <ReciterPicker reciters={audio.reciters} value={reciter} onChange={changeReciter} />
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">Audio yuklanmadi. Internetni tekshiring yoki boshqa qorini tanlang.</p>}
      <p className="mt-2 text-xs text-neutral-500">
        Oyatma-oyat tilovat · Manba: <a href={audio.source_url} target="_blank" rel="noopener noreferrer" className="underline">{audio.source_title}</a>
      </p>
    </div>
  );
}
