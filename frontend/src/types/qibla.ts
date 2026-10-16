export interface Mosque {
  /** OSM obyekt identifikatori, masalan "node/123" */
  id: string;
  /** OSM'dagi nom (bo'lmasa — bo'sh) */
  name: string;
  /** OSM'dagi manzil (bo'lmasa — bo'sh) */
  address: string;
  lat: number;
  lon: number;
  /** OSM teglaridagi rasm (Wikimedia'ning kichik nusxasi) — bo'lmasa bo'sh */
  image: string;
  /** Joylashuvdan to'g'ri chiziqli masofa, metr */
  distance_m: number;
}

export interface NearbyMosques {
  radius: number;
  count: number;
  mosques: Mosque[];
  source: string;
  attribution: string;
}
