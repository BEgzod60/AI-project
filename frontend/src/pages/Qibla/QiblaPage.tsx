import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLayoutRegion } from '../../hooks/useTypedOutlet';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { Loading } from '../../components/common/Loading';
import { REGION_COORDS } from '../../components/prayerTimes/clock';
import { QiblaCompass } from '../../components/qibla/QiblaCompass';
import { NearbyMosques } from '../../components/qibla/NearbyMosques';
import { CityPicker } from '../../components/qibla/CityPicker';
import { useCompass } from '../../components/qibla/useCompass';
import { angleDiff, compassPoint, distanceMeters, formatDistance, initialBearing, type LatLon } from '../../components/qibla/geo';

const QiblaMap = lazy(() => import('../../components/qibla/QiblaMap'));

/** Joylashuvni aniqlash: shu aniqlikka (metr) yetguncha yoki shu vaqtgacha yangilanib boradi */
const GEO_GOOD_ACCURACY = 30;
const GEO_MAX_WAIT = 12000;
/** Bundan katta xatolikda — ogohlantirish (kompyuterda IP/Wi-Fi orqali taxminiy aniqlanadi) */
const GEO_WARN_ACCURACY = 300;

/** Qibla bilan to'g'ri kelish chegarasi (±gradus) */
const ALIGN_DEG = 5;
/** To'g'ri kelgandan keyin qayta tebranish uchun: avval ±12° dan chiqish va kamida 4 s o'tishi kerak */
const REALIGN_DEG = 12;
const VIBRATE_COOLDOWN = 4000;

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
  const c = REGION_COORDS[region] ?? REGION_COORDS.Toshkent;
  return { lat: c.lat, lon: c.lon, label: c.city, short: c.city, region: REGION_COORDS[region] ? region : 'Toshkent', source: 'region' };
}

