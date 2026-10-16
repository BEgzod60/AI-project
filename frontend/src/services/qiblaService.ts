import { apiGet } from './api';
import type { NearbyMosques } from '../types/qibla';

/** Koordinatalar serverga ~110 m aniqlikkacha yaxlitlanib yuboriladi (aniq joylashuv uzatilmaydi) */
export function getNearbyMosques(lat: number, lon: number, radiusMeters: number): Promise<NearbyMosques> {
  return apiGet<NearbyMosques>('/qibla/mosques/', {
    lat: lat.toFixed(3),
    lon: lon.toFixed(3),
    radius: String(radiusMeters),
  });
}
