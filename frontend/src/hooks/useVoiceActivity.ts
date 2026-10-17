import { useCallback, useEffect, useRef, useState } from 'react';
import { nextNoiseFloor, speechThreshold } from '../utils/birga/vad';

/**
 * Mikrofondagi ovoz faolligi — faqat qurilmada (Web Audio API), hech narsa yozib olinmaydi va yuborilmaydi.
 * Ovoz darajasi (RMS) xona shovqiniga moslashuvchi chegaradan oshsa «gapiryapti» deb hisoblanadi;
 * qisqa pauzalarga chidamli. Brauzerning nutqni tanish xizmatiga bog'liq emas — Brave'da ham ishlaydi.
 */
export type MicStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable' | 'insecure' | 'error';

const HANGOVER_MS = 700;

export interface VoiceActivity {
  status: MicStatus;
  /** 0..1 — indikator uchun (taxminan 10 marta/soniya yangilanadi) */
  level: number;
  speaking: boolean;
  /** Oxirgi marta ovoz eshitilgan vaqt (performance.now), hali eshitilmagan bo'lsa null */
  lastVoiceAt: React.MutableRefObject<number | null>;
  start: () => Promise<void>;
  stop: () => void;
}

export function useVoiceActivity(threshold: number): VoiceActivity {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const lastVoiceAt = useRef<number | null>(null);
  const thresholdRef = useRef(threshold);
  const cleanup = useRef<() => void>(() => {});
  // Har bir start/stop raqami: ruxsat kutilayotganda stop() bo'lsa, kech kelgan oqim darhol yopiladi
  const generation = useRef(0);

  thresholdRef.current = threshold;

  const stop = useCallback(() => {
    generation.current += 1;
    cleanup.current();
    cleanup.current = () => {};
    setSpeaking(false);
    setLevel(0);
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    const gen = ++generation.current;
    cleanup.current();
    cleanup.current = () => {};
    if (!window.isSecureContext) {
      setStatus('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return;
    }
    setStatus('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (err) {
      if (gen !== generation.current) return;
      const name = (err as DOMException)?.name;
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unavailable' : 'error');
      return;
    }

    if (gen !== generation.current) {
      stream.getTracks().forEach((t) => t.stop()); // kechikib keldi — kerak emas
      return;
    }
    const ctx = new AudioContext();
    // Ba'zi brauzerlarda kontekst «suspended» holatda yaratiladi — unda daraja doim 0 bo'lib qoladi
    const resume = () => { if (ctx.state === 'suspended') void ctx.resume().catch(() => {}); };
    resume();
    ctx.addEventListener('statechange', resume);
    document.addEventListener('pointerdown', resume);
    document.addEventListener('keydown', resume);
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    let frame = 0;
    let lastUi = 0;
    let isSpeaking = false;
    let noise = 0;

    const loop = (now: number) => {
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
      const rms = Math.sqrt(sum / buffer.length);
      const threshold = speechThreshold(noise, thresholdRef.current);
      if (rms >= threshold) lastVoiceAt.current = now;
      else noise = nextNoiseFloor(noise, rms); // gapirayotganda shovqin darajasi ko'tarilmaydi
      const nowSpeaking = lastVoiceAt.current !== null && now - lastVoiceAt.current < HANGOVER_MS;
      if (nowSpeaking !== isSpeaking) {
        isSpeaking = nowSpeaking;
        setSpeaking(nowSpeaking);
      }
      if (now - lastUi > 100) {
        lastUi = now;
        setLevel(Math.min(1, rms / (threshold * 3)));
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const onEnded = () => setStatus('error');
    stream.getAudioTracks().forEach((t) => t.addEventListener('ended', onEnded));

    cleanup.current = () => {
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((t) => {
        t.removeEventListener('ended', onEnded);
        t.stop();
      });
      source.disconnect();
      ctx.removeEventListener('statechange', resume);
      document.removeEventListener('pointerdown', resume);
      document.removeEventListener('keydown', resume);
      if (ctx.state !== 'closed') void ctx.close().catch(() => {});
    };
    setStatus('active');
  }, []);

  useEffect(() => () => cleanup.current(), []);

  return { status, level, speaking, lastVoiceAt, start, stop };
}
