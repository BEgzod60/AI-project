import { useEffect, useRef } from 'react';
import type { Mosque } from '../../types/qibla';
import { formatDistance, type LatLon } from './geo';
import { L, createMap, mosqueIcon, userIcon } from './leaflet';
import { directionsUrl, mosqueTitle } from './mosqueUtils';

interface Props {
  center: LatLon;
  radius: number;
  mosques: Mosque[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Yaqin masjidlar xaritasi: qidiruv radiusi, foydalanuvchi va masjid belgilari */
export default function MosqueMap({ center, radius, mosques, activeId, onSelect }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!elRef.current) return;
    const map = createMap(elRef.current);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    // Ro'yxat/xarita almashganda o'lcham o'zgaradi — plitkalar to'g'ri chizilsin
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markers.current.clear();

    L.circle([center.lat, center.lon], {
      radius,
      color: '#1f8a4c',
      weight: 1,
      fillColor: '#3b82f6',
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(layer);
    L.marker([center.lat, center.lon], { icon: userIcon, title: 'Mening joylashuvim', keyboard: false }).addTo(layer);

    for (const m of mosques) {
      const title = mosqueTitle(m);
      const marker = L.marker([m.lat, m.lon], { icon: mosqueIcon(false), title, riseOnHover: true })
        .bindPopup(
          `<strong class="block text-sm">${escapeHtml(title)}</strong>` +
            (m.address ? `<span class="block text-xs text-neutral-600">${escapeHtml(m.address)}</span>` : '') +
            `<span class="mt-1 block text-xs font-semibold">${formatDistance(m.distance_m)}</span>` +
            `<a class="mt-1.5 inline-block font-semibold text-primary-700" href="${directionsUrl(m)}" target="_blank" rel="noopener noreferrer">Yo‘nalish olish ↗</a>`,
        )
        .on('click', () => onSelectRef.current(m.id))
        .addTo(layer);
      markers.current.set(m.id, marker);
    }

    map.fitBounds(L.latLng(center.lat, center.lon).toBounds(radius * 2), { padding: [16, 16] });
  }, [center, radius, mosques]);

  // Ro'yxatda tanlangan masjid xaritada ajratib ko'rsatiladi
  useEffect(() => {
    markers.current.forEach((marker, id) => marker.setIcon(mosqueIcon(id === activeId)));
    const active = activeId ? markers.current.get(activeId) : undefined;
    if (active && mapRef.current) {
      mapRef.current.panTo(active.getLatLng(), { animate: true });
      active.openPopup();
    }
  }, [activeId, mosques]);

  return <div ref={elRef} className="h-full min-h-[20rem] w-full" role="region" aria-label="Yaqin masjidlar xaritasi" />;
}
