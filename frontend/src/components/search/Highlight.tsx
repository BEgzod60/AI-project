import { Fragment } from 'react';

const APOSTROPHES = new Set(["'", '‘', '’', 'ʻ', 'ʼ', '`', '´']);

/** Backend bilan bir xil: uzunlikni saqlab kichik harf + apostroflarni birxillashtirish */
export function normalizeSearch(text: string): string {
  let out = '';
  for (const ch of text) {
    if (APOSTROPHES.has(ch)) out += "'";
    else {
      const low = ch.toLowerCase();
      out += low.length === ch.length ? low : ch;
    }
  }
  return out;
}

/** Matndagi qidiruv so'zlarini <mark> bilan ajratadi */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const norm = normalizeSearch(text);
  const marks: [number, number][] = [];
  for (const term of terms) {
    let i = norm.indexOf(term);
    while (i !== -1) {
      marks.push([i, i + term.length]);
      i = norm.indexOf(term, i + term.length);
    }
  }
  if (!marks.length) return <>{text}</>;
  marks.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const m of marks) {
    const last = merged[merged.length - 1];
    if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
    else merged.push([...m]);
  }
  const parts = [];
  let pos = 0;
  merged.forEach(([s, e], i) => {
    if (s > pos) parts.push(<Fragment key={`t${i}`}>{text.slice(pos, s)}</Fragment>);
    parts.push(
      <mark key={`m${i}`} className="rounded bg-accent-400/30 px-0.5 text-inherit dark:bg-accent-400/25">
        {text.slice(s, e)}
      </mark>,
    );
    pos = e;
  });
  if (pos < text.length) parts.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <>{parts}</>;
}
