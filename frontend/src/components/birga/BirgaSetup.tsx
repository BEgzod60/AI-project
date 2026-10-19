import { useState } from 'react';
import type { BirgaSession, BirgaSettings, Sensitivity, Speed } from '../../types/birga';
import { isBrave, speechRestartBeeps, speechSupported } from '../../hooks/useSpeechRecognition';
import { MicCheck } from './MicCheck';
import { Segmented, Toggle, stageLabel, zamRakats, type Gender, type ZamChoice } from './shared';
import { ZamSuraSelect } from './ZamSuraSelect';
import { PartPicker } from './PartPicker';
import { SourcesList } from './Sources';
import { prayerTitle } from '../../utils/prayerNames';
import { useI18n } from '../../i18n';

interface Props {
  session: BirgaSession;
  settings: BirgaSettings;
  update: <K extends keyof BirgaSettings>(key: K, value: BirgaSettings[K]) => void;
  zam: ZamChoice;
  onZam: (rakat: number, slug: string) => void;
  gender: Gender;
  onGender: (g: Gender) => void;
  offline: boolean;
  onPart: (index: number) => void;
  partLoading: boolean;
  partError: boolean;
  onStart: () => void;
  onExit: () => void;
}

const SPEEDS: { id: Speed; label: [string, string] }[] = [
  { id: 'sekin', label: ['Sekin', 'Медленно'] },
  { id: 'ortacha', label: ['O‘rtacha', 'Средне'] },
  { id: 'tez', label: ['Tez', 'Быстро'] },
];
const SENS: { id: Sensitivity; label: [string, string] }[] = [
  { id: 'past', label: ['Past', 'Низкая'] },
  { id: 'ortacha', label: ['O‘rtacha', 'Средняя'] },
  { id: 'yuqori', label: ['Yuqori', 'Высокая'] },
];

