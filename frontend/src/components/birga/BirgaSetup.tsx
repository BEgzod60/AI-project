import { useState } from 'react';
import type { BirgaSession, BirgaSettings, Sensitivity, Speed } from '../../types/birga';
import { isBrave, speechSupported } from '../../hooks/useSpeechRecognition';
import { MicCheck } from './MicCheck';
import { Segmented, Toggle, stageLabel, type Gender } from './shared';
import { ZamSuraSelect } from './ZamSuraSelect';
import { PartPicker } from './PartPicker';

interface Props {
  session: BirgaSession;
  settings: BirgaSettings;
  update: <K extends keyof BirgaSettings>(key: K, value: BirgaSettings[K]) => void;
  zam: string;
  onZam: (slug: string) => void;
  gender: Gender;
  onGender: (g: Gender) => void;
  offline: boolean;
  onPart: (index: number) => void;
  partLoading: boolean;
  partError: boolean;
  onStart: () => void;
  onExit: () => void;
}

const SPEEDS: { id: Speed; label: string }[] = [
  { id: 'sekin', label: 'Sekin' },
  { id: 'ortacha', label: 'O‘rtacha' },
  { id: 'tez', label: 'Tez' },
];
const SENS: { id: Sensitivity; label: string }[] = [
  { id: 'past', label: 'Past' },
  { id: 'ortacha', label: 'O‘rtacha' },
  { id: 'yuqori', label: 'Yuqori' },
];

