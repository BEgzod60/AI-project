import type { SessionStats } from './BirgaLive';
import { fmtTime } from './shared';
import { useT } from '../../i18n';

export function BirgaFinish({ name, partLabel, stats, onAgain, onExit }: { name: string; partLabel?: string; stats: SessionStats; onAgain: () => void; onExit: () => void }) {
  const detected = stats.byReason.speech + stats.byReason.voice;
  const automatic = detected + stats.byReason.timer;
  const t = useT();
  return (
    <div className="mx-auto max-w-lg p-5 text-center sm:p-8" role="status">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-900/50">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-8 w-8" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
      </span>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-accent-400">{t('Ko‘rsatmalar tugadi', 'Подсказки завершены')}</h2>
      <p className="mt-1 text-xl font-bold">{t('Alloh qabul qilsin!', 'Да примет Аллах!')}</p>
      <p className="mt-2 text-sm text-white/65">{t(`${name} namozining ${partLabel ?? `${stats.rakats} rakatlik`} ketma-ketligi ko‘rsatib bo‘lindi.`, `Последовательность намаза ${name} (${partLabel ?? `${stats.rakats} ракаата`}) показана полностью.`)}</p>

      <dl className="mt-6 grid grid-cols-2 gap-2 text-left">
        {[
          [t('Rakatlar', 'Ракааты'), `${stats.rakats}`],
          [t('Davomiylik', 'Длительность'), fmtTime(stats.seconds)],
          [t('Sura va duolar', 'Суры и дуа'), t(`${stats.recitations} ta`, String(stats.recitations))],
          [t('Ovoz bilan aniqlangan', 'Распознано по голосу'), automatic ? `${detected} / ${automatic}` : '—'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-black/30 p-3 ring-1 ring-white/10">
            <dt className="text-[11px] text-white/55">{k}</dt>
            <dd className="font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-white/45">
        {t('Nutq bo‘yicha', 'По речи')}: {stats.byReason.speech} · {t('ovoz faolligi bo‘yicha', 'по голосу')}: {stats.byReason.voice} · {t('taymer', 'таймер')}: {stats.byReason.timer}
        {stats.byReason.manual ? ` · ${t('qo‘lda', 'вручную')}: ${stats.byReason.manual}` : ''}. {t('Bu raqamlar namoz to‘g‘ri o‘qilganini tasdiqlamaydi.', 'Эти цифры не подтверждают правильность намаза.')}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" onClick={onAgain} className="min-h-[2.75rem] rounded-xl bg-white/5 font-semibold ring-1 ring-white/15 transition hover:bg-white/10">{t('Yana o‘qish', 'Ещё раз')}</button>
        <button type="button" onClick={onExit} className="min-h-[2.75rem] rounded-xl bg-emerald-500 font-semibold text-white transition hover:bg-emerald-400">{t('Darsga qaytish', 'Вернуться к уроку')}</button>
      </div>
    </div>
  );
}
