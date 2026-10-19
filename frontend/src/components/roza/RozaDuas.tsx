import { TopicIconSvg } from '../namoz/NamozIcons';
import { useI18n } from '../../i18n';

/** [o'zbekcha, ruscha] */
type Pair = [string, string];

interface Dua {
  title: Pair;
  when: Pair;
  /** Lotin yozuvida o'qilishi — manbadagidek, o'zgartirilmagan */
  text: string;
  /** Ma'nosi — manbadagidek (o'zbekcha) */
  meaning: string;
  source: { title: string; url: string };
}

/** Saharlik va iftorlik duolari — O'zbekiston musulmonlari idorasi (muslim.uz) matnlari */
const DUAS: Dua[] = [
  {
    title: ['Saharlik (og‘iz yopish) duosi', 'Дуа при сухуре (намерение поста)'],
    when: ['Saharlikdan so‘ng, bomdod vaqti kirguncha', 'После сухура, до наступления бомдод'],
    text: '«Navaytu an asuma sovma shahri ramazona minal fajri ilal mag‘ribi, xolisan lillahi ta’ala. Allohu akbar»',
    meaning: 'Ramazon oyining ro‘zasini tong otganidan kun botgunicha xolis Alloh taolo uchun tutishni niyat qildim. Allohu akbar',
    source: {
      title: 'O‘zbekiston musulmonlari idorasi — «Har bir hududning saharlik va iftorlik vaqtlari»',
      url: 'https://muslim.uz/uz/e/post/21296-har-bir-hududning-saharlik-va-iftorlik-vaqtlari',
    },
  },
  {
    title: ['Iftorlik (og‘iz ochish) duosi', 'Дуа при ифтаре (разговении)'],
    when: ['Shom vaqti kirib, og‘iz ochilganda', 'При разговении, с наступлением шом'],
    text: 'Allohumma laka sumtu va bika amantu va ’alayka tavakkaltu va ’ala rizqika aftartu. Fag‘firli Ya G‘offaru ma qoddamtu va ma axxortu.',
    meaning: 'Ey Alloh, ushbu ro‘zamni Sen uchun tutdim va Senga iymon keltirdim va Senga tavakkal qildim va bergan rizqing bilan iftor qildim. Ey gunohlarni afv qiluvchi Zot, mening avvalgi va keyingi gunohlarimni mag‘firat qilgil.',
    source: {
      title: 'O‘zbekiston musulmonlari idorasi — «Rasululloh sollallohu alayhi vasallamning sunnatlari (37-qism): Iftorlik (og‘iz ochish) duosi»',
      url: 'https://muslim.uz/uz/e/post/32980-rasululloh-sollallohu-alayhi-vasallamning-sunnatlari-37-qism-iftorlik-og-iz-ochish-duosi',
    },
  },
];

export function RozaDuas() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="roza-duolar">
      <h2 id="roza-duolar" className="font-display text-xl font-bold text-neutral-900 md:text-2xl dark:text-white">
        {t('Saharlik va iftorlik duolari', 'Дуа при сухуре и ифтаре')}
      </h2>
      <div className="mt-3 grid gap-3 md:mt-4 md:grid-cols-2 md:gap-5">
        {DUAS.map((d) => (
          <article
            key={d.source.url}
            className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 md:rounded-3xl dark:bg-neutral-900 dark:ring-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-500 dark:bg-accent-500/15">
                <TopicIconSvg icon="dua" className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-neutral-900 sm:text-lg dark:text-white">{t(...d.title)}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t(...d.when)}</p>
              </div>
            </div>
            <p className="mt-4 rounded-2xl bg-primary-50 p-4 font-semibold leading-relaxed text-primary-900 dark:bg-primary-900/40 dark:text-emerald-100">
              {d.text}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              <span className="font-semibold text-neutral-900 dark:text-white">{t('Ma’nosi:', 'Смысл (узб.):')}</span> {d.meaning}
            </p>
            <p className="mt-auto pt-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t('Manba:', 'Источник:')}{' '}
              <a href={d.source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-neutral-300 underline-offset-2 hover:text-primary-700 dark:hover:text-emerald-300">
                {d.source.title}
              </a>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
