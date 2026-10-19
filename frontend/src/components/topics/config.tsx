import type { ReactNode } from 'react';
import type { TopicCategory, TopicIcon } from '../../types/namoz';
import type { GuideStep } from '../common/PageGuide';

/** [o'zbekcha, ruscha] */
type Pair = [string, string];

/** Mavzuli bo'lim (Namoz, Iymon, Zakot, Ro'za) sahifalari uchun sozlama */
export interface TopicCategoryConfig {
  /** Backend kategoriyasi va API yo'li: /api/<category>/topics/ */
  category: TopicCategory;
  /** Frontend yo'li, masalan /namoz */
  basePath: string;
  /** Bo'lim nomi (breadcrumb, qaytish tugmasi) */
  label: Pair;
  /** Qaytish tugmasidagi ikonka */
  icon: TopicIcon;
  /** Hero matni */
  intro: { uz: ReactNode; ru: ReactNode };
  heroImage: string;
  /** Hero'dagi qisqa ma'lumotlar (birinchisi — mavzular soni bilan almashtiriladi) */
  stats: { value: Pair; label: Pair }[];
  note: { title: Pair; text: Pair };
  /** Sahifa tagidagi «Bu sahifada nima qilasiz?» qadamlari */
  guide: GuideStep[];
}

/** Mavzuli bo'limlar uchun umumiy qadamlar: mavzuni ochish, mundarija, manba */
const OPEN_TOPIC: GuideStep = {
  title: ['Mavzuni tanlang', 'Выберите тему'],
  text: ['Kerakli mavzu kartochkasini bosing — matn bo‘limlarga ajratilgan holda ochiladi.', 'Нажмите на карточку нужной темы — откроется текст, разбитый на разделы.'],
};
const READ_SECTIONS: GuideStep = {
  title: ['Bo‘limlar bo‘yicha o‘qing', 'Читайте по разделам'],
  text: ['Mundarijadan kerakli bo‘limga o‘ting; «Keyingi mavzu» tugmasi bilan tartib bo‘yicha davom eting.', 'Переходите к нужному разделу через содержание; кнопка «Следующая тема» ведёт дальше по порядку.'],
};
const CHECK_SOURCE: GuideStep = {
  title: ['Manbani tekshiring', 'Проверьте источник'],
  text: ['Har bir bo‘lim ostida asl manbaga havola bor — matnni muslim.uz saytida solishtirishingiz mumkin.', 'Под каждым разделом есть ссылка на первоисточник — текст можно сверить на сайте muslim.uz.'],
};
const SEARCH: GuideStep = {
  title: ['Qidiruvdan foydalaning', 'Пользуйтесь поиском'],
  text: ['Yuqoridagi qidiruvga (Ctrl+K) so‘z yozing — barcha bo‘limlardagi mavzu va matnlardan topadi.', 'Введите слово в поиск вверху (Ctrl+K) — он ищет по темам и текстам всех разделов.'],
};

export const NAMOZ_CONFIG: TopicCategoryConfig = {
  category: 'namoz',
  basePath: '/namoz',
  label: ['Namoz', 'Намаз'],
  icon: 'mosque',
  heroImage: '/images/mosque.webp',
  intro: {
    uz: (
      <>
        Bu bo'limda poklanishdan tortib namozning o'qilish tartibi, duolar, qazo namozlari va turli
        namozlargacha bo'lgan mavzular <strong className="text-white">Hanafiy</strong> mazhabi asosida jamlangan.
        Har bir mavzu bo'yicha ma'lumotlar mutaxassis tekshiruvidan so'ng manbasi bilan birga joylanadi.
      </>
    ),
    ru: (
      <>
        В этом разделе собраны темы от очищения до порядка совершения намаза, дуа, восполнения пропущенных
        и различных намазов — на основе <strong className="text-white">ханафитского</strong> мазхаба.
        Материалы публикуются после проверки специалистом и с указанием источника.
      </>
    ),
  },
  stats: [
    { value: ['12', '12'], label: ['mavzu', 'тем'] },
    { value: ['Hanafiy', 'Ханафитский'], label: ['mazhabi', 'мазхаб'] },
    { value: ['Manbali', 'С источниками'], label: ['ma’lumot', 'материалы'] },
  ],
  note: {
    title: ['Ma’lumotlar qanday tayyorlanadi?', 'Как готовятся материалы?'],
    text: [
      "Oyat, hadis va fiqhiy hukmlar faqat Hanafiy fiqhi bo'yicha mutaxassis tekshirgandan so'ng va manbasi ko'rsatilgan holda chop etiladi. \"Tekshiruvda\" belgisi qo'yilgan mavzular ustida ish olib borilmoqda.",
      'Аяты, хадисы и фикхские положения публикуются только после проверки специалистом по ханафитскому фикху и с указанием источника. Над темами с пометкой «На проверке» ведётся работа.',
    ],
  },
  guide: [
    OPEN_TOPIC,
    READ_SECTIONS,
    CHECK_SOURCE,
    {
      title: ['Amalda mashq qiling', 'Практикуйтесь'],
      text: ['«Namoz o‘rganish» bo‘limida har bir namozni rasm va audio bilan bosqichma-bosqich o‘rganing.', 'В разделе «Обучение намазу» изучайте каждый намаз пошагово, с иллюстрациями и аудио.'],
    },
  ],
};

