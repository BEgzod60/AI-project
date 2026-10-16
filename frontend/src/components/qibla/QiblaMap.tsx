import { useEffect, useRef } from 'react';
import { KAABA, formatDistance, greatCirclePoints, type LatLon } from './geo';
import { L, createMap, kaabaIcon, userIcon } from './leaflet';

interface Props {
  from: LatLon;
  label: string;
  bearing: number;
  distance: number;
}

/** Shimol yuqorida turgan xarita: joylashuvdan Ka'bagacha eng qisqa (katta doira) yo'l */
export default function QiblaMap({ from, label, bearing, distance }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const map = createMap(elRef.current);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const path = greatCirclePoints(from);
    L.polyline(path, { color: '#0f5132', weight: 3, dashArray: '8 8', opacity: 0.9 }).addTo(layer);
    L.marker([from.lat, from.lon], { icon: userIcon, title: label, keyboard: false })
      .bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -10] })
      .addTo(layer);
    L.marker([KAABA.lat, KAABA.lon], { icon: kaabaIcon, title: 'Makka — Ka’ba', keyboard: false })
      .bindTooltip('Makka', { permanent: true, direction: 'right', offset: [16, 0] })
      .addTo(layer);

    // Masofa va yo'nalish — yo'l o'rtasida
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
  }, [from, label, bearing, distance]);

  return <div ref={elRef} className="h-full min-h-[16rem] w-full" aria-label={`Xarita: ${label} dan Ka’bagacha yo‘nalish`} role="region" />;
}
