import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * OpenStreetMap plitkalari. Foydalanish qoidasi (tile.openstreetmap.org): atribusiya ko'rsatilishi
 * shart, og'ir/ommaviy foydalanishda o'z plitka serveri yoki tijoriy provayder kerak.
 */
export function osmTiles(): L.TileLayer {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> hissadorlari',
  });
}

export function createMap(el: HTMLElement): L.Map {
  const map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
  // Qatlamlar qo'shilishidan oldin ko'rinish bo'lishi shart (aks holda Leaflet proyeksiyani hisoblay olmaydi)
  map.setView([30, 55], 3);
  map.attributionControl.setPrefix(false);
  osmTiles().addTo(map);
  // Xaritaga bosilgandan keyin g'ildirak bilan kattalashtirish yoqiladi (sahifa aylantirishga xalaqit bermasin)
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());
  return map;
}

export const userIcon = L.divIcon({
  className: '',
  html: '<span class="block h-4 w-4 rounded-full border-[3px] border-white bg-blue-500 shadow-[0_0_0_6px_rgb(59_130_246/0.25)]"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export const kaabaIcon = L.divIcon({
  className: '',
  html: `<span class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#f7e3a3] to-[#a87818] p-[3px] shadow-lg ring-2 ring-white">
    <span class="flex h-full w-full items-center justify-center rounded-full bg-[#062818]"><img src="/images/qibla/kaaba.webp" alt="" class="h-7 w-7" /></span></span>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const MOSQUE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2 2 4 3 4 6H8c0-3 2-4 4-6ZM6 21v-8h12v8M4 21h16M10 21v-4a2 2 0 0 1 4 0v4M19.5 9v12M4.5 9v12"/></svg>';

export function mosqueIcon(active: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="flex h-9 w-9 items-center justify-center rounded-full rounded-bl-none -rotate-45 shadow-md ring-2 ring-white ${
      active ? 'bg-accent-400 text-primary-900' : 'bg-primary-700 text-white'
    }"><span class="rotate-45">${MOSQUE_SVG}</span></span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
}

export { L };
