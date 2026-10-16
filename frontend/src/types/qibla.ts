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
  /** Qurilgan yili (Wikidata P571 yoki OSM start_date) — bo'lmasa bo'sh */
  built: string;
  wikipedia: string;
  website: string;
  /** OSM'dagi telefon (bo'lmasa — bo'sh) */
  phone: string;
  /** Ish vaqti (OSM opening_hours, o'zbekchaga o'girilgan) — bo'lmasa bo'sh */
  opening_hours: string;
  /** Masjidlar katalogi (masjid.uz) ma'lumoti — moslashtirilgan bo'lsa */
  directory: MosqueDirectory | null;
  /** Joylashuvdan to'g'ri chiziqli masofa, metr */
  distance_m: number;
}

export interface MosqueDirectory {
  imam: string;
  address: string;
  phone: string;
  district: string;
  source_url: string;
  source: string;
}

export interface MosqueCount {
  scope: string;
  label: string;
  count: number;
  source_title: string;
  source_url: string;
  as_of: string;
  /** Xaritada (OSM) belgilangan masjidlar soni — faqat hududlar uchun */
  on_map?: number;
}

export interface NearbyMosques {
  radius: number;
  count: number;
  mosques: Mosque[];
  counts: MosqueCount[];
  source: string;
  attribution: string;
}
