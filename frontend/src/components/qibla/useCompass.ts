import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Qurilma kompasi (telefon): magnit shimolga nisbatan yo'nalish.
 * - iOS: DeviceOrientationEvent.requestPermission() — faqat tugma bosilganda chaqiriladi;
 *   yo'nalish `webkitCompassHeading`, aniqlik `webkitCompassAccuracy`.
 * - Android/Chrome: `deviceorientationabsolute` (alpha — shimolga nisbatan).
 * Nisbiy (absolute=false) ma'lumot kompas uchun yaroqsiz — u ishonchsiz deb hisoblanadi.
 */

export type CompassStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'unreliable';

interface OrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

type PermissionFn = () => Promise<'granted' | 'denied'>;

/** Aniqlik shu darajadan (±gradus) yomon bo'lsa — ishonchsiz */
const MAX_ACCURACY_DEG = 25;
/** Shuncha vaqt ichida yaroqli ma'lumot kelmasa — sensor yo'q yoki ishlamaydi */
const FIRST_READING_TIMEOUT = 3000;

function screenAngle(): number {
  const angle = window.screen?.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0;
  return Number(angle) || 0;
}

/** Burchaklarni silliqlash (aylana bo'ylab: 359° -> 1° sakrashsiz) */
function smooth(prev: number | null, next: number, k = 0.25): number {
  if (prev === null) return next;
  const diff = ((next - prev + 540) % 360) - 180;
  return (prev + diff * k + 360) % 360;
}

export function useCompass() {
  const [status, setStatus] = useState<CompassStatus>('idle');
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const headingRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    cleanup.current?.();
    cleanup.current = null;
    headingRef.current = null;
    setHeading(null);
    setAccuracy(null);
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    cleanup.current?.();
    if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');

    const requestPermission = (DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn }).requestPermission;
    if (typeof requestPermission === 'function') {
      try {
        if ((await requestPermission()) !== 'granted') {
          setStatus('denied');
          return;
        }
      } catch {
        setStatus('denied');
        return;
      }
    }

    const absoluteEvent = 'ondeviceorientationabsolute' in window;
    const eventName = absoluteEvent ? 'deviceorientationabsolute' : 'deviceorientation';
    let gotAny = false;
    let gotValid = false;

    const onOrientation = (event: Event) => {
      const e = event as OrientationEventIOS;
      // Sensorsiz qurilmalar (masalan, kompyuter) bo'sh qiymatli hodisa yuborishi mumkin — e'tiborga olinmaydi
      if (e.alpha === null && typeof e.webkitCompassHeading !== 'number') return;
      gotAny = true;
      let value: number | null = null;
      let acc: number | null = null;

      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        value = e.webkitCompassHeading;
        acc = typeof e.webkitCompassAccuracy === 'number' ? e.webkitCompassAccuracy : null;
        // iOS: manfiy aniqlik — kalibrlanmagan
        if (acc !== null && (acc < 0 || acc > MAX_ACCURACY_DEG)) {
          setAccuracy(acc);
          setStatus('unreliable');
          return;
        }
      } else if ((absoluteEvent || e.absolute) && typeof e.alpha === 'number') {
        value = 360 - e.alpha;
      } else {
        return; // nisbiy yo'nalish — kompas uchun yaroqsiz
      }

      gotValid = true;
      const corrected = (value + screenAngle() + 360) % 360;
      headingRef.current = smooth(headingRef.current, corrected);
      setHeading(headingRef.current);
      setAccuracy(acc);
      setStatus('active');
    };

    window.addEventListener(eventName, onOrientation);
    const timer = window.setTimeout(() => {
      if (!gotValid) setStatus(gotAny ? 'unreliable' : 'unsupported');
    }, FIRST_READING_TIMEOUT);

    cleanup.current = () => {
      window.removeEventListener(eventName, onOrientation);
      window.clearTimeout(timer);
    };
  }, []);

  // Komponent yopilganda sensor tinglovchilari olib tashlanadi
  useEffect(() => () => cleanup.current?.(), []);

  return { status, heading, accuracy, start, stop };
}
