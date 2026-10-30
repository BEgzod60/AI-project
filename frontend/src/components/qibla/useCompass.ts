import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Qurilma kompasi (telefon): magnit shimolga nisbatan yo'nalish.
 * - iOS: DeviceOrientationEvent.requestPermission() — faqat tugma bosilganda chaqiriladi;
 *   yo'nalish `webkitCompassHeading`, aniqlik `webkitCompassAccuracy`.
 * - Android/Chrome: `deviceorientationabsolute` (alpha — shimolga nisbatan).
 * Nisbiy (absolute=false) ma'lumot kompas uchun yaroqsiz — u ishonchsiz deb hisoblanadi.
 * Ikkala platforma ham magnit shimolni beradi — haqiqiy shimolga o'tkazish (magnit og'ish) chaqiruvchida.
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

/** Telefonning gorizontaldan og'ishi (gradus): 0 — stolda tekis yotibdi, 90 — tik turibdi */
function tiltFrom(beta: number | null, gamma: number | null): number | null {
  if (typeof beta !== 'number' || typeof gamma !== 'number') return null;
  const rad = Math.PI / 180;
  const c = Math.cos(beta * rad) * Math.cos(gamma * rad);
  return Math.acos(Math.max(-1, Math.min(1, c))) / rad;
}

function screenAngle(): number {
  const angle = window.screen?.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0;
  return Number(angle) || 0;
}

/** Burchaklarni adaptiv silliqlash:
 * - Katta burilishlarda (diff > 12°) kompas tez (85%) yetib oladi, qotib qolish yo'qoladi.
 * - Kichik titrashlarda (diff < 5°) yumshoq (40%) ushlab turadi.
 */
function smooth(prev: number | null, next: number): number {
  if (prev === null) return next;
  const diff = ((next - prev + 540) % 360) - 180;
  const absDiff = Math.abs(diff);
  const k = absDiff > 30 ? 0.95 : absDiff > 12 ? 0.8 : 0.45;
  return (prev + diff * k + 360) % 360;
}

export function useCompass() {
  const [status, setStatus] = useState<CompassStatus>('idle');
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [tilt, setTilt] = useState<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const headingRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    cleanup.current?.();
    cleanup.current = null;
    headingRef.current = null;
    setHeading(null);
    setAccuracy(null);
    setTilt(null);
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

    let gotAny = false;
    let gotValid = false;

    const onOrientation = (event: Event) => {
      const e = event as OrientationEventIOS;
      // Sensorsiz qurilmalar (masalan, kompyuter) bo'sh qiymatli hodisa yuborishi mumkin
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
      } else if (typeof e.alpha === 'number') {
        value = (360 - e.alpha) % 360;
      } else {
        return;
      }

      gotValid = true;
      const t = tiltFrom(e.beta, e.gamma);
      setTilt(t === null ? null : Math.round(t));
      const corrected = (value + screenAngle() + 360) % 360;
      headingRef.current = smooth(headingRef.current, corrected);
      setHeading(headingRef.current);
      setAccuracy(acc);
      setStatus('active');
    };

    // Android/Chrome va boshqa brauzerlar uchun absolute va standard hodisalarni tinglash
    window.addEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
    window.addEventListener('deviceorientation', onOrientation as EventListener, true);

    const timer = window.setTimeout(() => {
      if (!gotValid) setStatus(gotAny ? 'unreliable' : 'unsupported');
    }, FIRST_READING_TIMEOUT);

    cleanup.current = () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', onOrientation as EventListener, true);
      window.clearTimeout(timer);
    };
  }, []);

  // Komponent yopilganda sensor tinglovchilari olib tashlanadi
  useEffect(() => () => cleanup.current?.(), []);

  return { status, heading, accuracy, tilt, start, stop };
}
