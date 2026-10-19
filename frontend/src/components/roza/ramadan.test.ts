import { describe, expect, it } from 'vitest';
import { monthsBetween, ramadanRange } from './ramadan';

describe('ramadanRange', () => {
  it('keyingi Ramazonni topadi', () => {
    expect(ramadanRange('2026-10-19')).toEqual({ start: '2027-02-08', end: '2027-03-08' });
  });

  it('Ramazon ichida — joriy oyni qaytaradi', () => {
    const r = ramadanRange('2027-02-20');
    expect(r).toEqual({ start: '2027-02-08', end: '2027-03-08' });
  });
});

describe('monthsBetween', () => {
  it('yil almashinuvi bilan', () => {
    expect(monthsBetween('2026-12-20', '2027-02-01')).toEqual([
      { y: 2026, m: 12 },
      { y: 2027, m: 1 },
      { y: 2027, m: 2 },
    ]);
  });
});
