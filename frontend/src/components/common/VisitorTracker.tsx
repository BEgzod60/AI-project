import { useEffect } from 'react';

const STORAGE_KEY = 'iymon_vid';

export function VisitorTracker() {
  useEffect(() => {
    try {
      let vid = localStorage.getItem(STORAGE_KEY);
      if (!vid) {
        vid = `v_${crypto.randomUUID()}`;
        localStorage.setItem(STORAGE_KEY, vid);
      }
      fetch(`/api/dev/stats/?vid=${encodeURIComponent(vid)}`, { credentials: 'same-origin' }).catch(() => {});
    } catch {
      // Xususiy rejimda saqlash cheklangan bo'lishi mumkin.
    }
  }, []);
  return null;
}
