/** Qibla hisob-kitoblari: katta doira (great-circle) formulalari */

export const KAABA = { lat: 21.4225, lon: 39.8262 } as const;

export interface LatLon {
  lat: number;
  lon: number;
}

const R = 6_371_000; // Yer radiusi, metr
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Boshlang'ich yo'nalish (initial bearing): shimoldan soat mili bo'yicha, 0..360° */
export function initialBearing(from: LatLon, to: LatLon = KAABA): number {
  const p1 = rad(from.lat);
  const p2 = rad(to.lat);
  const dl = rad(to.lon - from.lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Ikki nuqta orasidagi masofa (haversine), metr */
export function distanceMeters(a: LatLon, b: LatLon = KAABA): number {
  const dp = rad(b.lat - a.lat);
  const dl = rad(b.lon - a.lon);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Katta doira bo'ylab oraliq nuqtalar — xaritada Ka'baga eng qisqa yo'l chizig'i */
export function greatCirclePoints(a: LatLon, b: LatLon = KAABA, steps = 64): [number, number][] {
  const p1 = rad(a.lat), l1 = rad(a.lon), p2 = rad(b.lat), l2 = rad(b.lon);
  const d = distanceMeters(a, b) / R;
  if (d === 0) return [[a.lat, a.lon]];
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    out.push([deg(Math.atan2(z, Math.hypot(x, y))), deg(Math.atan2(y, x))]);
  }
  return out;
}

/** Berilgan nuqtadan yo'nalish (gradus) bo'yicha masofa (metr) uzoqlikdagi nuqta */
export function destinationPoint(from: LatLon, bearingDeg: number, meters: number): LatLon {
  const d = meters / R;
  const t = rad(bearingDeg);
  const p1 = rad(from.lat);
  const l1 = rad(from.lon);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
  const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: deg(p2), lon: ((deg(l2) + 540) % 360) - 180 };
}

/** -180..180 oralig'idagi burchak farqi */
export function angleDiff(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}

/** 3209456 -> "3 209 km"; 820 -> "820 m"; 1640 -> "1.6 km" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1)} km`;
  // Minglar bo'sh joy bilan: 3531 -> "3 531" (brauzer lokaliga bog'liq bo'lmasin)
  return `${String(Math.round(meters / 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')} km`;
}

/** Yo'nalish nomi: 243 -> "janubi-g'arb" */
export function compassPoint(bearing: number): string {
  const names = ['shimol', 'shimoli-sharq', 'sharq', 'janubi-sharq', 'janub', 'janubi-g‘arb', 'g‘arb', 'shimoli-g‘arb'];
  return names[Math.round(bearing / 45) % 8];
}
