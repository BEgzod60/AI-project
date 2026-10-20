import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLayoutRegion } from '../../hooks/useTypedOutlet';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { Loading } from '../../components/common/Loading';
import { REGION_COORDS, cityLabel } from '../../components/prayerTimes/clock';
import { getLang, useI18n } from '../../i18n';
import { QiblaCompass } from '../../components/qibla/QiblaCompass';
import { NearbyMosques } from '../../components/qibla/NearbyMosques';
import { CityPicker } from '../../components/qibla/CityPicker';
import { useCompass } from '../../components/qibla/useCompass';
import { angleDiff, compassPoint, distanceMeters, formatDistance, initialBearing, magneticDeclination, type LatLon } from '../../components/qibla/geo';
import { PageGuide, type GuideStep } from '../../components/common/PageGuide';

const QiblaMap = lazy(() => import('../../components/qibla/QiblaMap'));

/** Joylashuvni aniqlash: shu aniqlikka (metr) yetguncha yoki shu vaqtgacha yangilanib boradi */
const GEO_GOOD_ACCURACY = 30;
const GEO_MAX_WAIT = 20000;
/** Aniqlik darajalari (metr): shundan katta bo'lsa — joy noto'g'ri bo'lishi mumkin */
const GEO_FAIR_ACCURACY = 50;
const GEO_WARN_ACCURACY = 300;
/** Bundan katta xatolik — odatda IP-manzil bo'yicha (shahar darajasida) aniqlangan */
const GEO_IP_ACCURACY = 3000;

type GeoQuality = 'good' | 'fair' | 'poor' | 'ip';

function geoQuality(accuracy: number): GeoQuality {
  if (accuracy <= GEO_FAIR_ACCURACY) return 'good';
  if (accuracy <= GEO_WARN_ACCURACY) return 'fair';
  if (accuracy < GEO_IP_ACCURACY) return 'poor';
  return 'ip';
}

/** Qibla bilan to'g'ri kelish chegarasi (±gradus) */
const ALIGN_DEG = 5;
/** To'g'ri kelgandan keyin qayta tebranish uchun: avval ±12° dan chiqish va kamida 4 s o'tishi kerak */
const REALIGN_DEG = 12;
const VIBRATE_COOLDOWN = 4000;
/** Telefon shundan ko'p qiya bo'lsa (gorizontaldan, gradus) — kompas ko'rsatkichi ishonchsiz */
const TILT_MAX_DEG = 35;

interface Place extends LatLon {
  label: string;
  /** Xaritadagi qisqa nom */
  short: string;
  /** Qo'lda tanlangan hudud (GPS'da — yo'q) */
  region?: string;
  source: 'region' | 'gps' | 'map';
  accuracy?: number;
}

function regionPlace(region: string): Place {
  const key = REGION_COORDS[region] ? region : 'Toshkent';
  const c = REGION_COORDS[key];
  const city = cityLabel(key, getLang());
  return { lat: c.lat, lon: c.lon, label: city, short: city, region: key, source: 'region' };
}

const GEO_ERRORS: Record<number, [string, string]> = {
  1: ['Joylashuvga ruxsat berilmadi. Quyidan shaharni qo‘lda tanlang yoki brauzer sozlamalarida ruxsat bering.',
    'Доступ к геолокации не разрешён. Выберите город вручную ниже или разрешите доступ в настройках браузера.'],
  2: ['Joylashuvni aniqlab bo‘lmadi. Shaharni qo‘lda tanlang.', 'Не удалось определить местоположение. Выберите город вручную.'],
  3: ['Joylashuvni aniqlash vaqti tugadi. Qayta urinib ko‘ring yoki shaharni tanlang.', 'Время определения истекло. Попробуйте ещё раз или выберите город.'],
};

function Icon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  pin: 'M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11Z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  target: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-3.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  plane: 'M21 15.5 13.5 11V5.5a1.5 1.5 0 0 0-3 0V11L3 15.5v2l7.5-2.3v3.6L8 20.5V22l4-1.2 4 1.2v-1.5l-2.5-1.7v-3.6l7.5 2.3v-2Z',
  arrow: 'M4 12 20 4l-8 16-2-6-6-2Z',
  device: 'M4 5h16v10H4zM9 19h6M12 15v4',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM11 18h2',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',
  map: 'm9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
};

