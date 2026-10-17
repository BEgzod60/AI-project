import { useEffect, useMemo, useState } from 'react';
import type { BirgaRecitation } from '../../types/birga';
import { arabicWords, matchRecitation } from '../../utils/birga/arabic';
import { latinAyahs } from '../../utils/birga/latin';
import { HeardLatin } from './HeardLatin';
import { useVoiceActivity } from '../../hooks/useVoiceActivity';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { MicIndicator, listeningState } from './shared';

interface Props {
  threshold: number;
  speech: boolean;
  /** Sinash uchun sura (Fotiha) — eshitilgan so'zlar lotinchada shu bo'yicha ko'rsatiladi */
  reference?: BirgaRecitation | null;
}

/** Namozdan oldin mikrofonni sinash: ovoz darajasi, ovoz eshitildimi va so'zlar tanilyaptimi */
export function MicCheck({ threshold, speech, reference }: Props) {
  const [on, setOn] = useState(false);
  const [heard, setHeard] = useState(false);
  const voice = useVoiceActivity(threshold);
  const rec = useSpeechRecognition(on && speech && voice.status === 'active');
  const { start, stop } = voice;

  useEffect(() => {
    if (on) {
      setHeard(false);
      void start();
    } else stop();
  }, [on, start, stop]);

  useEffect(() => {
    if (on && voice.speaking) setHeard(true);
  }, [on, voice.speaking]);

  const state = listeningState(voice.status, rec.status, speech);
  const wordsOk = rec.transcript.trim().length > 0;
  const expected = useMemo(() => (reference?.arabic ? arabicWords(reference.arabic.join(' ')) : []), [reference]);
  const ayahs = useMemo(() => {
    if (!reference?.arabic || !wordsOk) return null;
    return latinAyahs(reference.arabic, reference.transliteration, matchRecitation(expected, rec.transcript).indices);
  }, [reference, expected, rec.transcript, wordsOk]);

  return (
    <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Mikrofonni sinash</span>
          <span className="block text-[11px] text-white/50">Boshlashdan oldin {reference ? `${reference.name}dan` : 'biror'} oyatni ovoz chiqarib o‘qib ko‘ring</span>
        </span>
        <button
          type="button"
          onClick={() => setOn((v) => !v)}
          aria-pressed={on}
          className={`h-10 shrink-0 rounded-xl px-3 text-sm font-bold transition ${on ? 'bg-rose-500 text-white' : 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15'}`}
        >
          {on ? 'To‘xtatish' : 'Sinash'}
        </button>
      </div>

      {on && (
        <div className="mt-3 space-y-2">
          <MicIndicator state={state} level={voice.level} speaking={voice.speaking} />
          <ul className="space-y-1 text-xs">
            <li className={heard ? 'text-emerald-300' : 'text-white/55'}>
              {heard ? '✓ Ovozingiz eshitildi — o‘qib bo‘lgach jim tursangiz, keyingi bosqichga o‘tadi' : '… Ovoz kutilmoqda — gapirib ko‘ring'}
            </li>
            {speech && (
              <li className={wordsOk ? 'text-emerald-300' : rec.status === 'service' || rec.status === 'unsupported' ? 'text-amber-200' : 'text-white/55'}>
                {wordsOk
                  ? '✓ So‘zlar tanilmoqda — sura oxiri tanilsa, darhol o‘tadi'
                  : rec.status === 'service' || rec.status === 'unsupported'
                    ? '! Bu brauzer so‘zlarni tanimaydi. So‘zlarni tanish uchun Google Chrome yoki Microsoft Edge’da oching. Bunda ham ovoz bo‘yicha ishlaydi.'
                    : rec.status === 'network'
                      ? '! Internet uzildi — so‘zlar tanilmaydi, ovoz bo‘yicha ishlaydi.'
                      : '… So‘zlar kutilmoqda'}
              </li>
            )}
          </ul>
          {wordsOk && <HeardLatin transcript={rec.transcript} ayahs={ayahs} />}
          {!heard && voice.status === 'active' && (
            <p className="text-[11px] text-white/45">Eshitilmasa: «AI sezgirligi»ni «Yuqori» qiling yoki mikrofonga yaqinroq o‘qing.</p>
          )}
        </div>
      )}
    </div>
  );
}
