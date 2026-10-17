import { describe, expect, it } from 'vitest';
import type { BirgaSettings, BirgaSettingsSchema, Stage } from '../../types/birga';
import { arabicWords, matchRecitation, normalizeArabic } from './arabic';
import { HARD_CAP_FACTOR, SILENCE_BEFORE_COUNTDOWN, evaluateStage, expectedSeconds, scrollProgress, type EngineInput } from './engine';
import { nextNoiseFloor, speechThreshold } from './vad';
import { AYAH_HEARD, labeledTransliteration, latinAyahs, splitTransliteration } from './latin';
import { defaultZamChoice } from '../../components/birga/shared';
import type { BirgaSession } from '../../types/birga';

const schema: BirgaSettingsSchema = {
  speeds: { sekin: 7, ortacha: 10, tez: 14 },
  sensitivity: { past: { rms: 0.045, match: 0.6 }, ortacha: { rms: 0.03, match: 0.45 }, yuqori: { rms: 0.018, match: 0.3 } },
  fallback_seconds: { min: 2, max: 15, default: 4 },
  recitation_seconds: { min: 4, max: 240 },
  defaults: { speed: 'ortacha', sensitivity: 'ortacha', fallback: 4, large_text: false, wake_lock: true, night: false, speech: true, offline: true },
};

const stage = (over: Partial<Stage> = {}): Stage => ({
  index: 0, step_order: 1, rakat: 1, kind: 'recitation', title: 'Qiroat', text: '', text_female: '',
  images: [], recitation: 'fotiha', zam: false, timing: null, zikr: [], source_url: '', source_title: '', ...over,
});

const settings = (over: Partial<BirgaSettings> = {}): BirgaSettings => ({ ...schema.defaults, ...over });

