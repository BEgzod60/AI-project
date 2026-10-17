import { AYAH_HEARD, type LatinAyah } from '../../utils/birga/latin';

interface Props {
  /** Brauzer tanigan arabcha matn (harakatsiz) */
  transcript: string;
  /** Sura oyatlari lotinchada (muslim.uz) va qaysilari eshitilgani; moslab bo'lmasa null */
  ayahs: LatinAyah[] | null;
  className?: string;
}

/** Eshitilgan nutq — lotin yozuvida (tasdiqlangan o'qilishi bo'yicha), arabchasi ochiladigan qismda */
export function HeardLatin({ transcript, ayahs, className = '' }: Props) {
  const heard = ayahs?.filter((a) => a.heard >= AYAH_HEARD) ?? [];
  return (
    <div className={`rounded-xl bg-black/30 p-3 text-sm ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Siz o‘qidingiz (lotincha)</p>
      {heard.length > 0 ? (
        <p className="mt-1 leading-relaxed text-emerald-300">
          {heard.map((a) => (
            <span key={a.number}>
              {a.label && <span className="text-emerald-300/60">{a.label}. </span>}
              {a.latin}{' '}
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-1 text-white/60">
          {ayahs ? 'So‘zlar eshitildi, lekin hali bironta oyat to‘liq tanilmadi — o‘qishda davom eting.' : 'So‘zlar eshitildi.'}
        </p>
      )}
      <details className="mt-2 text-xs text-white/45">
        <summary className="cursor-pointer select-none">Brauzer tanigan arabcha matn</summary>
        <p lang="ar" dir="rtl" className="mt-1 text-right text-sm text-white/60">{transcript}</p>
      </details>
      <p className="mt-2 text-[10px] leading-snug text-white/35">
        Lotincha matn — muslim.uz’dagi tasdiqlangan o‘qilishi; tanilgan oyatlar shu bo‘yicha ko‘rsatiladi.
      </p>
    </div>
  );
}
