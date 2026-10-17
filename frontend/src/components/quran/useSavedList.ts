import { useCallback, useMemo, useState } from 'react';

export function useSavedList(key: string) {
  const [items, setItems] = useState<number[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(saved) ? saved.filter((item): item is number => typeof item === 'number') : [];
    } catch {
      return [];
    }
  });

  const values = useMemo(() => new Set(items), [items]);
  const has = useCallback((number: number) => values.has(number), [values]);
  const toggle = useCallback((number: number) => {
    setItems((current) => {
      const next = current.includes(number) ? current.filter((item) => item !== number) : [...current, number];
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return { items, has, toggle };
}