// Tanzil (Usmoniy) matni
const IXLOS = ['قُلْ هُوَ ٱللَّهُ أَحَدٌ', 'ٱللَّهُ ٱلصَّمَدُ', 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ'];
const expected = arabicWords(IXLOS.join(' '));

describe('arabcha matnni solishtirish', () => {
  it('harakat va Usmoniy belgilarni olib tashlaydi', () => {
    expect(normalizeArabic('ٱللَّهُ ٱلصَّمَدُ')).toBe('الله الصمد');
    expect(normalizeArabic('لَّهُۥ كُفُوًا أَحَدٌۢ')).toBe('له كفوا احد');
  });

  it('to‘liq o‘qilgan surani taniydi', () => {
    const r = matchRecitation(expected, 'قل هو الله أحد الله الصمد لم يلد ولم يولد ولم يكن له كفوا أحد');
    expect(r.ratio).toBe(1);
    expect(r.reachedEnd).toBe(true);
  });

  it('yarim o‘qilganda oxiriga yetdi demaydi', () => {
    const r = matchRecitation(expected, 'قل هو الله أحد الله الصمد');
    expect(r.reachedEnd).toBe(false);
    expect(r.ratio).toBeCloseTo(6 / 15);
  });

  it('imlo farqlariga chidamli (ٱلْعَـٰلَمِينَ ~ العالمين)', () => {
    const fotiha = arabicWords('ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ');
    expect(matchRecitation(fotiha, 'الحمد لله رب العالمين').ratio).toBe(1);
  });

  it('boshqa matnni mos deb hisoblamaydi', () => {
    const r = matchRecitation(expected, 'سبحان ربي العظيم سبحان ربي العظيم');
    expect(r.ratio).toBeLessThan(0.2);
    expect(r.reachedEnd).toBe(false);
  });

  it('vaqf belgilari alohida so‘z sanalmaydi va indekslar qaytadi', () => {
    expect(arabicWords('ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى')).toEqual(['ذلك', 'الكتب', 'لا', 'ريب', 'فيه', 'هدي']);
    expect(matchRecitation(expected, 'قل هو الله').indices).toEqual([0, 1, 2]);
  });

  it('brauzer bir necha so‘zni tanimasa ham oxirigacha moslaydi', () => {
    const fotiha = arabicWords('بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين اياك نعبد واياك نستعين اهدنا الصراط المستقيم صراط الذين انعمت عليهم غير المغضوب عليهم ولا الضالين');
    // 6 ta so'z o'tkazib yuborildi (رب العالمين الرحمن الرحيم مالك يوم)
    const r = matchRecitation(fotiha, 'بسم الله الرحمن الرحيم الحمد لله الدين اياك نعبد واياك نستعين اهدنا الصراط المستقيم صراط الذين انعمت عليهم غير المغضوب عليهم ولا الضالين');
    expect(r.reachedEnd).toBe(true);
    expect(r.ratio).toBeGreaterThan(0.7);
  });

  it('bo‘sh natija', () => {
    expect(matchRecitation(expected, '')).toMatchObject({ matched: 0, reachedEnd: false });
  });
});

describe('taxminiy davomiylik', () => {
  it('ruku/sajda uchun tezlikka qarab chegaradan oladi', () => {
    const ruku = stage({ kind: 'posture', timing: [4, 6], recitation: null });
    expect(expectedSeconds(ruku, '', settings({ speed: 'sekin' }), schema)).toBe(6);
    expect(expectedSeconds(ruku, '', settings({ speed: 'ortacha' }), schema)).toBe(5);
    expect(expectedSeconds(ruku, '', settings({ speed: 'tez' }), schema)).toBe(4);
  });

  it('uzun matnga ko‘proq vaqt beradi va chegaralaydi', () => {
    const short = expectedSeconds(stage(), 'a'.repeat(40), settings(), schema);
    const long = expectedSeconds(stage(), 'a'.repeat(400), settings(), schema);
    expect(short).toBe(4);
    expect(long).toBe(40);
    expect(expectedSeconds(stage(), 'a'.repeat(400), settings({ speed: 'sekin' }), schema)).toBeGreaterThan(long);
    expect(expectedSeconds(stage(), 'a'.repeat(99999), settings(), schema)).toBe(240);
  });
});

describe('keyingi bosqichga o‘tish qarori', () => {
  const quiet = { active: true, speaking: false, heard: false, silence: 0, spokeFor: 0 };
  const talking = { active: true, speaking: true, heard: true, silence: 0, spokeFor: 5 };
  // qisqa gapirib to'xtadi (yetarli emas) — zaxira taymer kerak
  const stopped = (silence: number) => ({ active: true, speaking: false, heard: true, silence, spokeFor: 5 });
  const base = (over: Partial<EngineInput> = {}): EngineInput => ({
    stage: stage(), elapsed: 0, expected: 20, fallback: 6,
    voice: quiet, match: null, matchThreshold: 0.65, countdownFrom: null, ...over,
  });
  const full = { matched: 14, total: 15, ratio: 14 / 15, reachedEnd: true, indices: [] };

  it('ruku/sajda — faqat vizual taymer', () => {
    const ruku = stage({ kind: 'posture', timing: [4, 6] });
    expect(evaluateStage(base({ stage: ruku, expected: 5, elapsed: 4.9 }))).toMatchObject({ advance: null, countdown: { total: 5 } });
    expect(evaluateStage(base({ stage: ruku, expected: 5, elapsed: 5 })).advance).toBe('timer');
  });

  it('o‘qiyotganda taymer umuman ko‘rinmaydi — AI tinglaydi', () => {
    for (const elapsed of [1, 10, 25, 50]) {
      expect(evaluateStage(base({ elapsed, voice: talking }))).toEqual({ advance: null, countdownFrom: null, countdown: null });
    }
  });

  it('AI surani tanisa — taymersiz darhol o‘tadi', () => {
    expect(evaluateStage(base({ elapsed: 8, match: full, voice: talking })).advance).toBeNull();
    expect(evaluateStage(base({ elapsed: 8, match: full, voice: stopped(0.3) })).advance).toBe('speech');
  });

  it('moslik past bo‘lsa nutq bo‘yicha o‘tmaydi', () => {
    const weak = { matched: 3, total: 15, ratio: 0.2, reachedEnd: true, indices: [] };
    expect(evaluateStage(base({ elapsed: 5, match: weak, voice: stopped(0.3) })).advance).toBeNull();
  });

  it('oyatlar orasidagi qisqa pauzada taymer boshlanmaydi', () => {
    expect(evaluateStage(base({ elapsed: 12, voice: stopped(SILENCE_BEFORE_COUNTDOWN - 0.1) })).countdown).toBeNull();
  });

  it('o‘qib jim bo‘lsa va AI tanimasa — zaxira taymer boshlanadi, tugagach o‘tadi', () => {
    const first = evaluateStage(base({ elapsed: 12, voice: stopped(SILENCE_BEFORE_COUNTDOWN) }));
    expect(first).toMatchObject({ advance: null, countdownFrom: 12, countdown: { remaining: 6, total: 6 } });
    const mid = evaluateStage(base({ elapsed: 15, voice: stopped(5.5), countdownFrom: 12 }));
    expect(mid.countdown?.remaining).toBe(3);
    expect(evaluateStage(base({ elapsed: 18, voice: stopped(8.5), countdownFrom: 12 })).advance).toBe('voice');
  });

  it('qayta gapirsa taymer bekor bo‘ladi', () => {
    expect(evaluateStage(base({ elapsed: 15, voice: talking, countdownFrom: 12 }))).toEqual({ advance: null, countdownFrom: null, countdown: null });
  });

  it('umuman ovoz eshitilmasa — taxminiy vaqtdan keyin taymer boshlanadi', () => {
    expect(evaluateStage(base({ elapsed: 19.9 })).countdown).toBeNull();
    expect(evaluateStage(base({ elapsed: 20 })).countdownFrom).toBe(20);
    expect(evaluateStage(base({ elapsed: 26, countdownFrom: 20 })).advance).toBe('timer');
  });

  it('mikrofon ishlamasa — taymer boshidan ishlaydi', () => {
    const off = { active: false, speaking: false, heard: false, silence: 0, spokeFor: 0 };
    expect(evaluateStage(base({ elapsed: 1, voice: off })).countdown).toEqual({ remaining: 25, total: 26 });
    expect(evaluateStage(base({ elapsed: 26, voice: off })).advance).toBe('timer');
  });

  it('shovqin sabab «gapiryapti» to‘xtamasa ham cheksiz kutmaydi', () => {
    const cap = 20 * HARD_CAP_FACTOR + 6;
    expect(evaluateStage(base({ elapsed: cap - 1, voice: talking })).advance).toBeNull();
    expect(evaluateStage(base({ elapsed: cap, voice: talking })).advance).toBe('voice');
  });

  it('to‘liq o‘qib jim bo‘lsa — zaxira taymersiz o‘tadi (duolar uchun ham)', () => {
    const done = { active: true, speaking: false, heard: true, silence: SILENCE_BEFORE_COUNTDOWN, spokeFor: 12 };
    expect(evaluateStage(base({ elapsed: 15, voice: done })).advance).toBe('voice'); // 12 s ≥ 20 × 0.5
    expect(evaluateStage(base({ elapsed: 15, voice: { ...done, silence: 1 } })).advance).toBeNull(); // oyatlar orasidagi nafas
    expect(evaluateStage(base({ elapsed: 15, voice: { ...done, spokeFor: 6 } })).countdown).not.toBeNull(); // kam gapirdi
  });

  it('bir necha tik davomida: o‘qish → pauza → davom → tugatish', () => {
    let from: number | null = null;
    const tick = (elapsed: number, voice: EngineInput['voice'], match: EngineInput['match'] = null) => {
      const r = evaluateStage(base({ elapsed, voice, match, countdownFrom: from }));
      from = r.countdownFrom;
      return r;
    };
    expect(tick(5, talking).countdown).toBeNull();
    expect(tick(9, stopped(3)).countdown).not.toBeNull(); // uzoq pauza — taymer
    expect(tick(11, talking).countdown).toBeNull();        // davom etdi — bekor
    expect(from).toBeNull();
    expect(tick(30, stopped(0.5), full).advance).toBe('speech');
  });
});

describe('ovoz faolligi (VAD) chegarasi', () => {
  it('jim xonada chegara pasayadi — past ovozli mikrofon ham eshitiladi', () => {
    let noise = 0;
    for (let i = 0; i < 300; i++) noise = nextNoiseFloor(noise, 0.002);
    expect(speechThreshold(noise, 0.03)).toBeCloseTo(0.01); // base/3 dan past tushmaydi
    expect(0.012 >= speechThreshold(noise, 0.03)).toBe(true); // sokin o'qish ham eshitiladi
  });

  it('shovqinli xonada chegara ko‘tariladi, lekin sezgirlik chegarasidan oshmaydi', () => {
    let noise = 0.002;
    for (let i = 0; i < 60 * 30; i++) noise = nextNoiseFloor(noise, 0.008); // 30 soniya ventilyator
    expect(noise).toBeGreaterThan(0.007);
    expect(speechThreshold(noise, 0.03)).toBeGreaterThan(0.02);
    expect(speechThreshold(1, 0.03)).toBe(0.03);
  });

  it('shovqin to‘xtasa tez moslashadi', () => {
    let noise = 0.008;
    for (let i = 0; i < 30; i++) noise = nextNoiseFloor(noise, 0.001); // yarim soniya
    expect(noise).toBeLessThan(0.0015);
  });
});

describe('eshitilgan nutq lotinchada (muslim.uz oyatlari bo‘yicha)', () => {
  const IXLOS_LATIN = '1. Qul huvallohu ahad 2. Allohus-somad 3. Lam yalid va lam yulad 4. Va lam yakullahu kufuvan ahad.';

  it('lotincha matnni oyatlarga ajratadi (Fotihadagi «6-7.» va raqamsiz Basmala bilan)', () => {
    expect(splitTransliteration(IXLOS_LATIN)).toEqual(['Qul huvallohu ahad', 'Allohus-somad', 'Lam yalid va lam yulad', 'Va lam yakullahu kufuvan ahad.']);
    expect(splitTransliteration('Bismillahir rohmaanir rohiym.\n1. Alhamdulillahi 5. Ihdinas 6-7. Sirootol')).toEqual(['Bismillahir rohmaanir rohiym.', 'Alhamdulillahi', 'Ihdinas', 'Sirootol']);
  });

  it('o‘qilgan oyatlarni topadi', () => {
    const heard = matchRecitation(expected, 'قل هو الله أحد الله الصمد');
    const ayahs = latinAyahs(IXLOS, IXLOS_LATIN, heard.indices)!;
    expect(ayahs.map((a) => a.heard >= AYAH_HEARD)).toEqual([true, true, false, false]);
    expect(ayahs[1].latin).toBe('Allohus-somad');
    expect(ayahs.map((x) => x.label)).toEqual(['1', '2', '3', '4']);
  });

  it('Fotihada manbadagi raqamlar saqlanadi (Basmala raqamsiz, «6-7»)', () => {
    expect(labeledTransliteration('Bismillahir rohmaanir rohiym.\n1. Alhamdulillahi 6-7. Sirootol').map((x) => x.label)).toEqual(['', '1', '6-7']);
  });

  it('oyatlar soni mos kelmasa taxmin qilmaydi', () => {
    expect(latinAyahs(IXLOS, '1. Qul huvallohu ahad 2. Allohus-somad', [0, 1])).toBeNull();
  });
});

describe('uzun matnni surish', () => {
  it('darhol boshlanadi va taxminiy vaqtning 75% ida oxiriga yetadi', () => {
    expect(scrollProgress(0, 40)).toBe(0);
    expect(scrollProgress(3, 40)).toBeCloseTo(0.1);
    expect(scrollProgress(15, 40)).toBeCloseTo(0.5);
    expect(scrollProgress(30, 40)).toBe(1);
    expect(scrollProgress(99, 40)).toBe(1);
  });
});

describe('har rakatga zam sura', () => {
  const zamStage = (rakat: number): Stage => stage({ rakat, zam: true, recitation: null });
  const session = (rakats: number[]) => ({
    stages: rakats.map(zamStage),
    zam_suras: ['fiyl', 'quraysh', 'maun', 'kavsar', 'kafirun', 'nasr', 'masad', 'ixlos', 'falaq', 'nas'],
  }) as unknown as BirgaSession;

  it('har rakatda boshqa sura, Qur’on tartibida', () => {
    expect(defaultZamChoice(session([1, 2]), 'ixlos')).toEqual({ 1: 'ixlos', 2: 'falaq' });
    expect(defaultZamChoice(session([1, 2, 3, 4]), 'kavsar')).toEqual({ 1: 'kavsar', 2: 'kafirun', 3: 'nasr', 4: 'masad' });
  });

  it('ro‘yxat oxiridan oshib ketmaydi va tanlanganlarini saqlaydi', () => {
    expect(defaultZamChoice(session([1, 2, 3, 4]), 'nas')).toEqual({ 1: 'masad', 2: 'ixlos', 3: 'falaq', 4: 'nas' });
    expect(defaultZamChoice(session([1, 2, 3, 4]), 'ixlos', { 1: 'kavsar' })[1]).toBe('kavsar');
  });

  it('qism almashsa (2 → 4 rakat) suralar takrorlanmaydi', () => {
    const four = defaultZamChoice(session([1, 2, 3, 4]), 'ixlos');
    expect(new Set(Object.values(four)).size).toBe(4);
    expect(Object.values(four)).toEqual(['masad', 'ixlos', 'falaq', 'nas']);
    const withPick = defaultZamChoice(session([1, 2, 3, 4]), 'ixlos', { 3: 'ixlos' });
    expect(withPick[3]).toBe('ixlos');
    expect(new Set(Object.values(withPick)).size).toBe(4);
  });
});
