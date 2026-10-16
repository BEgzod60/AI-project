import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApi } from '../../hooks/useApi';
import { getNearbyMosques } from '../../services/qiblaService';
import { Loading } from '../common/Loading';
import { formatDistance, type LatLon } from './geo';
import type { Mosque, MosqueCount } from '../../types/qibla';
import { directionsUrl, mosqueTitle } from './mosqueUtils';
import { getDailyPrayerTimes } from '../../services/prayerService';
import { REGION_COORDS } from '../prayerTimes/clock';
import { distanceMeters } from './geo';

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

const nf = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');

function dateUz(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Hudud bo'yicha masjidlar soni — faqat manbasi ko'rsatilgan ma'lumot */
function CountsBar({ counts }: { counts: MosqueCount[] }) {
  if (!counts.length) return null;
  return (
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {counts.map((c) => (
        <div key={c.scope} className="flex items-start gap-3 rounded-2xl bg-primary-50/70 p-3 ring-1 ring-primary-500/15 dark:bg-primary-900/30 dark:ring-white/10">
          <span className="font-display text-2xl font-extrabold tabular-nums text-primary-800 dark:text-emerald-200">{nf(c.count)}</span>
          <div className="min-w-0 text-xs leading-snug text-neutral-600 dark:text-neutral-300">
            <p className="font-semibold text-neutral-800 dark:text-neutral-100">{c.label}dagi masjidlar</p>
            <p>
              Manba:{' '}
              <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="underline decoration-neutral-300 underline-offset-2 hover:text-primary-700">
                {c.source_title}
              </a>{' '}
              · {dateUz(c.as_of)}
            </p>
            {c.on_map !== undefined && (
              <p className="mt-0.5 text-neutral-500">
                Xaritada (OpenStreetMap) {nf(c.on_map)} ta belgilangan — unga kichik namozxonalar ham kiradi.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Masjid haqida qo'shimcha ma'lumot (bo'lganlari): imom-xatib, qurilgan yili, telefon, manbalar */
function telHref(phone: string): string {
  return `tel:${phone.split(/[,;]/)[0].replace(/[^\d+]/g, '')}`;
}

/** Bugungi namoz vaqtlari (ish vaqti ko'rsatilmagan masjidlar uchun umumiy ma'lumot) */
export interface TodayTimes {
  bomdod: string;
  xufton: string;
}

function Row({ label, children, muted }: { label: string; children: ReactNode; muted?: boolean }) {
  // Yorliq qiymat ustida — tor ekranda ham matn to'liq kenglikda (so'z o'rtasidan bo'linmaydi)
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className={`text-xs ${muted ? 'text-neutral-400' : 'font-medium text-neutral-800 dark:text-neutral-100'}`}>{children}</dd>
    </div>
  );
}

/** Masjid ma'lumotlari — har bir masjidda bir xil tartibda (yo'q ma'lumot «Ko'rsatilmagan» deb yoziladi) */
const nfr = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');

/** Reyting — faqat Google Maps'dagi tayyor reyting (Google qoidasiga ko'ra alohida blokda, «Google Maps» belgisi bilan) */
function Rating({ m, source }: { m: Mosque; source: 'google' | null }) {
  if (source === 'google' && m.google) {
    return (
      <a
        href={m.google.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[1.75rem] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-0.5 hover:border-neutral-300 dark:border-white/15 dark:bg-neutral-800"
        aria-label={`Google Maps reytingi: ${m.google.rating}, ${m.google.count} ta sharh`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#fbbc04" d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8L12 2.5Z" />
        </svg>
        <span className="text-sm font-bold text-neutral-900 dark:text-white">{m.google.rating.toFixed(1)}</span>
        <span className="text-neutral-500">({nfr(m.google.count)})</span>
        <span className="whitespace-nowrap border-l border-neutral-200 pl-1.5 text-[11px] font-medium text-neutral-600 dark:border-white/15 dark:text-neutral-300">Google Maps</span>
      </a>
    );
  }
  return (
    <span className="inline-flex min-h-[1.75rem] items-center gap-1 text-neutral-400">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="currentColor" opacity="0.5" d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8L12 2.5Z" />
      </svg>
      {source === 'google' ? 'Google Maps’da reyting topilmadi' : 'Reyting: ma’lumot yo‘q'}
    </span>
  );
}

function MosqueDetails({ m, today, ratingSource }: { m: Mosque; today: TodayTimes | null; ratingSource: 'google' | null }) {
  const [open, setOpen] = useState(false);
  const d = m.directory;
  // Telefon: katalog (masjid.uz) yoki OSM — qaysi biri bo'lsa
  const phone = d?.phone || m.phone;
  const address = d?.address ? `${d.address}${d.district ? `, ${d.district}` : ''}` : m.address;
  const [osmType, osmNum] = m.id.split('/');
  const generalHours = today ? `odatda besh vaqt namozda ochiq — bugun bomdod ${today.bomdod} dan xufton ${today.xufton} gacha` : '';

  return (
    <div className="mt-1.5 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
      <Rating m={m} source={ratingSource} />

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {phone ? (
          <a
            href={telHref(phone)}
            className="inline-flex min-h-[1.75rem] items-center gap-1 rounded-full bg-primary-50 px-2.5 font-semibold text-primary-800 ring-1 ring-primary-500/20 transition hover:bg-primary-100 dark:bg-primary-900/40 dark:text-emerald-200 dark:ring-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
            </svg>
            <span className="sr-only">Telefon: </span>
            {phone.split(/[,;]/)[0].trim()}
          </a>
        ) : (
          <span className="inline-flex min-h-[1.75rem] items-center text-neutral-400">Telefon ko‘rsatilmagan</span>
        )}
        <span className="inline-flex min-h-[1.75rem] items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 text-neutral-400" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 7v5l3 2" />
          </svg>
          {m.opening_hours ? (
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">{m.opening_hours}</span>
          ) : (
            <span className="text-neutral-400">Ish vaqti ko‘rsatilmagan</span>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-[2rem] items-center gap-1 font-semibold text-primary-700 hover:underline dark:text-emerald-300"
      >
        {open ? 'Yopish' : 'Batafsil'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="rounded-xl bg-neutral-50 p-2.5 motion-safe:animate-fade-in dark:bg-white/5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            <Row label="Imom-xatib" muted={!d?.imam}>{d?.imam || 'Ko‘rsatilmagan'}</Row>
            <Row label="Qurilgan" muted={!m.built}>{m.built || 'Ma’lumot yo‘q'}</Row>
            <Row label="Manzil" muted={!address}>{address || 'Ko‘rsatilmagan'}</Row>
            <Row label="Telefon" muted={!phone}>
              {phone ? (
                <a href={telHref(phone)} className="font-semibold text-primary-700 hover:underline dark:text-emerald-300">{phone}</a>
              ) : (
                'Ko‘rsatilmagan'
              )}
            </Row>
            <Row label="Ish vaqti" muted={!m.opening_hours}>
              {m.opening_hours || (
                <>
                  Ko‘rsatilmagan{generalHours && <span className="block text-neutral-500 dark:text-neutral-400">Umumiy ma’lumot: {generalHours}</span>}
                </>
              )}
            </Row>
          </dl>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-neutral-200 pt-2 dark:border-white/10">
            {m.wikipedia && <a href={m.wikipedia} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-700 hover:underline dark:text-emerald-300">Vikipediya ↗</a>}
            {m.website && <a href={m.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-700 hover:underline dark:text-emerald-300">Veb-sayt ↗</a>}
            <a
              href={`https://www.openstreetmap.org/${osmType}/${osmNum}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-700 hover:underline dark:text-emerald-300"
            >
              OpenStreetMap ↗
            </a>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-neutral-400">
            Manbalar: {d ? <><a href={d.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{d.source}</a> (imom-xatib, manzil, telefon — eskirgan bo‘lishi mumkin), </> : null}
            OpenStreetMap / Wikidata. Xato yoki yetishmayotgan ma’lumotni OpenStreetMap’da qo‘shish mumkin.
          </p>
        </div>
      )}
    </div>
  );
}

interface Props {
  location: LatLon;
  /** Xaritada belgilangan joy (aniq joylashuv) */
  onPickLocation: (point: LatLon) => void;
  /** Tashqaridan (masalan, aniqlik past bo'lganda) belgilash rejimini ochish — har o'zgarishda */
  pickRequest?: number;
}

export function NearbyMosques({ location, onPickLocation, pickRequest = 0 }: Props) {
  const [radiusKm, setRadiusKm] = useState<(typeof RADII)[number]>(3);
  const [view, setView] = useState<View>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  // Eng yaqin viloyat markazi bo'yicha bugungi namoz vaqtlari (ish vaqti ko'rsatilmagan masjidlar uchun)
  const nearestRegion = Object.entries(REGION_COORDS).reduce((best, [r, c]) =>
    distanceMeters(location, c) < distanceMeters(location, REGION_COORDS[best]) ? r : best, 'Toshkent');
  const times = useApi(() => getDailyPrayerTimes(nearestRegion), [nearestRegion]);
  const today: TodayTimes | null = times.data ? { bomdod: times.data.timings.bomdod, xufton: times.data.timings.xufton } : null;
  const [pending, setPending] = useState<LatLon | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!pickRequest) return;
    setPicking(true);
    setPending(null);
    setView('map');
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [pickRequest]);

  // Ro'yxat ko'rinadimi (telefonda ro'yxat yoki xarita; belgilash rejimida — faqat xarita)
  const showList = view === 'list' && !picking;

  const startPicking = () => {
    setPicking(true);
    setPending(null);
    setView('map');
  };
  const cancelPicking = () => {
    setPicking(false);
    setPending(null);
  };
  const [pickedAt, setPickedAt] = useState<LatLon | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const confirmPicking = () => {
    if (!pending) return;
    setPicking(false);
    setActiveId(null);
    setPending(null);
    setPickedAt(pending);
    setNotice('Joy tanlandi — Qibla yo‘nalishi va yaqin masjidlar shu nuqta bo‘yicha yangilandi.');
    onPickLocation(pending);
  };
  // Joy boshqa yo'l bilan o'zgarsa (GPS, shahar) — xarita yana butun qidiruv doirasini ko'rsatadi
  const keepView = !!pickedAt && Math.abs(pickedAt.lat - location.lat) < 1e-9 && Math.abs(pickedAt.lon - location.lon) < 1e-9;
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
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {m.address || m.directory?.address || 'Manzil xaritada ko‘rsatilmagan'}
                </p>
                <MosqueDetails m={m} today={today} ratingSource={data?.ratings ?? null} />
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
          pending={pending}
          keepView={keepView}
          onPick={(p) => {
            // Bosilgan/sudralgan nuqta darhol qabul qilinmaydi — «Tanlandi» bilan tasdiqlanadi
            setPicking(true);
            setPending(p);
          }}
        />
      </Suspense>
      {notice && !picking && (
        <p role="status" className="pointer-events-none absolute left-14 right-3 top-3 z-[500] rounded-xl bg-emerald-700/95 px-3 py-2 text-center text-sm font-semibold text-white shadow-lg motion-safe:animate-fade-in">
          ✓ {notice}
        </p>
      )}
      {picking && (
        <>
          <p className="pointer-events-none absolute left-14 right-3 top-3 z-[500] rounded-xl bg-primary-900/90 px-3 py-2 text-center text-sm font-semibold text-white shadow-lg">
            {pending ? 'Oltin belgini sudrab aniqlashtiring, so‘ng «Tanlandi» tugmasini bosing' : 'Turgan joyingizni xaritada bosing'}
          </p>
          <div className="absolute inset-x-3 bottom-8 z-[500] flex gap-2 sm:left-auto sm:w-80">
            <button
              type="button"
              onClick={cancelPicking}
              className="min-h-[3rem] flex-1 rounded-2xl bg-white/95 px-4 text-sm font-semibold text-neutral-700 shadow-lg ring-1 ring-black/10 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-neutral-800/95 dark:text-neutral-100 dark:ring-white/15"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={confirmPicking}
              disabled={!pending}
              className="inline-flex min-h-[3rem] flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-primary-700 px-4 text-sm font-bold text-white shadow-lg transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              Tanlandi
            </button>
          </div>
        </>
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
    <section ref={sectionRef} aria-labelledby="yaqin-masjidlar" className="scroll-mt-20 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 dark:bg-neutral-900 dark:ring-white/10">
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
            onClick={() => (picking ? cancelPicking() : startPicking())}
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

      {!error && data && <CountsBar counts={data.counts ?? []} />}

      <div className="mt-5">
        {ready && mosques.length > 0 && (
          <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400" aria-live="polite">
            {radiusKm} km radiusda {mosques.length} ta masjid topildi
          </p>
        )}
        {/* Xarita doim bitta joyda turadi (qayta yaratilmaydi — belgilangan nuqta va ko'rinish saqlanadi);
            Ro'yxat/Xarita va belgilash rejimi faqat CSS orqali almashadi */}
        <div className={`grid grid-cols-1 gap-4 ${showList ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]' : ''}`}>
          <div className={showList ? '' : 'order-2'}>{showList ? status : (loading || error) && status}</div>
          <div className={`order-1 lg:order-none ${showList ? 'hidden lg:block' : ''}`}>{map}</div>
        </div>
        <p className="mt-4 text-[11px] text-neutral-400">
          Masjidlar ma'lumoti: © OpenStreetMap hissadorlari (Overpass API). Masofa — to‘g‘ri chiziq bo‘yicha.
        </p>
      </div>
    </section>
  );
}