export const IYMON_CONFIG: TopicCategoryConfig = {
  category: 'iymon',
  basePath: '/iymon',
  label: ['Iymon', 'Иман'],
  icon: 'heart',
  heroImage: '/images/quran-sidebar.webp',
  intro: {
    uz: (
      <>
        Bu bo'limda din va shariat tushunchalari, iymon asoslari — Allohga, farishtalarga, kitoblarga,
        payg'ambarlarga, oxirat kuniga va qadarga iymon, shuningdek aqida hamda halol va harom mavzulari
        jamlangan. Matnlar <strong className="text-white">O'zbekiston musulmonlari idorasi</strong> rasmiy
        saytidan manbasi bilan olingan.
      </>
    ),
    ru: (
      <>
        В этом разделе — понятия религии и шариата, основы веры: вера в Аллаха, ангелов, Писания, пророков,
        Судный день и предопределение, а также вероучение, дозволенное и запретное. Тексты взяты
        с официального сайта <strong className="text-white">Управления мусульман Узбекистана</strong> с указанием источника.
      </>
    ),
  },
  stats: [
    { value: ['13', '13'], label: ['mavzu', 'тем'] },
    { value: ['Aqida', 'Акыда'], label: ['asoslari', 'основы'] },
    { value: ['Manbali', 'С источниками'], label: ['ma’lumot', 'материалы'] },
  ],
  note: {
    title: ['Ma’lumotlar manbasi', 'Источник материалов'],
    text: [
      "Matnlar O'zbekiston musulmonlari idorasining rasmiy sayti (muslim.uz) dan o'zgartirilmasdan olingan; har bir bo'lim ostida asl manbaga havola berilgan.",
      'Тексты взяты без изменений с официального сайта Управления мусульман Узбекистана (muslim.uz); под каждым разделом дана ссылка на оригинал.',
    ],
  },  guide: [OPEN_TOPIC, READ_SECTIONS, CHECK_SOURCE, SEARCH],
};

export const ZAKOT_CONFIG: TopicCategoryConfig = {
  category: 'zakot',
  basePath: '/zakot',
  label: ['Zakot', 'Закят'],
  icon: 'hand_coin',
  heroImage: '/images/zakot/hero.webp',
  intro: {
    uz: (
      <>
        Bu bo'limda zakotning ma'nosi va fiqhiy hukmlari, chorva, tilla-kumush, naqd pul, tijorat moli va
        qimmatbaho toshlarning zakoti, zakot olishi mumkin bo'lmaganlar hamda zakot beruvchining vazifalari
        jamlangan. Matnlar <strong className="text-white">O'zbekiston musulmonlari idorasi</strong> rasmiy
        saytidan manbasi bilan olingan.
      </>
    ),
    ru: (
      <>
        В этом разделе — смысл и фикхские положения закята, закят со скота, золота и серебра, наличных денег,
        товаров и драгоценных камней, кому нельзя давать закят и обязанности дающего закят. Тексты взяты
        с официального сайта <strong className="text-white">Управления мусульман Узбекистана</strong> с указанием источника.
      </>
    ),
  },
  stats: [
    { value: ['10', '10'], label: ['mavzu', 'тем'] },
    { value: ['Hanafiy', 'Ханафитский'], label: ['mazhabi', 'мазхаб'] },
    { value: ['Manbali', 'С источниками'], label: ['ma’lumot', 'материалы'] },
  ],
  note: {
    title: ['Ma’lumotlar manbasi', 'Источник материалов'],
    text: [
      "Matnlar O'zbekiston musulmonlari idorasining rasmiy sayti (muslim.uz, «Zakot» bo'limi) dan o'zgartirilmasdan olingan; har bir bo'lim ostida asl manbaga havola berilgan.",
      'Тексты взяты без изменений с официального сайта Управления мусульман Узбекистана (muslim.uz, раздел «Закят»); под каждым разделом дана ссылка на оригинал.',
    ],
  },  guide: [
    {
      title: ['Avval asosini o‘qing', 'Начните с основ'],
      text: ['«Zakot nima?» va «Zakotning fiqhiy hukmlari» mavzularidan boshlang.', 'Начните с тем «Что такое закят?» и «Фикхские положения закята».'],
    },
    {
      title: ['Mol-mulkingiz turini toping', 'Найдите вид своего имущества'],
      text: ['Chorva, tilla-kumush, naqd pul, tijorat moli, taqinchoq yoki qimmatbaho tosh — tegishli mavzuni oching.', 'Скот, золото и серебро, наличные, товары, украшения или драгоценные камни — откройте нужную тему.'],
    },
    {
      title: ['Kimga berilishini aniqlang', 'Узнайте, кому давать'],
      text: ['«Zakot olishi mumkin bo‘lmaganlar» va «Zakot beruvchining vazifalari» mavzularini o‘qing.', 'Прочитайте темы «Кому нельзя давать закят» и «Обязанности дающего закят».'],
    },
    CHECK_SOURCE,
  ],
};

