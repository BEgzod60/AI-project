/** magvar (WMM2025) — paketda tiplar yo'q */
declare module 'magvar' {
  /** Magnit og'ish (gradus, + sharqqa). altitude — km; when — Date yoki o'nlik yil */
  export function magvar(latitude: number, longitude: number, altitude?: number, when?: Date | number): number;
}