/** Sahifa tagidagi «Bu sahifada nima qilasiz?» qadamlari */
const GUIDE: GuideStep[] = [
  {
    title: ['Joylashuvingizni aniqlang', 'Определите местоположение'],
    text: ['«Joylashuvimni aniqlash» tugmasini bosing yoki joyingizni xaritada belgilang.', 'Нажмите «Определить моё местоположение» или отметьте своё место на карте.'],
  },
  {
    title: ['Telefonda kompasni yoqing', 'Включите компас на телефоне'],
    text: ['Telefonni tekis tutib, qibla belgisiga qarating — to‘g‘ri kelganda telefon yengil tebranadi.', 'Держите телефон ровно и поворачивайте к отметке киблы — при совпадении телефон слегка завибрирует.'],
  },
  {
    title: ['Kompyuterda xaritadan foydalaning', 'На компьютере используйте карту'],
    text: ['Xaritadagi chiziq Ka’ba tomon yo‘nalishni va taxminiy masofani ko‘rsatadi.', 'Линия на карте показывает направление на Каабу и примерное расстояние.'],
  },
  {
    title: ['Yaqin masjidni toping', 'Найдите ближайшую мечеть'],
    text: ['Qidiruv radiusini tanlang — masjidlar manzili va xaritadagi joyi bilan chiqadi.', 'Выберите радиус поиска — мечети покажутся с адресом и местом на карте.'],
  },
];