const GEO_ERRORS: Record<number, string> = {
  1: 'Joylashuvga ruxsat berilmadi. Quyidan shaharni qo‘lda tanlang yoki brauzer sozlamalarida ruxsat bering.',
  2: 'Joylashuvni aniqlab bo‘lmadi. Shaharni qo‘lda tanlang.',
  3: 'Joylashuvni aniqlash vaqti tugadi. Qayta urinib ko‘ring yoki shaharni tanlang.',
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

export function QiblaPage() {
  const region = useLayoutRegion();
  const [place, setPlace] = useState<Place>(() => regionPlace(region));
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoWarn, setGeoWarn] = useState<string | null>(null);
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

  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const live = compass.status === 'active' && compass.heading !== null;
  const offset = live ? angleDiff(bearing, compass.heading!) : null;
  const aligned = offset !== null && Math.abs(offset) <= ALIGN_DEG;

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
    setGeoWarn(null);
    if (!window.isSecureContext) {
      setGeoError('Joylashuvni aniqlash faqat xavfsiz (HTTPS) ulanishda ishlaydi. Shaharni qo‘lda tanlang.');
      setPicking(true);
      return;
    }
    if (!navigator.geolocation) {
      setGeoError('Brauzeringiz joylashuvni aniqlashni qo‘llab-quvvatlamaydi. Shaharni qo‘lda tanlang.');
      setPicking(true);
      return;
    }
    stopWatch();
    setLocating(true);
    let best: GeolocationPosition | null = null;

    const finish = () => {
      stopWatch();
      setLocating(false);
      if (best && best.coords.accuracy > GEO_WARN_ACCURACY) {
        setGeoWarn(
          `Joylashuv taxminiy (±${formatDistance(best.coords.accuracy)}). Kompyuterda joylashuv internet (IP yoki Wi-Fi) orqali ` +
            'aniqlanadi va xato bo‘lishi mumkin. Aniq joyingizni pastdagi «Joyimni xaritada belgilash» tugmasi bilan ko‘rsating yoki telefondan foydalaning.',
        );
      }
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
          label: 'Mening joylashuvim',
          short: 'Siz',
          source: 'gps',
          accuracy: pos.coords.accuracy,
        });
        if (pos.coords.accuracy <= GEO_GOOD_ACCURACY) finish();
      },
      (err) => {
        if (best) return finish();
        stopWatch();
        setLocating(false);
        setGeoError(GEO_ERRORS[err.code] ?? GEO_ERRORS[2]);
        setPicking(true);
      },
      { enableHighAccuracy: true, timeout: GEO_MAX_WAIT, maximumAge: 0 },
    );
    watchTimer.current = window.setTimeout(() => {
      if (best) finish();
      else {
        stopWatch();
        setLocating(false);
        setGeoError(GEO_ERRORS[3]);
        setPicking(true);
      }
    }, GEO_MAX_WAIT);
  };

  const pickOnMap = useCallback(
    (p: LatLon) => {
      stopWatch();
      setLocating(false);
      setGeoError(null);
      setGeoWarn(null);
      setPlace({ lat: p.lat, lon: p.lon, label: 'Xaritada belgilangan joy', short: 'Siz', source: 'map' });
    },
    [stopWatch],
  );

  const chooseCity = (value: string) => {
    if (!REGION_COORDS[value]) return;
    stopWatch();
    setLocating(false);
    setGeoWarn(null);
    setPlace(regionPlace(value));
    setPicking(false);
    setGeoError(null);
  };

  const closePicker = useCallback(() => setPicking(false), []);

  const showMap = () => {
    compass.stop();
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const device = live ? 'Telefon (jonli kompas)' : isTouch ? 'Telefon (xarita rejimi)' : 'Kompyuter (xarita rejimi)';

  const note = (() => {
    if (compass.status === 'requesting') return { tone: 'info', text: 'Kompas ishga tushirilmoqda...' };
    if (compass.status === 'denied') return { tone: 'warn', text: 'Harakat sensorlariga ruxsat berilmadi. Ka’ba tomon yo‘nalish xaritada ko‘rsatilmoqda.' };
    if (compass.status === 'unsupported')
      return { tone: 'warn', text: 'Bu qurilmada kompas sensori mavjud emas yoki ishlamayapti. Ka’ba tomon yo‘nalish xaritada ko‘rsatilmoqda.' };
    if (compass.status === 'unreliable')
      return { tone: 'warn', text: 'Kompas aniqligi past. Telefonni havoda «8» shaklida aylantirib kalibrlang va metall buyumlardan uzoqlashing. Hozircha xaritadan foydalaning.' };
    if (live)
      return aligned
        ? { tone: 'ok', text: 'Telefon Qibla tomonga qaratildi.' }
        : { tone: 'info', text: `Telefonni tekis ushlang va ${offset! > 0 ? 'o‘ngga' : 'chapga'} ${Math.abs(Math.round(offset!))}° buring.` };
    if (!isTouch) return { tone: 'info', text: 'Kompyuterda kompas sensori mavjud emas. Xaritada Ka’ba tomon yo‘nalish ko‘rsatilmoqda (shimol — yuqorida).' };
    return { tone: 'info', text: 'Jonli kompas uchun «Kompasni yoqish» tugmasini bosing. Kompas shimoldan hisoblanadi — metall buyumlar aniqlikka ta’sir qiladi.' };
  })();

  const noteClass =
    note.tone === 'warn'
      ? 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30'
      : note.tone === 'ok'
        ? 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/30'
        : 'bg-accent-100/60 text-neutral-800 ring-accent-400/30 dark:bg-accent-500/10 dark:text-neutral-100 dark:ring-accent-500/30';

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      {/* ===== Hero ===== */}
      {/* Boshqa bo'limlar kabi: qorong'i zumrad fon, o'ngda Ka'ba */}
      <section className="relative overflow-hidden rounded-3xl bg-primary-900 text-white motion-safe:animate-fade-in-up">
        <div aria-hidden className="absolute inset-0 bg-cover bg-[position:30%_center] md:bg-right" style={{ backgroundImage: 'url(/images/qibla/hero.webp)' }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/80 to-primary-900/10 md:via-primary-900/60" />
        <div className="relative px-5 py-8 md:px-10 md:py-12">
          <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: 'Qibla' }]} />
          <div className="mt-4 flex items-center gap-3 md:gap-4">
            <img src="/images/qibla/kaaba.webp" alt="" width={72} height={72} className="h-14 w-14 shrink-0 drop-shadow-[0_6px_14px_rgb(0_0_0/0.45)] md:h-[4.5rem] md:w-[4.5rem]" />
            <h1 className="font-display text-5xl font-extrabold text-accent-400 md:text-6xl">Qibla</h1>
          </div>
          <p className="mt-2 max-w-sm text-base leading-relaxed text-white/85 md:text-lg">
            Ka’ba tomon yo‘nalishni aniqlang va yaqin masjidlarni toping
          </p>
        </div>
      </section>

      {/* ===== Kompas, joylashuv va xarita ===== */}
      <section className="grid grid-cols-1 gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 motion-safe:animate-fade-in-up sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] min-[1400px]:grid-cols-[minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,1.15fr)] dark:bg-neutral-900 dark:ring-white/10">
        {/* Kompas */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_auto]">
            <QiblaCompass bearing={bearing} heading={live ? compass.heading : null} aligned={aligned} />
            <div className="text-center sm:text-left lg:text-center 2xl:text-left">
              <p className="font-display text-5xl font-extrabold tabular-nums text-neutral-900 dark:text-white" aria-live="polite">
                {Math.round(bearing)}°
              </p>
              <p className="mt-1 font-semibold text-neutral-800 dark:text-neutral-100">Qibla yo‘nalishi</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">shimoldan soat mili bo‘yicha · {compassPoint(bearing)}</p>
              {live && (
                <p className={`mt-2 text-sm font-semibold ${aligned ? 'text-emerald-600 dark:text-emerald-300' : 'text-neutral-600 dark:text-neutral-300'}`}>
                  Telefon: {Math.round(compass.heading!)}°{compass.accuracy !== null ? ` · aniqlik ±${Math.round(compass.accuracy)}°` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            {live ? (
              <button
                type="button"
                onClick={compass.stop}
                className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-primary-700 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Icon d={ICONS.compass} /> Kompasni o‘chirish
              </button>
            ) : (
              <button
                type="button"
                onClick={compass.start}
                disabled={compass.status === 'requesting'}
                className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-primary-700 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Icon d={ICONS.compass} /> {isTouch ? 'Kompasni yoqish' : 'Kompas (telefon)'}
              </button>
            )}
            <button
              type="button"
              onClick={showMap}
              className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-3 text-sm font-bold text-neutral-800 transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            >
              <Icon d={ICONS.map} /> Xarita ko‘rinishi
            </button>
          </div>

          {live && canVibrate && (
            <label className="flex min-h-[2.75rem] cursor-pointer items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-4 text-sm font-medium text-neutral-700 dark:bg-white/5 dark:text-neutral-200">
              Qiblaga to‘g‘ri kelganda yengil tebranish
              <input type="checkbox" checked={vibrate} onChange={(e) => setVibrate(e.target.checked)} className="h-5 w-5 accent-primary-600" />
            </label>
          )}
        </div>

        {/* Joylashuv */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 p-4 dark:border-neutral-800">
              <span className="text-primary-600 dark:text-emerald-300"><Icon d={ICONS.pin} className="h-6 w-6" /></span>
              <div className="min-w-[9rem] flex-1">
                <p className="font-semibold leading-snug text-neutral-900 dark:text-white">{place.label}</p>
                <p className="text-xs text-neutral-500">
                  {place.source === 'gps'
                    ? `Qurilma orqali${place.accuracy ? ` · aniqlik ±${formatDistance(place.accuracy)}` : ''}`
                    : place.source === 'map'
                      ? 'Siz xaritada ko‘rsatgan nuqta'
                      : 'O‘zbekiston · shahar markazi bo‘yicha'}
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
                O‘zgartirish
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

            <dl className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-neutral-500"><Icon d={ICONS.plane} /></span>
                <div>
                  <dt className="text-xs text-neutral-500">Masofa (taxminiy)</dt>
                  <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">{formatDistance(distance)}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-neutral-500"><Icon d={ICONS.arrow} /></span>
                <div>
                  <dt className="text-xs text-neutral-500">Yo‘nalish</dt>
                  <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">{Math.round(bearing)}° · {compassPoint(bearing)}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-neutral-500"><Icon d={isTouch ? ICONS.phone : ICONS.device} /></span>
                <div>
                  <dt className="text-xs text-neutral-500">Qurilma</dt>
                  <dd className="font-semibold text-neutral-900 dark:text-white">{device}</dd>
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
            {locating ? (place.source === 'gps' ? 'Aniqlik oshirilmoqda...' : 'Aniqlanmoqda...') : 'Joylashuvimni aniqlash'}
          </button>

          {geoWarn && (
            <p role="status" className="rounded-2xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30">
              {geoWarn}
            </p>
          )}

          {geoError && (
            <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30">
              {geoError}
            </p>
          )}

          <p role="status" className={`flex items-start gap-3 rounded-2xl p-4 text-sm leading-relaxed ring-1 ${noteClass}`}>
            <span className="mt-0.5 shrink-0"><Icon d={isTouch ? ICONS.phone : ICONS.device} /></span>
            {note.text}
          </p>
        </div>

        {/* Xarita: shimol yuqorida, Ka'baga eng qisqa yo'l */}
        <div ref={mapRef} className="h-[20rem] overflow-hidden rounded-2xl ring-1 ring-black/5 sm:h-[24rem] lg:col-span-2 min-[1400px]:col-span-1 min-[1400px]:h-auto dark:ring-white/10">
          <Suspense fallback={<Loading label="Xarita yuklanmoqda..." />}>
            <QiblaMap from={location} label={place.short} bearing={bearing} distance={distance} />
          </Suspense>
        </div>
      </section>

      {/* ===== Yaqin masjidlar ===== */}
      <NearbyMosques location={location} onPickLocation={pickOnMap} />
    </div>
  );
}
