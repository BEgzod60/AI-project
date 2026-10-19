import type { BirgaRecitation, BirgaSession, Stage } from '../../types/birga';
import type { MicStatus } from '../../hooks/useVoiceActivity';
import { getLang } from '../../i18n';
import type { SpeechStatus } from '../../hooks/useSpeechRecognition';

export type Gender = 'erkak' | 'ayol';

/** Har bir rakatda o'qiladigan zam sura: { rakat: slug } */
export type ZamChoice = Record<number, string>;

/** Zam sura o'qiladigan rakatlar (tartiblangan) */
export function zamRakats(session: BirgaSession): number[] {
  return [...new Set(session.stages.filter((s) => s.zam).map((s) => s.rakat))].sort((a, b) => a - b);
}

/**
 * Har rakatning zam surasi: foydalanuvchi tanlaganlari (`picked`) saqlanadi, qolganlari — har rakatda
 * boshqa sura, Qur'on tartibida ketma-ket (masalan Ixlos → Falaq) va tanlanganlari bilan takrorlanmaydi.
 */
export function defaultZamChoice(session: BirgaSession, base: string, picked: ZamChoice = {}): ZamChoice {
  const list = session.zam_suras;
  const rakats = zamRakats(session);
  if (!list.length) return {};
  let start = Math.max(0, list.indexOf(base));
  if (start + rakats.length > list.length) start = Math.max(0, list.length - rakats.length);
  const valid: ZamChoice = {};
  for (const r of rakats) if (picked[r] && list.includes(picked[r])) valid[r] = picked[r];
  const used = new Set(Object.values(valid));
  const out: ZamChoice = {};
  rakats.forEach((r, i) => {
    if (valid[r]) {
      out[r] = valid[r];
      return;
    }
    let k = (start + i) % list.length;
    for (let tries = 0; used.has(list[k]) && tries < list.length; tries++) k = (k + 1) % list.length;
    out[r] = list[k];
    used.add(list[k]);
  });
  return out;
}

function zamFor(zam: ZamChoice, rakat: number, session: BirgaSession): string {
  return zam[rakat] ?? Object.values(zam)[0] ?? session.zam_suras[0] ?? '';
}

/** Bosqichda o'qiladigan sura/duo (zam sura — foydalanuvchi shu rakat uchun tanlagani) */
export function stageRecitation(stage: Stage, session: BirgaSession, zam: ZamChoice): BirgaRecitation | null {
  const slug = stage.zam ? zamFor(zam, stage.rakat, session) : stage.recitation;
  return slug ? session.recitations[slug] ?? null : null;
}

export function stageLabel(stage: Stage, session: BirgaSession, zam: ZamChoice): string {
  return stageRecitation(stage, session, zam)?.name ?? stage.title;
}

