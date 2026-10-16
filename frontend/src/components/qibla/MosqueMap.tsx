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
  /** Joyni belgilash rejimi: xaritani bosish yoki belgini sudrash */
  picking: boolean;
  onPick: (point: LatLon) => void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Yaqin masjidlar xaritasi: qidiruv radiusi, foydalanuvchi va masjid belgilari */
export default function MosqueMap({ center, radius, mosques, activeId, onSelect, picking, onPick }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const pickingRef = useRef(picking);
  pickingRef.current = picking;

  useEffect(() => {
    if (!elRef.current) return;
    const map = createMap(elRef.current);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pickingRef.current) onPickRef.current({ lat: e.latlng.lat, lon: e.latlng.lng });
    });
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
    // Ko'k belgi — sudrab aniq joyni ko'rsatish mumkin
    L.marker([center.lat, center.lon], { icon: userIcon, title: 'Mening joylashuvim (sudrash mumkin)', keyboard: false, draggable: true })
      .on('dragend', (e) => {
        const p = (e.target as L.Marker).getLatLng();
        onPickRef.current({ lat: p.lat, lon: p.lng });
      })
      .addTo(layer);

    for (const m of mosques) {
      const title = mosqueTitle(m);
      const marker = L.marker([m.lat, m.lon], { icon: mosqueIcon(false), title, riseOnHover: true })
        .bindPopup(
          (m.image
            ? `<img src="${escapeHtml(m.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" class="mb-1.5 h-24 w-48 rounded-lg object-cover" onerror="this.remove()" />`
            : '') +
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

  // Belgilash rejimida kursor — nishon
  useEffect(() => {
    elRef.current?.classList.toggle('cursor-crosshair', picking);
  }, [picking]);

  return <div ref={elRef} className="h-full min-h-[20rem] w-full" role="region" aria-label="Yaqin masjidlar xaritasi" />;
}
