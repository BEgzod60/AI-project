import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { getBirgaSession } from '../../services/birgaService';
import type { Lesson } from '../../types/learning';
import { Loading } from '../common/Loading';
import { BirgaOqish } from './BirgaOqish';
import { BirgaTakrorlash } from './BirgaTakrorlash';
import type { BirgaMode } from './BirgaModeCards';
import type { Gender } from './shared';
import { useT } from '../../i18n';

interface Props {
  slug: string;
  mode: BirgaMode;
  lesson: Lesson;
  gender: Gender;
  zam: string;
  onExit: () => void;
}

/** Rejim ma'lumotini yuklaydi (internet bo'lmasa — saqlangan nusxa) va kerakli rejimni ochadi */
export default function BirgaModeView({ slug, mode, lesson, gender, zam, onExit }: Props) {
  // Tanlangan rakat qismi (undefined — backend farzni tanlaydi)
  const [part, setPart] = useState<number | undefined>(undefined);
  const { data: session, loading, error, retry } = useApi(() => getBirgaSession(slug, part), [slug, part]);
  const t = useT();

  // Qism almashganda oldingi ma'lumot ko'rinib turadi — rejim qayta ochilib ketmaydi
  if (loading && !session) return <Loading label={t('Rejim tayyorlanmoqda...', 'Подготовка режима...')} />;
  if (!session) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
        <p className="text-neutral-700 dark:text-neutral-200">{error ?? t('Ma’lumot yuklanmadi.', 'Данные не загрузились.')}</p>
        <div className="mt-4 flex justify-center gap-3">
          <button type="button" onClick={retry} className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{t('Qayta urinish', 'Повторить')}</button>
          <button type="button" onClick={onExit} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">{t('Darsga qaytish', 'Вернуться к уроку')}</button>
        </div>
      </div>
    );
  }
  if (!session.supported) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
        <p className="text-neutral-700 dark:text-neutral-200">{session.reason}</p>
        <button type="button" onClick={onExit} className="mt-4 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">{t('Darsga qaytish', 'Вернуться к уроку')}</button>
      </div>
    );
  }
  return mode === 'birga-oqish'
    ? <BirgaOqish session={session} initialGender={gender} initialZam={zam} onExit={onExit} onPart={setPart} partLoading={loading} partError={!!error} />
    : <BirgaTakrorlash session={session} lesson={lesson} initialZam={zam} onExit={onExit} onPart={setPart} partLoading={loading} partError={!!error} />;
}
