import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Brauzerning Web Speech API (SpeechRecognition) orqali arabcha nutqni matnga aylantirish.
 * Diqqat: Chrome/Edge'da ovoz tanish uchun brauzer ishlab chiqaruvchisining serveriga yuboriladi —
 * sayt o'zi hech narsa saqlamaydi. Sozlamalarda o'chirib qo'yish mumkin.
 */
export type SpeechStatus = 'off' | 'starting' | 'listening' | 'unsupported' | 'service' | 'denied' | 'network' | 'error';

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly 0: { transcript: string; confidence: number };
}
interface RecognitionEvent {
  readonly resultIndex: number;
  readonly results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupported = () => typeof window !== 'undefined' && getCtor() !== null;

/** Brave'da SpeechRecognition bor, lekin Google xizmatiga ulanmaydi — har doim «network» xatosi beradi */
export const isBrave = () => typeof navigator !== 'undefined' && 'brave' in navigator;

const MAX_NETWORK_RETRIES = 3;

export function useSpeechRecognition(enabled: boolean, lang = 'ar-SA') {
  const [status, setStatus] = useState<SpeechStatus>(() => (speechSupported() ? 'off' : 'unsupported'));
  const [transcript, setTranscript] = useState('');
  const finalText = useRef('');
  const recRef = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const networkErrors = useRef(0);
  // Shu seansda biror marta natija keldimi (kelmagan bo'lsa «network» — xizmat yo'qligi belgisi)
  const gotResult = useRef(false);

  const reset = useCallback(() => {
    finalText.current = '';
    setTranscript('');
  }, []);

  useEffect(() => {
    const Ctor = getCtor();
    if (!enabled || !Ctor) {
      if (!Ctor) setStatus('unsupported');
      return;
    }
    if (isBrave()) {
      setStatus('service');
      return;
    }
    wanted.current = true;
    networkErrors.current = 0;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    rec.onstart = () => setStatus('listening');
    rec.onresult = (e) => {
      networkErrors.current = 0;
      gotResult.current = true;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText.current += ` ${r[0].transcript}`;
        else interim += ` ${r[0].transcript}`;
      }
      setTranscript(`${finalText.current} ${interim}`.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // jimlik — onend'da qayta boshlanadi
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wanted.current = false;
        setStatus('denied');
      } else if (e.error === 'network') {
        networkErrors.current += 1;
        if (networkErrors.current >= MAX_NETWORK_RETRIES) {
          wanted.current = false;
          // Hech qachon natija kelmagan bo'lsa — brauzerda nutq xizmati yo'q (Chromium, Brave va h.k.)
          setStatus(gotResult.current ? 'network' : 'service');
        }
      } else if (e.error === 'language-not-supported') {
        wanted.current = false;
        setStatus('unsupported');
      } else {
        setStatus('error');
      }
    };
    // Chrome bir muddat jimlikdan keyin to'xtaydi — rejim yoqiq bo'lsa qayta ishga tushiriladi
    rec.onend = () => {
      if (!wanted.current) return;
      const delay = networkErrors.current ? 1000 * networkErrors.current : 150;
      window.setTimeout(() => {
        if (!wanted.current) return;
        try {
          rec.start();
        } catch {
          /* allaqachon ishlayapti */
        }
      }, delay);
    };

    setStatus('starting');
    try {
      rec.start();
    } catch {
      setStatus('error');
    }

    return () => {
      wanted.current = false;
      rec.onend = null;
      rec.onresult = null;
      rec.onerror = null;
      try {
        rec.abort();
      } catch {
        /* e'tiborsiz */
      }
      recRef.current = null;
      setStatus((s) => (s === 'unsupported' ? s : 'off'));
    };
  }, [enabled, lang]);

  return { status, transcript, reset };
}
