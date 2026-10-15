import { useEffect, useState } from 'react';

/** Bo'lim "o'qilmoqda" deb hisoblanadigan chiziq: sticky header (~4rem) dan biroz pastda */
const READING_LINE = 120;

/**
 * Hozir ekranda o'qilayotgan bo'limning id sini qaytaradi.
 * Yuqori chegarasi o'qish chizig'idan o'tgan oxirgi bo'lim — faol; sahifa oxirida — oxirgi bo'lim.
 */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join('|');

  useEffect(() => {
    if (!ids.length) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActive(ids[ids.length - 1]);
        return;
      }
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= READING_LINE) current = id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
}
