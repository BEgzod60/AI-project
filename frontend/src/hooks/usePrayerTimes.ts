import { getDailyPrayerTimes } from '../services/prayerService';
import { useApi } from './useApi';

/** Namoz vaqtlarini olib keladi; shahar o'zgarganda qayta yuklaydi */
export function usePrayerTimes(city: string) {
  return useApi(() => getDailyPrayerTimes(city), [city]);
}
