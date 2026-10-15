import { useEffect, useState } from 'react';
import { PRAYER_LABELS } from '../utils/constants';
import { timeToSeconds } from '../utils/formatTime';
import type { PrayerTimings } from '../types/prayer';

interface NextPrayer {
  /** bomdod | quyosh | peshin | asr | shom | xufton */
  key: keyof PrayerTimings;
  /** Qolgan vaqt (sekund) */
  remaining: number;
}

function secondsNow(): number {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function findNext(timings: PrayerTimings): NextPrayer {
  const now = secondsNow();
  for (const { key } of PRAYER_LABELS) {
    const k = key as keyof PrayerTimings;
    const target = timeToSeconds(timings[k]);
    if (target > now) return { key: k, remaining: target - now };
  }
  // Xuftondan keyin — ertangi bomdodgacha (bugungi bomdod vaqti bilan taxminan)
  return { key: 'bomdod', remaining: timeToSeconds(timings.bomdod) + 86400 - now };
}

/** Keyingi namozni va unga qolgan vaqtni har soniyada yangilab turadi */
export function useNextPrayer(timings: PrayerTimings): NextPrayer {
  const [next, setNext] = useState(() => findNext(timings));

  useEffect(() => {
    setNext(findNext(timings));
    const id = window.setInterval(() => setNext(findNext(timings)), 1000);
    return () => window.clearInterval(id);
  }, [timings]);

  return next;
}