export function stageImage(stage: Stage, gender: Gender): string | null {
  const img = stage.images[0];
  if (!img) return null;
  return gender === 'ayol' && img.src_female ? img.src_female : img.src;
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Mikrofon va nutqni aniqlash holatini bitta, halol yozuvga aylantiradi */
export function listeningState(mic: MicStatus, speech: SpeechStatus, speechWanted: boolean) {
  const t = (uz: string, ru: string) => (getLang() === 'ru' ? ru : uz);
  const timer = t('Taymer bo‘yicha davom etadi', 'Продолжится по таймеру');
  if (mic === 'requesting') return { tone: 'wait', label: t('Mikrofon so‘ralmoqda…', 'Запрос микрофона…'), detail: '' } as const;
  if (mic === 'denied') return { tone: 'off', label: t('Mikrofonga ruxsat berilmadi', 'Доступ к микрофону запрещён'), detail: timer } as const;
  if (mic === 'insecure') return { tone: 'off', label: t('Mikrofon faqat HTTPS’da ishlaydi', 'Микрофон работает только по HTTPS'), detail: timer } as const;
  if (mic === 'unavailable') return { tone: 'off', label: t('Mikrofon topilmadi', 'Микрофон не найден'), detail: timer } as const;
  if (mic === 'error') return { tone: 'off', label: t('Mikrofon uzildi', 'Микрофон отключился'), detail: timer } as const;
  if (mic !== 'active') return { tone: 'off', label: t('Mikrofon o‘chiq', 'Микрофон выключен'), detail: t('Taymer bo‘yicha', 'По таймеру') } as const;
  if (!speechWanted) return { tone: 'on', label: t('Ovoz faolligi kuzatilmoqda', 'Отслеживается голос'), detail: t('Faqat qurilmada · nutq tanilmaydi', 'Только на устройстве · речь не распознаётся') } as const;
  if (speech === 'listening') return { tone: 'on', label: t('AI tinglamoqda…', 'ИИ слушает…'), detail: t('Arabcha nutq tanilmoqda', 'Распознаётся арабская речь') } as const;
  const noWords = t('Bu brauzer so‘zlarni tanimaydi — Chrome/Edge’da oching', 'Браузер не распознаёт слова — откройте в Chrome/Edge');
  if (speech === 'network') return { tone: 'warn', label: t('Mikrofon tinglayapti', 'Микрофон слушает'), detail: t('Internet uzildi — so‘zlar tanilmaydi, ovoz bo‘yicha o‘tadi', 'Нет интернета — слова не распознаются, переход по голосу') } as const;
  if (speech === 'service') return { tone: 'warn', label: t('Mikrofon tinglayapti', 'Микрофон слушает'), detail: noWords } as const;
  if (speech === 'unsupported') return { tone: 'warn', label: t('Mikrofon tinglayapti', 'Микрофон слушает'), detail: noWords } as const;
  if (speech === 'denied') return { tone: 'warn', label: t('Ovoz faolligi kuzatilmoqda', 'Отслеживается голос'), detail: t('Nutqni tanishga ruxsat yo‘q', 'Нет доступа к распознаванию речи') } as const;
  return { tone: 'wait', label: t('Ulanmoqda…', 'Подключение…'), detail: '' } as const;
}

export function MicIndicator({ state, level, speaking }: { state: ReturnType<typeof listeningState>; level: number; speaking: boolean }) {
  const on = state.tone === 'on' || state.tone === 'warn';
  const bars = 18;
  return (
    <div className="flex items-center gap-3 rounded-full bg-black/55 py-1.5 pl-1.5 pr-4 ring-1 ring-white/10 backdrop-blur-md" role="status" aria-live="polite">
      <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${on ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400' : 'bg-white/10 text-white/60 ring-1 ring-white/20'}`}>
        {on && speaking && <span className="absolute inset-0 rounded-full bg-emerald-400/30 motion-safe:animate-ping" aria-hidden />}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="relative h-5 w-5" aria-hidden>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path strokeLinecap="round" d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          {!on && <path strokeLinecap="round" d="M4 4l16 16" />}
        </svg>
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-bold ${on ? 'text-emerald-300' : 'text-white/80'}`}>{state.label}</span>
        {on ? (
          <span className="mt-1 flex h-4 items-center gap-[3px]" aria-hidden>
            {Array.from({ length: bars }, (_, i) => {
              const wave = Math.abs(Math.sin((i + 1) * 1.7));
              const h = Math.max(0.15, Math.min(1, level * (0.5 + wave)));
              return <span key={i} className="w-[3px] rounded-full bg-emerald-400/90 transition-[height] duration-100" style={{ height: `${h * 100}%` }} />;
            })}
          </span>
        ) : null}
        {state.detail && <span className="block text-[11px] text-white/55">{state.detail}</span>}
      </span>
    </div>
  );
}

/** Aylana taymer: qolgan vaqt (soniya) va jami */
export function CountdownRing({ remaining, total, label, small = false }: { remaining: number; total: number; label?: string; small?: boolean }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  return (
    <div className={`relative shrink-0 ${small ? 'h-14 w-14' : 'h-24 w-24'}`} role="timer" aria-label={getLang() === 'ru' ? `Осталось примерно ${Math.ceil(remaining)} с` : `Taxminiy qolgan vaqt ${Math.ceil(remaining)} soniya`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="rgb(0 0 0 / 0.45)" stroke="rgb(255 255 255 / 0.12)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="#34d399" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} className="transition-[stroke-dashoffset] duration-200 ease-linear" />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none text-white">
        <span className={`font-extrabold tabular-nums ${small ? 'text-xl' : 'text-3xl'}`}>{Math.ceil(remaining)}</span>
        {label && <span className="mt-1 text-[10px] font-semibold text-white/60">{label}</span>}
      </span>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-black/30 p-1 ring-1 ring-white/10">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-[2.25rem] rounded-lg px-2 text-xs font-semibold transition sm:text-sm ${value === o.id ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400' : 'text-white/70 hover:bg-white/5'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-3 rounded-xl bg-black/25 px-3 py-2.5 ring-1 ring-white/10 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span className="min-w-0">
        <span className="block text-sm text-white">{label}</span>
        {hint && <span className="block text-[11px] leading-snug text-white/50">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-400" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
