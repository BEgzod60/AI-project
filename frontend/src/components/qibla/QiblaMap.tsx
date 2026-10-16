import { useEffect, useRef, useState } from 'react';
import { KAABA, compassPoint, destinationPoint, formatDistance, greatCirclePoints, type LatLon } from './geo';
import { L, createMap, kaabaIcon, userIcon } from './leaflet';

interface Props {
  from: LatLon;
  label: string;
  bearing: number;
  distance: number;
  /** Joylashuv aniqligi (metr) — xaritada doira bilan ko'rsatiladi */
  accuracy?: number;
}

type Mode = 'near' | 'full';

/** Yaqin ko'rinish masshtabi — atrofdagi ko'chalar va binolar ko'rinadi */
const NEAR_ZOOM = 17;
/** Joyidan Qibla tomon chiziladigan aniq yo'nalish chizig'i uzunligi (metr) */
const NEAR_LINE_M = 3000;

function arrowIcon(bearing: number): L.DivIcon {
  // Strelka yuqoriga (shimolga) qaragan holda chiziladi va Qibla yo'nalishiga buriladi
  return L.divIcon({
    className: '',
    html: `<span class="block h-12 w-12" style="transform: rotate(${bearing}deg)">
      <svg viewBox="0 0 48 48" class="h-12 w-12 drop-shadow-lg"><path d="M24 3 37 33 24 26 11 33Z" fill="#e0a02e" stroke="#062818" stroke-width="2" stroke-linejoin="round"/></svg>
    </span>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

/**
 * Shimol yuqorida turgan xarita. Standart — turgan joyga yaqin: Qibla tomoni atrofdagi ko'chalar
 * ustida oltin strelka bilan ko'rsatiladi. «Butun yo'l» — Ka'bagacha eng qisqa (katta doira) yo'l.
 */
export default function QiblaMap({ from, label, bearing, distance, accuracy }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [mode, setMode] = useState<Mode>('near');

  useEffect(() => {
    if (!elRef.current) return;
    const map = createMap(elRef.current);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Yangi joy tanlansa — yana yaqin ko'rinishga qaytiladi
  useEffect(() => setMode('near'), [from.lat, from.lon]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const path = greatCirclePoints(from);
    // Butun yo'l (katta doira) — uzoqdan ko'rinadi
    L.polyline(path, { color: '#0f5132', weight: 3, dashArray: '8 8', opacity: 0.9, interactive: false }).addTo(layer);
    // Joy atrofida aniq boshlang'ich yo'nalish — yaqin ko'rinishda ko'chalar ustida
    const end = destinationPoint(from, bearing, NEAR_LINE_M);
    L.polyline([[from.lat, from.lon], [end.lat, end.lon]], { color: '#e0a02e', weight: 5, opacity: 0.95, interactive: false }).addTo(layer);
    if (mode === 'near') {
      const arrowAt = destinationPoint(from, bearing, 45);
      L.marker([arrowAt.lat, arrowAt.lon], { icon: arrowIcon(bearing), interactive: false, keyboard: false, zIndexOffset: 500 }).addTo(layer);
    }

    // Aniqlik doirasi: haqiqiy joy shu doira ichida bo'lishi mumkin
    const accuracyCircle =
      accuracy && accuracy > 15
        ? L.circle([from.lat, from.lon], {
            radius: accuracy, color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12, interactive: false,
          }).addTo(layer)
        : null;
    L.marker([from.lat, from.lon], { icon: userIcon, title: label, keyboard: false, zIndexOffset: 600 })
      .bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -10] })
      .addTo(layer);
    L.marker([KAABA.lat, KAABA.lon], { icon: kaabaIcon, title: 'Makka — Ka’ba', keyboard: false })
      .bindTooltip('Makka', { permanent: true, direction: 'right', offset: [16, 0] })
      .addTo(layer);

    if (mode === 'near') {
      // Aniqlik past bo'lsa — butun aniqlik doirasi ko'rinadigan masshtab
      if (accuracyCircle && accuracy! > 60) map.fitBounds(L.latLng(from.lat, from.lon).toBounds(accuracy! * 2.2), { maxZoom: NEAR_ZOOM });
      else map.setView([from.lat, from.lon], NEAR_ZOOM);
    } else {
      const mid = path[Math.floor(path.length / 2)];
      L.marker(mid, {
        keyboard: false,
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<span class="block whitespace-nowrap rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold leading-tight text-neutral-800 shadow">${formatDistance(distance)}<br/>${Math.round(bearing)}°</span>`,
          iconAnchor: [-6, 18],
        }),
      }).addTo(layer);
      map.fitBounds(L.latLngBounds(path), { padding: [36, 36] });
    }
  }, [from, label, bearing, distance, mode, accuracy]);

  const btn = (active: boolean) =>
    `min-h-[2.5rem] rounded-xl px-3 text-xs font-semibold shadow-md ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
      active ? 'bg-primary-700 text-white ring-primary-700' : 'bg-white/95 text-neutral-800 ring-black/10 hover:bg-white'
    }`;

  return (
    <div className="relative h-full min-h-[16rem] w-full">
      <div ref={elRef} className="h-full w-full" aria-label={`Xarita: ${label} dan Ka’ba tomon yo‘nalish`} role="region" />
      <div className="absolute right-2 top-2 z-[500] flex gap-1.5" role="group" aria-label="Xarita ko‘rinishi">
        <button type="button" aria-pressed={mode === 'near'} onClick={() => setMode('near')} className={btn(mode === 'near')}>
          Joyim
        </button>
        <button type="button" aria-pressed={mode === 'full'} onClick={() => setMode('full')} className={btn(mode === 'full')}>
          Butun yo‘l
        </button>
      </div>
      {mode === 'near' && (
        <p className="pointer-events-none absolute bottom-6 left-2 z-[500] max-w-[85%] rounded-xl bg-primary-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          Qibla: {Math.round(bearing)}° · {compassPoint(bearing)} — oltin strelka tomonga
        </p>
      )}
    </div>
  );
}
