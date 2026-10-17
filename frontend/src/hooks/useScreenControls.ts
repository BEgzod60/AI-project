import { useCallback, useEffect, useState, type RefObject } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: 'release', cb: () => void) => void;
}

/** Ekranni yoniq saqlash (Screen Wake Lock API). Sahifa yashirilganda brauzer qulfni bo'shatadi — qaytganda qayta so'raladi. */
export function useWakeLock(enabled: boolean) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || !supported) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const wl = (navigator as unknown as { wakeLock: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
        sentinel = await wl.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        setActive(true);
        sentinel.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release();
      setActive(false);
    };
  }, [enabled, supported]);

  return { supported, active };
}

/** Elementni to'liq ekranga chiqarish */
export function useFullscreen(ref: RefObject<HTMLElement>) {
  const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === ref.current && !!ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await ref.current?.requestFullscreen();
    } catch {
      /* brauzer rad etdi */
    }
  }, [ref]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);

  return { supported, isFullscreen, toggle, exit };
}
