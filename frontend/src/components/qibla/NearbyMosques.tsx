import { Suspense, lazy, useState, type ReactNode } from 'react';
import { useApi } from '../../hooks/useApi';
import { getNearbyMosques } from '../../services/qiblaService';
import { Loading } from '../common/Loading';
import { formatDistance, type LatLon } from './geo';
import { directionsUrl, mosqueTitle } from './mosqueUtils';

const MosqueMap = lazy(() => import('./MosqueMap'));

// Kichik radius — tezroq javob va yengilroq xarita (katta radius sahifani sekinlashtiradi)
const RADII = [1, 3] as const;
type View = 'list' | 'map';

function MosqueGlyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2 2 4 3 4 6H8c0-3 2-4 4-6ZM6 21v-8h12v8M4 21h16M10 21v-4a2 2 0 0 1 4 0v4M19.5 9v12M4.5 9v12" />
    </svg>
  );
}

function Segment<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:flex-none sm:px-4 ${
              active
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-white hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Masjid rasmi (OSM'da bo'lsa) — kichik, kesilgan holda; yuklanmasa belgi ko'rsatiladi */
function MosqueThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <MosqueGlyph className="h-8 w-8 sm:h-9 sm:w-9" />;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      width={80}
      height={80}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}

interface Props {
  location: LatLon;
  /** Xaritada belgilangan joy (aniq joylashuv) */
  onPickLocation: (point: LatLon) => void;
}

export function NearbyMosques({ location, onPickLocation }: Props) {
  const [radiusKm, setRadiusKm] = useState<(typeof RADII)[number]>(3);
  const [view, setView] = useState<View>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const { data, loading, error, retry } = useApi(
    () => getNearbyMosques(location.lat, location.lon, radiusKm * 1000),
    [location.lat, location.lon, radiusKm],
  );
  const mosques = !error && data ? data.mosques : [];
  const ready = !loading && !error && data;

  const list = (
    <ul className="space-y-3 lg:max-h-[34rem] lg:overflow-y-auto lg:pr-1" aria-label="Masjidlar ro‘yxati">
      {mosques.map((m) => {
        const active = m.id === activeId;
        return (
          <li key={m.id}>
            <article
              className={`flex gap-3 rounded-2xl bg-white p-3 ring-1 transition duration-200 sm:gap-4 dark:bg-neutral-900 ${
                active ? 'ring-2 ring-accent-400' : 'ring-black/5 hover:ring-primary-500/30 dark:ring-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveId(m.id)}
                aria-label={`${mosqueTitle(m)} — xaritada ko‘rsatish`}
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-700 to-primary-900 text-accent-400 sm:h-20 sm:w-20"
              >
                <MosqueThumb src={m.image} alt={mosqueTitle(m)} />
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="font-display text-base font-bold leading-snug text-neutral-900 dark:text-white">{mosqueTitle(m)}</h3>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{m.address || 'Manzil xaritada ko‘rsatilmagan'}</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 dark:text-emerald-300">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
                    </svg>
                    {formatDistance(m.distance_m)}
                  </span>
                  <a
                    href={directionsUrl(m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl bg-primary-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    Yo‘nalish olish
                    <span aria-hidden>↗</span>
                  </a>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );

  const map = (
    <div className={`relative h-[24rem] overflow-hidden rounded-2xl ring-1 sm:h-[30rem] lg:h-[34rem] ${picking ? 'ring-2 ring-accent-400' : 'ring-black/5 dark:ring-white/10'}`}>
      <Suspense fallback={<Loading label="Xarita yuklanmoqda..." />}>
        <MosqueMap
          center={location}
          radius={radiusKm * 1000}
          mosques={mosques}
          activeId={activeId}
          onSelect={setActiveId}
          picking={picking}
          onPick={(p) => {
            setPicking(false);
            setActiveId(null);
            onPickLocation(p);
          }}
        />
      </Suspense>
      {picking && (
        <p className="pointer-events-none absolute inset-x-3 top-3 z-[500] rounded-xl bg-primary-900/90 px-3 py-2 text-center text-sm font-semibold text-white shadow-lg">
          Turgan joyingizni xaritada bosing yoki ko‘k belgini sudrang
        </p>
      )}
    </div>
  );

  const status = (
    <>
      {loading && <Loading label="Yaqin masjidlar qidirilmoqda..." />}
      {!loading && error && (
        <div role="alert" className="rounded-2xl bg-rose-50 p-5 text-center ring-1 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30">
          <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
          <button type="button" onClick={retry} className="mt-3 min-h-[2.5rem] rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700">
            Qayta urinish
          </button>
        </div>
      )}
      {ready && mosques.length === 0 && (
        <div className="rounded-2xl bg-neutral-50 p-6 text-center dark:bg-white/5">
          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{radiusKm} km radiusda masjid topilmadi</p>
          <p className="mt-1 text-sm text-neutral-500">
            {radiusKm < 3 ? 'Kattaroq radiusni tanlab ko‘ring. ' : ''}Ma'lumotlar OpenStreetMap xaritasidan olinadi — ba'zi masjidlar unda belgilanmagan bo‘lishi mumkin.
          </p>
        </div>
      )}
      {ready && mosques.length > 0 && list}
    </>
  );

  return (
    <section aria-labelledby="yaqin-masjidlar" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 dark:bg-neutral-900 dark:ring-white/10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-primary-700 dark:bg-accent-500/15 dark:text-accent-400">
            <MosqueGlyph className="h-7 w-7" />
          </span>
          <div>
            <h2 id="yaqin-masjidlar" className="font-display text-2xl font-extrabold text-neutral-900 dark:text-white">Yaqin masjidlar</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Joylashuvingizga eng yaqin masjidlarni toping</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => {
              setPicking((v) => !v);
              setView('map');
            }}
            aria-pressed={picking}
            className={`inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold ring-1 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              picking
                ? 'bg-accent-400 text-primary-900 ring-accent-400'
                : 'bg-white text-primary-800 ring-primary-500/30 hover:ring-primary-500/60 dark:bg-neutral-800 dark:text-emerald-200 dark:ring-white/15'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11Z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            </svg>
            {picking ? 'Bekor qilish' : 'Joyimni xaritada belgilash'}
          </button>
          <Segment
            label="Ko‘rinish"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'Ro‘yxat' },
              { value: 'map', label: 'Xarita' },
            ]}
          />
          <div className="flex items-center gap-2">
            <span className="hidden whitespace-nowrap text-sm font-semibold text-neutral-600 sm:inline dark:text-neutral-300">Qidiruv radiusi</span>
            <div className="flex-1 sm:flex-none">
              <Segment
                label="Qidiruv radiusi"
                value={radiusKm}
                onChange={(v) => {
                  setRadiusKm(v);
                  setActiveId(null);
                }}
                options={RADII.map((r) => ({ value: r, label: `${r} km` }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {ready && mosques.length > 0 && (
          <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400" aria-live="polite">
            {radiusKm} km radiusda {mosques.length} ta masjid topildi
          </p>
        )}
        {/* Xarita har doim mavjud (joyni belgilash uchun ham); telefonda — Ro'yxat/Xarita almashadi */}
        {view === 'list' && !picking ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div>{status}</div>
            <div className="hidden lg:block">{map}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {map}
            {(loading || error) && status}
          </div>
        )}
        <p className="mt-4 text-[11px] text-neutral-400">
          Masjidlar ma'lumoti: © OpenStreetMap hissadorlari (Overpass API). Masofa — to‘g‘ri chiziq bo‘yicha.
        </p>
      </div>
    </section>
  );
}
