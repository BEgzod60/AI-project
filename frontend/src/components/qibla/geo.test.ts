import { describe, expect, it } from 'vitest';
import { magneticDeclination } from './geo';

const WHEN = new Date('2026-10-18T00:00:00Z');

describe('magneticDeclination (WMM2025)', () => {
  it('O‘zbekistonda magnit shimol sharqqa og‘gan', () => {
    expect(magneticDeclination({ lat: 41.31, lon: 69.28 }, WHEN)).toBeCloseTo(5.69, 1); // Toshkent
    expect(magneticDeclination({ lat: 42.46, lon: 59.6 }, WHEN)).toBeCloseTo(6.99, 1); // Nukus
  });

  it('boshqa hududlarda ham to‘g‘ri hisoblanadi', () => {
    expect(magneticDeclination({ lat: 55.75, lon: 37.62 }, WHEN)).toBeCloseTo(12.14, 1); // Moskva
  });
});