export function BirgaSetup({ session, settings, update, zam, onZam, gender, onGender, offline, onPart, partLoading, partError, onStart, onExit }: Props) {
  const [agreed, setAgreed] = useState(false);
  const { min, max } = session.settings.fallback_seconds;
  const wakeLockSupported = 'wakeLock' in navigator;
  // Brave'da SpeechRecognition bor, lekin ishlamaydi
  const canSpeech = speechSupported() && !isBrave();
  const zamOptions = session.zam_suras.map((s) => session.recitations[s]).filter(Boolean);
  const secure = window.isSecureContext;

  return (
    <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Chap: ketma-ketlik va ogohlantirish */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} aria-label="Orqaga" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 transition hover:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div>
            <h2 className="font-display text-lg font-bold min-[400px]:text-xl sm:text-2xl"><span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300 sm:hidden">Birga o‘qish</span><span className="hidden sm:inline">Birga o‘qish — </span>{session.category.name} namozi</h2>
            <p className="text-sm text-white/60">{session.rakats} rakat · {session.stages.length} bosqich · boshlangandan keyin tugma bosish shart emas</p>
          </div>
        </div>

        <PartPicker parts={session.parts} value={session.part} onChange={onPart} loading={partLoading} />
        {partError && (
          <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-400/30">Tanlangan qism yuklanmadi — internetni tekshirib, qayta tanlang.</p>
        )}

        {offline && (
          <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-300/30">Internet yo‘q — oxirgi saqlangan matnlar ko‘rsatilmoqda.</p>
        )}

        <div role="note" className="rounded-2xl bg-amber-400/[0.08] p-4 ring-1 ring-amber-300/30">
          <p className="flex items-center gap-2 font-bold text-amber-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
            Boshlashdan oldin o‘qing
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{session.safety_notice}</p>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-white">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" />
            Ogohlantirishni o‘qidim va tushundim
          </label>
        </div>

        <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
          <h3 className="text-sm font-bold text-white/80">Ketma-ketlik</h3>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {session.stages.map((s, i) => (
              <li key={s.index} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/75 ring-1 ring-white/10">
                {(i === 0 || session.stages[i - 1].rakat !== s.rakat) && <span className="mr-1 font-bold text-accent-400">{s.rakat}-r.</span>}
                {stageLabel(s, session, zam)}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-white/45">Ketma-ketlik muslim.uz’dagi tasdiqlangan dars qadamlaridan tuzilgan; AI matn yaratmaydi.</p>
        </div>
      </div>

      {/* O'ng: sozlamalar */}
      <section aria-labelledby="birga-sozlama" className="space-y-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
        <h3 id="birga-sozlama" className="flex items-center gap-2 font-bold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-emerald-300" aria-hidden><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
          Namoz rejimi sozlamalari
        </h3>

        {zamOptions.length > 0 && (
          <ZamSuraSelect options={zamOptions} value={zam} onChange={onZam} />
        )}

        <div>
          <span className="mb-1 block text-xs text-white/60">Rasmlar</span>
          <Segmented label="Rasmlar" value={gender} onChange={onGender} options={[{ id: 'erkak', label: 'Erkaklar' }, { id: 'ayol', label: 'Ayollar' }]} />
        </div>
        <div>
          <span className="mb-1 block text-xs text-white/60">Qiroat tezligi</span>
          <Segmented label="Qiroat tezligi" value={settings.speed} onChange={(v) => update('speed', v)} options={SPEEDS} />
        </div>
        <div>
          <span className="mb-1 block text-xs text-white/60">AI sezgirligi (mikrofon)</span>
          <Segmented label="AI sezgirligi" value={settings.sensitivity} onChange={(v) => update('sensitivity', v)} options={SENS} />
        </div>

        <MicCheck threshold={session.settings.sensitivity[settings.sensitivity].rms} speech={settings.speech && canSpeech} reference={session.recitations.fotiha} />

        <div className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-3 py-2 ring-1 ring-white/10">
          <span className="min-w-0">
            <span className="block text-sm">Zaxira taymer</span>
            <span className="block text-[11px] text-white/50">AI o‘qishingizni tanimasa, jim bo‘lganingizdan keyin shuncha kutiladi</span>
          </span>
          <span className="flex items-center gap-1">
            <button type="button" aria-label="Kamaytirish" disabled={settings.fallback <= min} onClick={() => update('fallback', settings.fallback - 1)} className="h-9 w-9 rounded-lg bg-white/5 text-lg ring-1 ring-white/15 disabled:opacity-30">−</button>
            <span className="w-16 text-center text-sm font-semibold tabular-nums">{settings.fallback} soniya</span>
            <button type="button" aria-label="Oshirish" disabled={settings.fallback >= max} onClick={() => update('fallback', settings.fallback + 1)} className="h-9 w-9 rounded-lg bg-white/5 text-lg ring-1 ring-white/15 disabled:opacity-30">+</button>
          </span>
        </div>

        <Toggle label="Katta matn (masofadan o‘qish)" checked={settings.large_text} onChange={(v) => update('large_text', v)} />
        <Toggle label="Ekran doim yoniq" hint={wakeLockSupported ? undefined : 'Bu brauzer qo‘llamaydi'} checked={settings.wake_lock && wakeLockSupported} disabled={!wakeLockSupported} onChange={(v) => update('wake_lock', v)} />
        <Toggle label="Tungi rejim" hint="Ekran yorqinligi pasayadi" checked={settings.night} onChange={(v) => update('night', v)} />
        <Toggle
          label="Nutqni aniqlash (AI)"
          hint={canSpeech
            ? 'Brauzer xizmati: Chrome/Edge’da ovoz tanish uchun brauzer serveriga yuboriladi. O‘chirilsa — faqat qurilmadagi ovoz faolligi.'
            : isBrave()
              ? 'Brave so‘zlarni tanimaydi — Google Chrome yoki Microsoft Edge’da oching. Hozir ovoz faolligi va taymer ishlaydi.'
              : 'Bu brauzer qo‘llamaydi — faqat ovoz faolligi va taymer ishlaydi.'}
          checked={settings.speech && canSpeech}
          disabled={!canSpeech}
          onChange={(v) => update('speech', v)}
        />
        <Toggle label="Ovoz yozuvlari saqlanmaydi" hint="Ilova ovozni yozib olmaydi va o‘z serveriga yubormaydi — har doim yoqiq" checked disabled onChange={() => {}} />
        <Toggle label="Offline matn va rasmlar" hint="Keyingi safar internetsiz ham ochiladi" checked={settings.offline} onChange={(v) => update('offline', v)} />

        {!secure && <p className="text-[11px] text-amber-200">Mikrofon faqat HTTPS (yoki localhost) orqali ishlaydi — hozir faqat taymer bo‘ladi.</p>}

        <button
          type="button"
          onClick={onStart}
          disabled={!agreed || partLoading}
          className="min-h-[3rem] w-full rounded-xl bg-emerald-500 text-base font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
        >
          Boshlash
        </button>
        {!agreed && <p className="text-center text-[11px] text-white/50">Boshlash uchun ogohlantirishni tasdiqlang</p>}
      </section>
    </div>
  );
}