export const ROZA_CONFIG: TopicCategoryConfig = {
  category: 'roza',
  basePath: '/roza',
  label: ['Ro‘za', 'Пост'],
  icon: 'moon',
  heroImage: '/images/roza/hero.webp',
  intro: {
    uz: (
      <>
        Bu bo'limda hududingiz bo'yicha har kungi va oylik saharlik hamda iftorlik vaqtlari, og'iz yopish va
        og'iz ochish duolari, shuningdek ro'za qanday ibodat ekani va ro'zaning darajalari jamlangan. Matnlar <strong className="text-white">O'zbekiston musulmonlari idorasi</strong> rasmiy saytidan
        manbasi bilan olingan.
      </>
    ),
    ru: (
      <>
        В этом разделе — ежедневное и месячное время сухура и ифтара для вашего региона, дуа при сухуре и ифтаре,
        а также темы о посте как поклонении и о степенях поста.
        Тексты взяты с официального сайта <strong className="text-white">Управления мусульман Узбекистана</strong> с указанием источника.
      </>
    ),
  },
  stats: [
    { value: ['2', '2'], label: ['mavzu', 'темы'] },
    { value: ['Hanafiy', 'Ханафитский'], label: ['mazhabi', 'мазхаб'] },
    { value: ['Manbali', 'С источниками'], label: ['ma’lumot', 'материалы'] },
  ],
  note: {
    title: ['Ma’lumotlar manbasi', 'Источник материалов'],
    text: [
      "Matnlar O'zbekiston musulmonlari idorasining rasmiy sayti (muslim.uz, «Ro'za» bo'limi) dan o'zgartirilmasdan olingan; har bir bo'lim ostida asl manbaga havola berilgan.",
      'Тексты взяты без изменений с официального сайта Управления мусульман Узбекистана (muslim.uz, раздел «Пост»); под каждым разделом дана ссылка на оригинал.',
    ],
  },  guide: [
    {
      title: ['Hududingizni tanlang', 'Выберите регион'],
      text: ['«Saharlik va iftorlik» panelidagi «Hudud» tugmasi orqali viloyatingizni tanlang.', 'Выберите свою область кнопкой «Регион» на панели «Сухур и ифтар».'],
    },
    {
      title: ['Bugungi vaqtni ko‘ring', 'Смотрите время на сегодня'],
      text: ['Saharlik va iftorlik vaqti hamda keyingisigacha qancha qolgani ko‘rsatiladi.', 'Показаны время сухура и ифтара и сколько осталось до ближайшего.'],
    },
    {
      title: ['Jadval yoki Ramazon taqvimini oching', 'Откройте расписание или календарь Рамадана'],
      text: ['«Oylik» — oy bo‘yicha jadval; «Ramazon taqvimi» — Ramazonning har bir kuni uchun vaqtlar.', '«По месяцам» — расписание на месяц; «Календарь Рамадана» — время на каждый день Рамадана.'],
    },
    {
      title: ['Duolarni o‘qing va yodlang', 'Читайте и заучивайте дуа'],
      text: ['Og‘iz yopish va og‘iz ochish duolari ma’nosi va manbasi bilan berilgan.', 'Дуа при сухуре и ифтаре даны со смыслом и источником.'],
    },
  ],
};