export function BirgaSetup({ session, settings, update, zam, onZam, gender, onGender, offline, onPart, partLoading, partError, onStart, onExit }: Props) {
  const [agreed, setAgreed] = useState(false);
  const { t, lang } = useI18n();
  const title = prayerTitle(session.category.slug, session.category.name, lang);
  const { min, max } = session.settings.fallback_seconds;
  const wakeLockSupported = 'wakeLock' in navigator;
  // Brave'da SpeechRecognition bor, lekin ishlamaydi
  const canSpeech = speechSupported() && !isBrave();
  const zamOptions = session.zam_suras.map((s) => session.recitations[s]).filter(Boolean);
  const secure = window.isSecureContext;

  return (
    <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Chap: ketma-ketlik va ogohlantirish */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} aria-label={t('Orqaga', 'Назад')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 transition hover:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div>
            <h2 className="font-display text-lg font-bold min-[400px]:text-xl sm:text-2xl"><span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300 sm:hidden">{t('Birga o‘qish', 'Читать вместе')}</span><span className="hidden sm:inline">{t('Birga o‘qish', 'Читать вместе')} — </span>{title}</h2>
            <p className="text-sm text-white/60">{t(`${session.rakats} rakat · ${session.stages.length} bosqich · boshlangandan keyin tugma bosish shart emas`, `Ракаатов: ${session.rakats} · этапов: ${session.stages.length} · после начала нажимать ничего не нужно`)}</p>
          </div>
        </div>

        <PartPicker parts={session.parts} value={session.part} onChange={onPart} loading={partLoading} />
        {partError && (
          <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-400/30">{t('Tanlangan qism yuklanmadi — internetni tekshirib, qayta tanlang.', 'Выбранная часть не загрузилась — проверьте интернет и выберите снова.')}</p>
        )}

        {offline && (
          <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-300/30">{t('Internet yo‘q — oxirgi saqlangan matnlar ko‘rsatilmoqda.', 'Нет интернета — показаны последние сохранённые тексты.')}</p>
        )}

        <div role="note" className="rounded-2xl bg-amber-400/[0.08] p-4 ring-1 ring-amber-300/30">
          <p className="flex items-center gap-2 font-bold text-amber-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
            {t('Boshlashdan oldin o‘qing', 'Прочитайте перед началом')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{session.safety_notice}</p>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-white">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" />
            {t('Ogohlantirishni o‘qidim va tushundim', 'Я прочитал(а) и понял(а) предупреждение')}
          </label>
        </div>

        <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
          <h3 className="text-sm font-bold text-white/80">{t('Ketma-ketlik', 'Последовательность')}</h3>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {session.stages.map((s, i) => (
              <li key={s.index} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/75 ring-1 ring-white/10">
                {(i === 0 || session.stages[i - 1].rakat !== s.rakat) && <span className="mr-1 font-bold text-accent-400">{t(`${s.rakat}-r.`, `${s.rakat}-й р.`)}</span>}
                {stageLabel(s, session, zam)}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-white/45">{t('Ketma-ketlik muslim.uz’dagi tasdiqlangan dars qadamlaridan tuzilgan; AI matn yaratmaydi.', 'Последовательность составлена по проверенным шагам урока с muslim.uz; ИИ текст не создаёт.')}</p>
        </div>

        <SourcesList sources={session.sources} />
      </div>

      {/* O'ng: sozlamalar */}
      <section aria-labelledby="birga-sozlama" className="space-y-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
        <h3 id="birga-sozlama" className="flex items-center gap-2 font-bold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-emerald-300" aria-hidden><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
          {t('Namoz rejimi sozlamalari', 'Настройки режима намаза')}
        </h3>

        {zamOptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-white/60">{t('Har rakatda o‘qiladigan zam sura', 'Дополнительная сура в каждом ракаате')}</p>
            {zamRakats(session).map((rakat) => {
              const value = zam[rakat] ?? zamOptions[0].slug;
              const repeated = zamRakats(session).find((r) => r !== rakat && zam[r] === value);
              return (
                <ZamSuraSelect
                  key={rakat}
                  label={t(`${rakat}-rakat zam surasi`, `Сура для ${rakat}-го ракаата`)}
                  options={zamOptions}
                  value={value}
                  onChange={(slug) => onZam(rakat, slug)}
                  warning={repeated ? t(`Bu sura ${repeated}-rakatda ham tanlangan`, `Эта сура уже выбрана в ${repeated}-м ракаате`) : undefined}
                />
              );
            })}
          </div>
        )}

        <div>
          <span className="mb-1 block text-xs text-white/60">{t('Rasmlar', 'Иллюстрации')}</span>
          <Segmented label={t('Rasmlar', 'Иллюстрации')} value={gender} onChange={onGender} options={[{ id: 'erkak', label: t('Erkaklar', 'Мужчины') }, { id: 'ayol', label: t('Ayollar', 'Женщины') }]} />
        </div>
        <div>
          <span className="mb-1 block text-xs text-white/60">{t('Qiroat tezligi', 'Скорость чтения')}</span>
          <Segmented label={t('Qiroat tezligi', 'Скорость чтения')} value={settings.speed} onChange={(v) => update('speed', v)} options={SPEEDS.map((o) => ({ id: o.id, label: t(...o.label) }))} />
        </div>
        <div>
          <span className="mb-1 block text-xs text-white/60">{t('AI sezgirligi (mikrofon)', 'Чувствительность ИИ (микрофон)')}</span>
          <Segmented label={t('AI sezgirligi', 'Чувствительность ИИ')} value={settings.sensitivity} onChange={(v) => update('sensitivity', v)} options={SENS.map((o) => ({ id: o.id, label: t(...o.label) }))} />
        </div>

        <MicCheck threshold={session.settings.sensitivity[settings.sensitivity].rms} speech={settings.speech && canSpeech} reference={session.recitations.fotiha} />

        <div className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-3 py-2 ring-1 ring-white/10">
          <span className="min-w-0">
            <span className="block text-sm">{t('Zaxira taymer', 'Резервный таймер')}</span>
            <span className="block text-[11px] text-white/50">{t('AI o‘qishingizni tanimasa, jim bo‘lganingizdan keyin shuncha kutiladi', 'Если ИИ не распознает чтение, столько ждём после того, как вы замолчите')}</span>
          </span>
          <span className="flex items-center gap-1">
            <button type="button" aria-label={t('Kamaytirish', 'Уменьшить')} disabled={settings.fallback <= min} onClick={() => update('fallback', settings.fallback - 1)} className="h-9 w-9 rounded-lg bg-white/5 text-lg ring-1 ring-white/15 disabled:opacity-30">−</button>
            <span className="w-16 text-center text-sm font-semibold tabular-nums">{settings.fallback} {t('soniya', 'с')}</span>
            <button type="button" aria-label={t('Oshirish', 'Увеличить')} disabled={settings.fallback >= max} onClick={() => update('fallback', settings.fallback + 1)} className="h-9 w-9 rounded-lg bg-white/5 text-lg ring-1 ring-white/15 disabled:opacity-30">+</button>
          </span>
        </div>

        <Toggle label={t('Katta matn (masofadan o‘qish)', 'Крупный текст (читать издалека)')} checked={settings.large_text} onChange={(v) => update('large_text', v)} />
        <Toggle label={t('Ekran doim yoniq', 'Экран не гаснет')} hint={wakeLockSupported ? undefined : t('Bu brauzer qo‘llamaydi', 'Браузер не поддерживает')} checked={settings.wake_lock && wakeLockSupported} disabled={!wakeLockSupported} onChange={(v) => update('wake_lock', v)} />
        <Toggle label={t('Tungi rejim', 'Ночной режим')} hint={t('Ekran yorqinligi pasayadi', 'Яркость экрана снижается')} checked={settings.night} onChange={(v) => update('night', v)} />
        <Toggle
          label={t('Nutqni aniqlash (AI)', 'Распознавание речи (ИИ)')}
          hint={canSpeech && speechRestartBeeps()
            ? t('Brauzer xizmati: ovoz tanish uchun brauzer serveriga yuboriladi. Android’da brauzer mikrofon ulanganda qisqa ovoz chiqaradi — kamroq bo‘lishi uchun faqat sura va duolarda, gapira boshlaganingizda ulanadi.', 'Служба браузера: голос отправляется на сервер браузера. На Android браузер издаёт короткий звук при подключении микрофона — чтобы реже, подключается только в сурах и дуа, когда вы начинаете говорить.')
            : canSpeech
            ? t('Brauzer xizmati: Chrome/Edge’da ovoz tanish uchun brauzer serveriga yuboriladi. O‘chirilsa — faqat qurilmadagi ovoz faolligi.', 'Служба браузера: в Chrome/Edge голос отправляется на сервер браузера для распознавания. Если выключить — только отслеживание голоса на устройстве.')
            : isBrave()
              ? t('Brave so‘zlarni tanimaydi — Google Chrome yoki Microsoft Edge’da oching. Hozir ovoz faolligi va taymer ishlaydi.', 'Brave не распознаёт слова — откройте в Google Chrome или Microsoft Edge. Сейчас работают отслеживание голоса и таймер.')
              : t('Bu brauzer qo‘llamaydi — faqat ovoz faolligi va taymer ishlaydi.', 'Браузер не поддерживает — работают только отслеживание голоса и таймер.')}
          checked={settings.speech && canSpeech}
          disabled={!canSpeech}
          onChange={(v) => update('speech', v)}
        />
        <Toggle label={t('Ovoz yozuvlari saqlanmaydi', 'Записи голоса не сохраняются')} hint={t('Ilova ovozni yozib olmaydi va o‘z serveriga yubormaydi — har doim yoqiq', 'Приложение не записывает голос и не отправляет его на свой сервер — всегда включено')} checked disabled onChange={() => {}} />
        <Toggle label={t('Offline matn va rasmlar', 'Офлайн тексты и картинки')} hint={t('Keyingi safar internetsiz ham ochiladi', 'В следующий раз откроется и без интернета')} checked={settings.offline} onChange={(v) => update('offline', v)} />

        {!secure && <p className="text-[11px] text-amber-200">{t('Mikrofon faqat HTTPS (yoki localhost) orqali ishlaydi — hozir faqat taymer bo‘ladi.', 'Микрофон работает только через HTTPS (или localhost) — сейчас будет только таймер.')}</p>}

        <button
          type="button"
          onClick={onStart}
          disabled={!agreed || partLoading}
          className="min-h-[3rem] w-full rounded-xl bg-emerald-500 text-base font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
        >
          {t('Boshlash', 'Начать')}
        </button>
        {!agreed && <p className="text-center text-[11px] text-white/50">{t('Boshlash uchun ogohlantirishni tasdiqlang', 'Чтобы начать, подтвердите предупреждение')}</p>}
      </section>
    </div>
  );
}