export function QiblaPage() {
  const region = useLayoutRegion();
  const { t } = useI18n();
  const [place, setPlace] = useState<Place>(() => regionPlace(region));
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  /** Xaritada aniq belgilashni so'rash (NearbyMosques'ga) — har bosishda oshadi */
  const [pickRequest, setPickRequest] = useState(0);
  const watchId = useRef<number | null>(null);
  const watchTimer = useRef<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [vibrate, setVibrate] = useState(false);
  const compass = useCompass();
  const mapRef = useRef<HTMLDivElement>(null);
  const lastBuzz = useRef(0);
  const armed = useRef(true);

  // Header'da hudud almashsa (va GPS ishlatilmagan bo'lsa) — joylashuv ham almashadi
  useEffect(() => {
    setPlace((p) => (p.source === 'region' ? regionPlace(region) : p));
  }, [region]);

  const bearing = useMemo(() => initialBearing(place), [place]);
  const distance = useMemo(() => distanceMeters(place), [place]);
  const location = useMemo(() => ({ lat: place.lat, lon: place.lon }), [place.lat, place.lon]);
  const declination = useMemo(() => magneticDeclination(place), [place]);

  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const live = compass.status === 'active' && compass.heading !== null;
  // Kompas magnit shimolni beradi — haqiqiy shimolga o'tkaziladi (Qibla burchagi haqiqiy shimoldan)
  const heading = live ? (compass.heading! + declination + 360) % 360 : null;
  const tilted = live && compass.tilt !== null && compass.tilt > TILT_MAX_DEG;
  const offset = heading !== null ? angleDiff(bearing, heading) : null;
  const aligned = offset !== null && !tilted && Math.abs(offset) <= ALIGN_DEG;
  // Kompas har safar yoqilganda «8» shaklida kalibrlash ko'rsatmasi chiqadi (yopilguncha)
  const [calibHint, setCalibHint] = useState(false);
  useEffect(() => {
    if (compass.status === 'active') setCalibHint(true);
  }, [compass.status]);

  // Qiblaga to'g'ri kelganda bir marta yengil tebranish (faqat foydalanuvchi yoqqan bo'lsa)
  useEffect(() => {
    if (offset === null) return;
    if (Math.abs(offset) > REALIGN_DEG) armed.current = true;
    if (aligned && armed.current && vibrate && canVibrate && Date.now() - lastBuzz.current > VIBRATE_COOLDOWN) {
      navigator.vibrate(80);
      lastBuzz.current = Date.now();
      armed.current = false;
    }
  }, [offset, aligned, vibrate, canVibrate]);

  // Sensor ishlamasa — xarita rejimiga o'tiladi
  const sensorProblem = compass.status === 'unsupported' || compass.status === 'denied' || compass.status === 'unreliable';
  useEffect(() => {
    if (sensorProblem) mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [sensorProblem]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (watchTimer.current !== null) window.clearTimeout(watchTimer.current);
    watchId.current = null;
    watchTimer.current = null;
  }, []);
  useEffect(() => stopWatch, [stopWatch]);

  const locate = () => {
    setGeoError(null);
    if (!window.isSecureContext) {
      setGeoError(t('Joylashuvni aniqlash faqat xavfsiz (HTTPS) ulanishda ishlaydi. Shaharni qo‘lda tanlang.', 'Геолокация работает только по защищённому (HTTPS) соединению. Выберите город вручную.'));
      setPicking(true);
      return;
    }
    if (!navigator.geolocation) {
      setGeoError(t('Brauzeringiz joylashuvni aniqlashni qo‘llab-quvvatlamaydi. Shaharni qo‘lda tanlang.', 'Ваш браузер не поддерживает геолокацию. Выберите город вручную.'));
      setPicking(true);
      return;
    }
    stopWatch();
    setLocating(true);
    let best: GeolocationPosition | null = null;

    const finish = () => {
      stopWatch();
      setLocating(false);
    };

    // Bir necha soniya kuzatiladi: birinchi (ko'pincha taxminiy) natijadan keyin aniqrog'i keladi
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (best && pos.coords.accuracy >= best.coords.accuracy) return;
        best = pos;
        setPicking(false);
        // Aniq koordinatalar faqat sahifa xotirasida turadi — hech qayerda saqlanmaydi
        setPlace({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: t('Mening joylashuvim', 'Моё местоположение'),
          short: t('Siz', 'Вы'),
          source: 'gps',
          accuracy: pos.coords.accuracy,
        });
        if (pos.coords.accuracy <= GEO_GOOD_ACCURACY) finish();
      },
      (err) => {
        if (best) return finish();
        stopWatch();
        setLocating(false);
        setGeoError(t(...(GEO_ERRORS[err.code] ?? GEO_ERRORS[2])));
        setPicking(true);
      },
      { enableHighAccuracy: true, timeout: GEO_MAX_WAIT, maximumAge: 0 },
    );
    watchTimer.current = window.setTimeout(() => {
      if (best) finish();
      else {
        stopWatch();
        setLocating(false);
        setGeoError(t(...GEO_ERRORS[3]));
        setPicking(true);
      }
    }, GEO_MAX_WAIT);
  };

  const pickOnMap = useCallback(
    (p: LatLon) => {
      stopWatch();
      setLocating(false);
      setGeoError(null);
      setPlace({ lat: p.lat, lon: p.lon, label: t('Xaritada belgilangan joy', 'Точка на карте'), short: t('Siz', 'Вы'), source: 'map' });
    },
    [stopWatch, t],
  );

  const chooseCity = (value: string) => {
    if (!REGION_COORDS[value]) return;
    stopWatch();
    setLocating(false);
    setPlace(regionPlace(value));
    setPicking(false);
    setGeoError(null);
  };

  const closePicker = useCallback(() => setPicking(false), []);

  const showMap = () => {
    compass.stop();
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Joylashuv aniqligi haqida ogohlantirish (faqat qurilma orqali aniqlanganda)
  const geoStatus = (() => {
    if (place.source !== 'gps' || place.accuracy === undefined) return null;
    const acc = formatDistance(place.accuracy);
    const q = geoQuality(place.accuracy);
    if (locating && q !== 'good')
      return { tone: 'warn', text: t(`Aniqlanmoqda: ±${acc}. Aniqlik oshirilmoqda — bir necha soniya kuting (ochiq joyda va GPS yoqilganda tezroq).`, `Определяется: ±${acc}. Точность уточняется — подождите несколько секунд (на открытом месте и с GPS быстрее).`) };
    if (q === 'good') return { tone: 'ok', text: t(`Joylashuv aniq aniqlandi (±${acc}).`, `Местоположение определено точно (±${acc}).`) };
    if (q === 'fair')
      return { tone: 'warn', text: t(`Joylashuv taxminan aniqlandi (±${acc}). Xaritadagi ko‘k nuqta haqiqiy joyingizdan biroz farq qilishi mumkin — kerak bo‘lsa, xaritada aniq belgilang.`, `Местоположение определено приблизительно (±${acc}). Синяя точка может немного отличаться от реального места — при необходимости отметьте его на карте.`) };
    if (q === 'poor')
      return { tone: 'warn', text: t(`Joylashuv aniq aniqlanmadi (±${acc}) — joy noto‘g‘ri bo‘lishi mumkin. Telefonda GPS’ni yoqing yoki joyingizni xaritada aniq belgilang.`, `Местоположение определено неточно (±${acc}) — место может быть неверным. Включите GPS на телефоне или отметьте место на карте.`) };
    return {
      tone: 'warn',
      text: t(`Joylashuv aniqlanmadi, faqat taxminiy hudud topildi (±${acc}). Kompyuterlarda joylashuv internet (IP) orqali aniqlanadi va bir necha km xato bo‘ladi. Joyingizni xaritada aniq belgilang.`, `Точное место не определено, найден лишь примерный район (±${acc}). На компьютерах местоположение определяется по IP с погрешностью в несколько км. Отметьте место на карте.`),
    };
  })();

  const device = live ? t('Telefon (jonli kompas)', 'Телефон (живой компас)') : isTouch ? t('Telefon (xarita rejimi)', 'Телефон (режим карты)') : t('Kompyuter (xarita rejimi)', 'Компьютер (режим карты)');

  const note = (() => {
    if (compass.status === 'requesting') return { tone: 'info', text: t('Kompas ishga tushirilmoqda...', 'Запуск компаса...') };
    if (compass.status === 'denied') return { tone: 'warn', text: t('Harakat sensorlariga ruxsat berilmadi. Ka’ba tomon yo‘nalish xaritada ko‘rsatilmoqda.', 'Доступ к датчикам движения не разрешён. Направление на Каабу показано на карте.') };
    if (compass.status === 'unsupported')
      return { tone: 'warn', text: t('Bu qurilmada kompas sensori mavjud emas yoki ishlamayapti. Ka’ba tomon yo‘nalish xaritada ko‘rsatilmoqda.', 'На этом устройстве нет компаса или он не работает. Направление на Каабу показано на карте.') };
    if (compass.status === 'unreliable')
      return { tone: 'warn', text: t('Kompas aniqligi past. Telefonni havoda «8» shaklida aylantirib kalibrlang va metall buyumlardan uzoqlashing. Hozircha xaritadan foydalaning.', 'Низкая точность компаса. Откалибруйте его, вращая телефон «восьмёркой», и отойдите от металлических предметов. Пока используйте карту.') };
    if (tilted)
      return { tone: 'warn', text: t(`Telefonni tekis ushlang (ekrani yuqoriga) — hozir ${compass.tilt}° qiya, kompas noto‘g‘ri ko‘rsatishi mumkin.`, `Держите телефон ровно (экраном вверх) — сейчас наклон ${compass.tilt}°, компас может показывать неверно.`) };
    if (live)
      return aligned
        ? { tone: 'ok', text: t('Telefon Qibla tomonga qaratildi.', 'Телефон направлен на киблу.') }
        : { tone: 'info', text: t(`Telefonni tekis ushlang va ${offset! > 0 ? 'o‘ngga' : 'chapga'} ${Math.abs(Math.round(offset!))}° buring.`, `Держите телефон ровно и поверните ${offset! > 0 ? 'вправо' : 'влево'} на ${Math.abs(Math.round(offset!))}°.`) };
    if (!isTouch) return { tone: 'info', text: t('Kompyuterda kompas sensori mavjud emas. Xaritada Ka’ba tomon yo‘nalish ko‘rsatilmoqda (shimol — yuqorida).', 'На компьютере нет компаса. Направление на Каабу показано на карте (север — вверху).') };
    return { tone: 'info', text: t('Jonli kompas uchun «Kompasni yoqish» tugmasini bosing. Kompas shimoldan hisoblanadi — metall buyumlar aniqlikka ta’sir qiladi.', 'Для живого компаса нажмите «Включить компас». Отсчёт ведётся от севера — металлические предметы влияют на точность.') };
  })();

  const noteClass =
    note.tone === 'warn'
      ? 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30'
      : note.tone === 'ok'
        ? 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/30'
        : 'bg-accent-100/60 text-neutral-800 ring-accent-400/30 dark:bg-accent-500/10 dark:text-neutral-100 dark:ring-accent-500/30';

  return (
    <div className="page page-stack">
      {/* ===== Hero ===== */}
      {/* Boshqa bo'limlar kabi: qorong'i zumrad fon, o'ngda Ka'ba */}
      <section className="hero motion-safe:animate-fade-in-up">
        <div aria-hidden className="absolute inset-0 bg-cover bg-[position:30%_center] md:bg-right" style={{ backgroundImage: 'url(/images/qibla/hero.webp)' }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/80 to-primary-900/10 md:via-primary-900/60" />
        <div className="relative px-4 py-5 sm:px-5 sm:py-8 md:px-10 md:py-12">
          <Breadcrumb items={[{ label: t('Bosh sahifa', 'Главная'), to: '/' }, { label: t('Qibla', 'Кибла') }]} />
          <h1 className="mt-3 font-display text-4xl font-extrabold text-accent-400 sm:mt-4 sm:text-5xl md:text-6xl">{t('Qibla', 'Кибла')}</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85 sm:text-base sm:leading-relaxed md:text-lg">
            {t('Ka’ba tomon yo‘nalishni aniqlang va yaqin masjidlarni toping', 'Определите направление на Каабу и найдите ближайшие мечети')}
          </p>
        </div>
      </section>

      {/* ===== Kompas, joylashuv va xarita ===== */}
      <section className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 sm:gap-4 sm:rounded-3xl sm:p-6 ring-black/5 motion-safe:animate-fade-in-up sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] min-[1400px]:grid-cols-[minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,1.15fr)] dark:bg-neutral-900 dark:ring-white/10">
        {/* Kompas */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="grid grid-cols-1 items-center gap-2 sm:gap-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_auto]">
            <QiblaCompass bearing={bearing} heading={heading} aligned={aligned} />
            <div className="text-center sm:text-left lg:text-center 2xl:text-left">
              <p className="font-display text-4xl font-extrabold tabular-nums text-neutral-900 sm:text-5xl dark:text-white" aria-live="polite">
                {Math.round(bearing)}°
              </p>
              <p className="mt-1 font-semibold text-neutral-800 dark:text-neutral-100">{t('Qibla yo‘nalishi', 'Направление киблы')}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('shimoldan soat mili bo‘yicha', 'от севера по часовой стрелке')} · {compassPoint(bearing)}</p>
              {live && (
                <p className={`mt-2 text-sm font-semibold ${aligned ? 'text-emerald-600 dark:text-emerald-300' : 'text-neutral-600 dark:text-neutral-300'}`}>
                  {t('Telefon', 'Телефон')}: {Math.round(heading!)}°{compass.accuracy !== null ? ` · ${t('aniqlik', 'точность')} ±${Math.round(compass.accuracy)}°` : ''}
                </p>
              )}
              {live && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {t(
                    `Magnit og‘ish hisobga olindi: ${declination >= 0 ? '+' : '−'}${Math.abs(declination).toFixed(1)}°.`,
                    `Магнитное склонение учтено: ${declination >= 0 ? '+' : '−'}${Math.abs(declination).toFixed(1)}°.`,
                  )}
                </p>
              )}
            </div>
          </div>

          {live && calibHint && (
            <div role="alert" className="flex items-center gap-3 rounded-2xl bg-accent-400 p-3 text-primary-900 shadow-md ring-2 ring-accent-500 sm:p-4">
              <svg viewBox="0 0 48 24" className="h-10 w-16 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                <path d="M24 12c-4-6-8-9-12-9a9 9 0 0 0 0 18c4 0 8-3 12-9s8-9 12-9a9 9 0 0 1 0 18c-4 0-8-3-12-9Z" />
                <circle r="3.5" fill="currentColor" stroke="none" className="motion-reduce:hidden">
                  <animateMotion dur="2.4s" repeatCount="indefinite" path="M24 12c-4-6-8-9-12-9a9 9 0 0 0 0 18c4 0 8-3 12-9s8-9 12-9a9 9 0 0 1 0 18c-4 0-8-3-12-9Z" />
                </circle>
              </svg>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-extrabold leading-tight sm:text-xl">
                  {t('Telefonni havoda «8» shaklida aylantiring', 'Вращайте телефон в воздухе «восьмёркой»')}
                </p>
                <p className="mt-0.5 text-sm font-medium leading-snug text-primary-900/80">
                  {t('Kompas kalibrlanadi va Qiblani to‘g‘ri ko‘rsatadi. 2–3 marta aylantirib, telefonni tekis ushlang.', 'Компас откалибруется и будет точно показывать киблу. Сделайте 2–3 «восьмёрки» и держите телефон ровно.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCalibHint(false)}
                className="shrink-0 rounded-xl bg-primary-900 px-3 py-2 text-sm font-bold text-accent-400 transition hover:bg-primary-800"
              >
                {t('Tayyor', 'Готово')}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            {live ? (
              <button
                type="button"
                onClick={compass.stop}
                className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-primary-700 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Icon d={ICONS.compass} /> {t('Kompasni o‘chirish', 'Выключить компас')}
              </button>
            ) : (
              <button
                type="button"
                onClick={compass.start}
                disabled={compass.status === 'requesting'}
                className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-primary-700 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Icon d={ICONS.compass} /> {isTouch ? t('Kompasni yoqish', 'Включить компас') : t('Kompas (telefon)', 'Компас (телефон)')}
              </button>
            )}
            <button
              type="button"
              onClick={showMap}
              className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-3 text-sm font-bold text-neutral-800 transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            >
              <Icon d={ICONS.map} /> {t('Xarita ko‘rinishi', 'Показать карту')}
            </button>
          </div>

          {live && canVibrate && (
            <label className="flex min-h-[2.75rem] cursor-pointer items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-4 text-sm font-medium text-neutral-700 dark:bg-white/5 dark:text-neutral-200">
              {t('Qiblaga to‘g‘ri kelganda yengil tebranish', 'Лёгкая вибрация при направлении на киблу')}
              <input type="checkbox" checked={vibrate} onChange={(e) => setVibrate(e.target.checked)} className="h-5 w-5 accent-primary-600" />
            </label>
          )}
        </div>

        {/* Joylashuv */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 p-3 sm:p-4 dark:border-neutral-800">
              <span className="text-primary-600 dark:text-emerald-300"><Icon d={ICONS.pin} className="h-6 w-6" /></span>
              <div className="min-w-[9rem] flex-1">
                <p className="font-semibold leading-snug text-neutral-900 dark:text-white">{place.label}</p>
                <p className="text-xs text-neutral-500">
                  {place.source === 'gps'
                    ? `${t('Qurilma orqali', 'По данным устройства')}${place.accuracy ? ` · ${t('aniqlik', 'точность')} ±${formatDistance(place.accuracy)}` : ''}`
                    : place.source === 'map'
                      ? t('Siz xaritada ko‘rsatgan nuqta', 'Точка, отмеченная вами на карте')
                      : t('O‘zbekiston · shahar markazi bo‘yicha', 'Узбекистан · по центру города')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPicking((v) => !v)}
                aria-expanded={picking}
                className={`inline-flex min-h-[2.5rem] shrink-0 items-center gap-1.5 rounded-full pl-1.5 pr-3 text-sm font-semibold shadow-sm ring-1 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  picking
                    ? 'bg-primary-700 text-white ring-primary-700'
                    : 'bg-white text-primary-800 ring-primary-500/30 hover:ring-primary-500/60 dark:bg-neutral-800 dark:text-emerald-200 dark:ring-white/15'
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${picking ? 'bg-white/15 text-accent-400' : 'bg-primary-900 text-accent-400'}`}>
                  <Icon d={ICONS.pin} className="h-4 w-4" />
                </span>
                {t('O‘zgartirish', 'Изменить')}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-3.5 w-3.5 transition-transform duration-300 ${picking ? 'rotate-180' : ''}`} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {picking && (
              <div className="border-b border-neutral-100 p-3 dark:border-neutral-800">
                <CityPicker value={place.source === 'region' ? place.region ?? null : null} onChange={chooseCity} onClose={closePicker} />
              </div>
            )}

            {/* Telefonda uch ko'rsatkich bitta qatorda (3 ustun), desktopda — ro'yxat */}
            <dl className="grid grid-cols-3 divide-x divide-neutral-100 lg:block lg:divide-x-0 lg:divide-y dark:divide-neutral-800">
              <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-3 lg:px-4 lg:py-3">
                <span className="hidden text-neutral-500 lg:inline"><Icon d={ICONS.plane} /></span>
                <div>
                  <dt className="text-xs text-neutral-500">{t('Masofa (taxminiy)', 'Расстояние (примерно)')}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-neutral-900 lg:text-base dark:text-white">{formatDistance(distance)}</dd>
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-3 lg:px-4 lg:py-3">
                <span className="hidden text-neutral-500 lg:inline"><Icon d={ICONS.arrow} /></span>
                <div>
                  <dt className="text-xs text-neutral-500">{t('Yo‘nalish', 'Направление')}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-neutral-900 lg:text-base dark:text-white">{Math.round(bearing)}° · {compassPoint(bearing)}</dd>
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-3 lg:px-4 lg:py-3">
                <span className="hidden text-neutral-500 lg:inline"><Icon d={isTouch ? ICONS.phone : ICONS.device} /></span>
                <div className="min-w-0">
                  <dt className="text-xs text-neutral-500">{t('Qurilma', 'Устройство')}</dt>
                  <dd className="text-sm font-semibold leading-snug text-neutral-900 lg:text-base dark:text-white">{device}</dd>
                </div>
              </div>
            </dl>
          </div>

          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-accent-400 px-4 text-sm font-bold text-primary-900 shadow-sm transition hover:bg-accent-500 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {locating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-900/30 border-t-primary-900" /> : <Icon d={ICONS.target} />}
            {locating ? (place.source === 'gps' ? t('Aniqlik oshirilmoqda...', 'Уточнение...') : t('Aniqlanmoqda...', 'Определение...')) : t('Joylashuvimni aniqlash', 'Определить моё местоположение')}
          </button>

          {geoStatus && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-2xl p-3 text-sm leading-relaxed ring-1 ${
                geoStatus.tone === 'ok'
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/30'
                  : 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30'
              }`}
            >
              <p>{geoStatus.text}</p>
              {geoStatus.tone !== 'ok' && (
                <button
                  type="button"
                  onClick={() => setPickRequest((n) => n + 1)}
                  className="mt-2 inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <Icon d={ICONS.pin} className="h-4 w-4" /> {t('Xaritada aniq belgilash', 'Отметить точно на карте')}
                </button>
              )}
            </div>
          )}

          {geoError && (
            <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30">
              {geoError}
            </p>
          )}

          <p role="status" className={`flex items-start gap-3 rounded-2xl p-3 text-sm leading-relaxed ring-1 sm:p-4 ${noteClass}`}>
            <span className="mt-0.5 shrink-0"><Icon d={isTouch ? ICONS.phone : ICONS.device} /></span>
            {note.text}
          </p>
        </div>

        {/* Xarita: shimol yuqorida, Ka'baga eng qisqa yo'l */}
        <div ref={mapRef} className="h-[18rem] overflow-hidden rounded-2xl ring-1 ring-black/5 sm:h-[24rem] lg:col-span-2 min-[1400px]:col-span-1 min-[1400px]:h-auto dark:ring-white/10">
          <Suspense fallback={<Loading label={t('Xarita yuklanmoqda...', 'Загрузка карты...')} />}>
            <QiblaMap from={location} label={place.short} bearing={bearing} distance={distance} accuracy={place.source === 'gps' ? place.accuracy : undefined} />
          </Suspense>
        </div>
      </section>

      {/* ===== Yaqin masjidlar ===== */}
      <NearbyMosques location={location} onPickLocation={pickOnMap} pickRequest={pickRequest} />

      <PageGuide steps={GUIDE} />
    </div>
  );
}
