import { AYAH_HEARD, type LatinAyah } from '../../utils/birga/latin';
import { useT } from '../../i18n';

interface Props {
  /** Brauzer tanigan arabcha matn (harakatsiz) */
  transcript: string;
  /** Sura oyatlari lotinchada (muslim.uz) va qaysilari eshitilgani; moslab bo'lmasa null */
  ayahs: LatinAyah[] | null;
  className?: string;
}

/** Eshitilgan nutq — lotin yozuvida (tasdiqlangan o'qilishi bo'yicha), arabchasi ochiladigan qismda */
export function HeardLatin({ transcript, ayahs, className = '' }: Props) {
  const t = useT();
  const heard = ayahs?.filter((a) => a.heard >= AYAH_HEARD) ?? [];
  return (
    <div className={`rounded-xl bg-black/30 p-3 text-sm ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">{t('Siz o‘qidingiz (lotincha)', 'Вы прочитали (латиницей)')}</p>
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
          {ayahs ? t('So‘zlar eshitildi, lekin hali bironta oyat to‘liq tanilmadi — o‘qishda davom eting.', 'Слова услышаны, но ни один аят ещё не распознан полностью — продолжайте читать.') : t('So‘zlar eshitildi.', 'Слова услышаны.')}
        </p>
      )}
      <details className="mt-2 text-xs text-white/45">
        <summary className="cursor-pointer select-none">{t('Brauzer tanigan arabcha matn', 'Арабский текст, распознанный браузером')}</summary>
        <p lang="ar" dir="rtl" className="mt-1 text-right text-sm text-white/60">{transcript}</p>
      </details>
      <p className="mt-2 text-[10px] leading-snug text-white/35">
        {t('Lotincha matn — muslim.uz’dagi tasdiqlangan o‘qilishi; tanilgan oyatlar shu bo‘yicha ko‘rsatiladi.', 'Текст латиницей — проверенная транскрипция с muslim.uz; распознанные аяты показаны по ней.')}
      </p>
    </div>
  );
}
