import { getLang } from '../../i18n';
interface Props {
  /** Qibla yo'nalishi, shimoldan soat mili bo'yicha */
  bearing: number | null;
  /** Telefon yo'nalishi (jonli kompas). null — shimol yuqorida (xarita rejimi) */
  heading: number | null;
  aligned?: boolean;
}

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);
const LETTERS = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
];

/**
 * Kompas: zumrad-oltin siferblat. Jonli rejimda siferblat telefon yo'nalishiga qarab buriladi,
 * strelka esa doim Ka'ba tomonni ko'rsatadi; aks holda shimol yuqorida turadi.
 */
export function QiblaCompass({ bearing, heading, aligned }: Props) {
  const dial = heading === null ? 0 : -heading;
  const needle = bearing === null ? 0 : bearing + dial;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[17rem]">
      <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl" role="img" aria-label={getLang() === 'ru' ? (bearing === null ? 'Компас' : `Направление киблы ${Math.round(bearing)}°`) : bearing === null ? 'Kompas' : `Qibla yo‘nalishi ${Math.round(bearing)} gradus`}>
        <defs>
          <linearGradient id="qc-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f7e3a3" />
            <stop offset="0.5" stopColor="#d4a531" />
            <stop offset="1" stopColor="#a87818" />
          </linearGradient>
          <radialGradient id="qc-face" cx="0.5" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#0f5132" />
            <stop offset="1" stopColor="#062818" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="98" fill="url(#qc-gold)" />
        <circle cx="100" cy="100" r="91" fill="url(#qc-face)" />
        <circle cx="100" cy="100" r="91" fill="none" stroke={aligned ? '#34d399' : 'transparent'} strokeWidth="3" className="transition-colors duration-300" />

        {/* Siferblat: jonli rejimda buriladi */}
        <g transform={`rotate(${dial} 100 100)`} style={{ transition: heading === null ? 'transform 0.6s ease' : undefined }}>
          {/* Gradus chiziqchalari */}
          {TICKS.map((a) => (
            <line
              key={a}
              x1="100"
              y1={a % 30 === 0 ? 11 : a % 10 === 0 ? 13 : 15}
              x2="100"
              y2={a % 90 === 0 ? 25 : a % 30 === 0 ? 21 : a % 10 === 0 ? 19 : 18}
              stroke="#e9c46a"
              strokeOpacity={a % 30 === 0 ? 0.95 : 0.45}
              strokeWidth={a % 30 === 0 ? 1.5 : 0.8}
              transform={`rotate(${a} 100 100)`}
            />
          ))}
          {/* Chiziqchalarning aynan o'ziga / ustiga to'g'ri keluvchi gradus raqamlari (har 30° da) */}
          {[30, 60, 120, 150, 210, 240, 300, 330].map((degVal) => (
            <text
              key={degVal}
              x="100"
              y="28"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="6.5"
              fontWeight="700"
              fill="#e9c46a"
              transform={`rotate(${degVal} 100 100)`}
              className="font-mono select-none"
            >
              {degVal}°
            </text>
          ))}
          {LETTERS.map(({ label, angle }) => (
            <text
              key={label}
              x="100"
              y="37"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="800"
              fill={label === 'N' ? '#f7e3a3' : '#e9c46a'}
              transform={`rotate(${angle} 100 100)`}
              className="font-display select-none"
            >
              {label}
            </text>
          ))}
        </g>

        {/* Qibla strelkasi */}
        {bearing !== null && (
          <g transform={`rotate(${needle} 100 100)`} style={{ transition: heading === null ? 'transform 0.8s cubic-bezier(.2,.8,.2,1)' : undefined }}>
            <path d="M100 30 L110 100 L100 92 L90 100 Z" fill="url(#qc-gold)" />
            <path d="M100 170 L108 100 L100 108 L92 100 Z" fill="#0b3d24" stroke="#e9c46a" strokeOpacity="0.5" strokeWidth="0.8" />
          </g>
        )}

        {/* Markaz: Ka'ba */}
        <circle cx="100" cy="100" r="19" fill="url(#qc-gold)" />
        <circle cx="100" cy="100" r="16.5" fill="#062818" />
        <image href="/images/qibla/kaaba.webp" x="87" y="86" width="26" height="26" preserveAspectRatio="xMidYMid meet" />
      </svg>
    </div>
  );
}
