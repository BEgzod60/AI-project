import { useEffect, useRef, useState } from 'react';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { useT } from '../../i18n';
import './TasbehPage.css';

interface ZikrItem {
  id: 'subhanalloh' | 'alhamdulillah' | 'allohu_akbar';
  name: string;
  nameRu: string;
  arabic: string;
  meaning: string;
  meaningRu: string;
  target: number;
}

const ZIKRS: ZikrItem[] = [
  {
    id: 'subhanalloh',
    name: 'Subhanalloh',
    nameRu: 'Субханаллах',
    arabic: 'سُبْحَانَ ٱللَّٰهِ',
    meaning: 'Alloh har qanday nuqsondan pokdir.',
    meaningRu: 'Аллах пречист от всех недостатков.',
    target: 33,
  },
  {
    id: 'alhamdulillah',
    name: 'Alhamdulillah',
    nameRu: 'Альхамдулиллях',
    arabic: 'ٱلْحَمْدُ لِلَّٰهِ',
    meaning: 'Allohga hamd va maqtovlar bo‘lsin.',
    meaningRu: 'Вся хвала принадлежит Аллаху.',
    target: 33,
  },
  {
    id: 'allohu_akbar',
    name: 'Allohu akbar',
    nameRu: 'Аллаху акбар',
    arabic: 'ٱللَّٰهُ أَكْبَرُ',
    meaning: 'Alloh eng ulug‘ va buyukdir.',
    meaningRu: 'Аллах — Величайший.',
    target: 33,
  },
];

const STORAGE_KEY = 'iymon_tasbeh_state_v2';
const STATS_KEY = 'iymon_tasbeh_stats_v2';

interface SavedState {
  mode: 'standard' | 'infinity';
  zikrIndex: number;
  counts: [number, number, number];
  infinityCount: number;
  cycleCount: number;
  vibrate: boolean;
  autoNext: boolean;
  sound: boolean;
}

interface SavedStats {
  todayTotal: number;
  dailyGoal: number;
  lastDate: string;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TasbehPage() {
  const t = useT();

  // Holatni localStorage'dan yuklash (har bir sanalgan zikr saqlanadi)
  const [state, setState] = useState<SavedState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          mode: parsed.mode ?? 'standard',
          zikrIndex: parsed.zikrIndex ?? 0,
          counts: parsed.counts ?? [0, 0, 0],
          infinityCount: parsed.infinityCount ?? 0,
          cycleCount: parsed.cycleCount ?? 0,
          vibrate: parsed.vibrate ?? true,
          autoNext: parsed.autoNext ?? true,
          sound: parsed.sound ?? false,
        };
      }
    } catch {
      // ignore
    }
    return {
      mode: 'standard',
      zikrIndex: 0,
      counts: [0, 0, 0],
      infinityCount: 0,
      cycleCount: 0,
      vibrate: true,
      autoNext: true,
      sound: false,
    };
  });

  // Statistikani yuklash
  const [stats, setStats] = useState<SavedStats>(() => {
    const today = getTodayString();
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lastDate === today) {
          return {
            todayTotal: parsed.todayTotal ?? 0,
            dailyGoal: parsed.dailyGoal ?? 300,
            lastDate: today,
          };
        }
      }
    } catch {
      // ignore
    }
    return {
      todayTotal: 0,
      dailyGoal: 300,
      lastDate: today,
    };
  });

  const [animating, setAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Holat o'zgarganda saqlash
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // Statistika o'zgarganda saqlash
  useEffect(() => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // ignore
    }
  }, [stats]);

  // Zikr ma'lumotlari
  const isInfinity = state.mode === 'infinity';
  const currentZikr = ZIKRS[state.zikrIndex];
  const currentCount = isInfinity ? state.infinityCount : state.counts[state.zikrIndex];
  const totalStandardCount = state.counts[0] + state.counts[1] + state.counts[2];

  // Mayin klik tovushini yaratish (Web Audio API)
  const playClickSound = () => {
    if (!state.sound) return;
    try {
      const ctx = audioContextRef.current ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // ignore
    }
  };

  // Vibratsiya chaqirish
  const triggerVibrate = (pattern: number | number[]) => {
    if (!state.vibrate) return;
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

  // Sanash tugmasi bosilganda
  const handleIncrement = () => {
    playClickSound();
    setAnimating(true);
    setTimeout(() => setAnimating(false), 160);

    // Kunlik statistikani yangilash
    const today = getTodayString();
    setStats((prev) => ({
      ...prev,
      todayTotal: prev.lastDate === today ? prev.todayTotal + 1 : 1,
      lastDate: today,
    }));

    // Cheksiz rejimda sanash
    if (isInfinity) {
      const nextInfinity = state.infinityCount + 1;
      // Har 33 yoki 100 taga yetganda mayin tebranish
      if (nextInfinity % 100 === 0) {
        triggerVibrate([40, 60, 40]);
      } else if (nextInfinity % 33 === 0) {
        triggerVibrate(40);
      } else {
        triggerVibrate(25);
      }

      setState((prev) => ({
        ...prev,
        infinityCount: nextInfinity,
      }));
      return;
    }

    // Standart 33 talik rejimda sanash
    const nextCount = currentCount + 1;

    // 33 taga yetganda
    if (nextCount >= currentZikr.target) {
      triggerVibrate([40, 60, 40]);

      // Agar hozir 3-zikr tugayotgan bo'lsa (99 tasi tamomlandi)
      if (state.zikrIndex === 2) {
        triggerVibrate([80, 50, 80, 50, 150]);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 4000);

        setState((prev) => {
          const newCounts: [number, number, number] = [...prev.counts];
          newCounts[prev.zikrIndex] = 33;
          return {
            ...prev,
            counts: [0, 0, 0],
            zikrIndex: 0,
            cycleCount: prev.cycleCount + 1,
          };
        });
      } else if (state.autoNext) {
        // Avtomatik keyingi zikrga o'tish
        setState((prev) => {
          const newCounts: [number, number, number] = [...prev.counts];
          newCounts[prev.zikrIndex] = 33;
          return {
            ...prev,
            counts: newCounts,
            zikrIndex: prev.zikrIndex + 1,
          };
        });
      } else {
        setState((prev) => {
          const newCounts: [number, number, number] = [...prev.counts];
          newCounts[prev.zikrIndex] = 33;
          return {
            ...prev,
            counts: newCounts,
          };
        });
      }
    } else {
      triggerVibrate(25);
      setState((prev) => {
        const newCounts: [number, number, number] = [...prev.counts];
        newCounts[prev.zikrIndex] = nextCount;
        return {
          ...prev,
          counts: newCounts,
        };
      });
    }
  };

  // Rejimni o'zgartirish (33/99 talik yoki Cheksiz)
  const handleSelectMode = (mode: 'standard' | 'infinity') => {
    triggerVibrate(25);
    setState((prev) => ({
      ...prev,
      mode,
    }));
  };

  // Zikrni o'zgartirish
  const handleSelectZikr = (index: number) => {
    triggerVibrate(20);
    setState((prev) => ({
      ...prev,
      mode: 'standard',
      zikrIndex: index,
    }));
  };

  // Reset (Qayta boshlash)
  const handleReset = () => {
    if (isInfinity) {
      if (window.confirm(t('Cheksiz hisoblagichni 0 ga tushirmoqchimisiz?', 'Сбросить бесконечный счётчик в 0?'))) {
        triggerVibrate([60, 40]);
        setState((prev) => ({
          ...prev,
          infinityCount: 0,
        }));
      }
    } else {
      if (window.confirm(t('Ushbu zikr hisobini 0 ga tushirmoqchimisiz?', 'Сбросить счётчик этого зикра в 0?'))) {
        triggerVibrate([60, 40]);
        setState((prev) => {
          const newCounts: [number, number, number] = [...prev.counts];
          newCounts[prev.zikrIndex] = 0;
          return {
            ...prev,
            counts: newCounts,
          };
        });
      }
    }
  };

  // 99 lik siklni yakunlash
  const handleCompleteCycle = () => {
    triggerVibrate([80, 50, 80, 50, 120]);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3500);
    setState((prev) => ({
      ...prev,
      counts: [0, 0, 0],
      zikrIndex: 0,
      cycleCount: prev.cycleCount + 1,
    }));
  };

  // Klaviaturada bo'shliq (Space) yoki Enter bosilganda sanash
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'button' && activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          handleIncrement();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const totalBeads = 33;
  // Cheksiz rejimda halqa 33 talik davrlarda aylanib boradi
  const beadProgress = isInfinity ? state.infinityCount % 33 : currentCount;
  const goalPercentage = Math.min(100, Math.round((stats.todayTotal / stats.dailyGoal) * 100));

  return (
    <div className="page tasbeh-page pb-12">
      {/* 99 yakunlanganda tantanali tabrik modali */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative max-w-sm w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#113a26] via-[#092215] to-[#040e09] p-7 text-center shadow-2xl ring-2 ring-accent-400/60 animate-scale-up">
            <div className="absolute -top-12 -left-12 h-36 w-36 rounded-full bg-accent-400/20 blur-3xl" />
            <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl" />
            
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#c9a24a] via-[#e3bf68] to-[#f7e3a3] text-neutral-950 shadow-xl shadow-accent-500/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>

            <h3 className="mt-4 font-brand text-2xl font-bold text-accent-300">
              {t('Alhamdulillah!', 'Альхамдулиллях!')}
            </h3>
            <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
              {t('99 lik to‘liq zikr siklini muvaffaqiyatli yakunladingiz. Qilgan zikrlaringiz qabul bo‘lsin!', 'Вы успешно завершили полный цикл из 99 зикров. Да примет Аллах ваши молитвы!')}
            </p>

            <button
              type="button"
              onClick={() => setShowCelebration(false)}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-500 to-[#c9a24a] py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-accent-600/30 transition hover:brightness-110 active:scale-95"
            >
              {t('Davom etish', 'Продолжить')}
            </button>
          </div>
        </div>
      )}

      <section className="hero motion-safe:animate-fade-in-up">
        <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: 'url(/images/tasbeh/tepa-qismi.png)' }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/85 to-primary-900/20" />
        <div className="hero-body">
          <Breadcrumb items={[{ label: t('Bosh sahifa', 'Главная'), to: '/' }, { label: t('Tasbeh', 'Тасбих') }]} />
          <div className="mt-3 flex items-center gap-3 md:mt-5 md:gap-4">
            <img src="/images/iymon-logo.webp" alt="" width={56} height={56} className="h-10 w-10 rounded-xl shadow-lg md:h-14 md:w-14 md:rounded-2xl" />
            <h1 className="hero-title text-white">{t('Tasbeh', 'Тасбих')}</h1>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/85 md:mt-5 md:text-base">
            {t('Zikrlarni sanang va kunlik natijangizni kuzating.', 'Считайте зикры и следите за ежедневным прогрессом.')}
          </p>
        </div>
      </section>

      {/* ===== Asosiy Ish Maydoni ===== */}
      <div className="tasbeh-layout mt-3 sm:mt-4 md:mt-8">
        
        {/* Chap qism: Rejim/Zikr tanlash va Markaziy 3D Tasbeh kartasi */}
        <div className="tasbeh-stage">
          
          {/* Zikr tanlash navigatsiyasi (4 ta tab: 3 ta an'anaviy zikr + Cheksiz) */}
          <div className="tasbeh-tabs" role="group" aria-label={t('Zikr turini tanlash', 'Выбор зикра')}>
            {ZIKRS.map((zikr, idx) => {
              const isActive = !isInfinity && state.zikrIndex === idx;
              return (
                <button
                  key={zikr.id}
                  type="button"
                  onClick={() => handleSelectZikr(idx)}
                  aria-pressed={isActive}
                  className={`tasbeh-tab flex flex-col items-center justify-center rounded-xl p-2 sm:p-2.5 transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-b from-[#e3bf68] via-[#c9a24a] to-[#9e7626] text-neutral-950 font-bold shadow-lg shadow-accent-500/30 ring-2 ring-accent-300 scale-[1.02]'
                      : 'bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs md:text-sm font-semibold truncate max-w-full">
                    {zikr.name}
                  </span>
                  <span className={`mt-0.5 text-[10px] sm:text-xs font-medium tabular-nums ${isActive ? 'text-neutral-950/85' : 'text-emerald-300'}`}>
                    {state.counts[idx]} / 33
                  </span>
                </button>
              );
            })}

            {/* Cheksiz rejim tabi */}
            <button
              type="button"
              onClick={() => handleSelectMode('infinity')}
              aria-pressed={isInfinity}
              className={`tasbeh-tab flex flex-col items-center justify-center rounded-xl p-2 sm:p-2.5 transition-all duration-300 ${
                isInfinity
                  ? 'bg-gradient-to-b from-[#e3bf68] via-[#c9a24a] to-[#9e7626] text-neutral-950 font-bold shadow-lg shadow-accent-500/30 ring-2 ring-accent-300 scale-[1.02]'
                  : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/40'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-[11px] sm:text-xs md:text-sm font-semibold">
                  {t('Cheksiz', 'Бесконечный')}
                </span>
                <span className="text-base sm:text-lg leading-none font-bold">∞</span>
              </div>
              <span className={`mt-0.5 text-[10px] sm:text-xs font-medium tabular-nums ${isInfinity ? 'text-neutral-950/85' : 'text-accent-300'}`}>
                {state.infinityCount}
              </span>
            </button>
          </div>

          {/* Markaziy Premium Tasbeh Qurilmasi */}
          <div className="tasbeh-counter relative flex flex-col items-center justify-center overflow-hidden text-center">
            {/* Yumshoq yoritish va glow effekti */}
            <div className="tasbeh-counter-shade" aria-hidden="true" />

            {/* Zikr nomi, arabcha matni va ma'nosi */}
            <div className="relative z-10 space-y-1 sm:space-y-2 max-w-md">
              <span className="tasbeh-zikr-label">
                {isInfinity ? t('Erkin cheksiz zikr', 'Свободный зикр') : t(currentZikr.name, currentZikr.nameRu)}
              </span>
              <div className="font-quran py-1.5 text-3xl sm:text-4xl md:text-5xl text-accent-300 drop-shadow-[0_2px_12px_rgba(214,164,71,0.35)]" dir="rtl">
                {isInfinity ? 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ' : currentZikr.arabic}
              </div>
              <p className="mx-auto text-xs sm:text-sm text-emerald-100/75 leading-relaxed">
                {isInfinity
                  ? t('Cheksiz zikr va salovotlar hisoblagichi. Istalgan miqdorda davom eting, barcha hisoblar saqlanadi.', 'Счётчик для свободного зикра и салаватов без ограничений. Ваши нажатия надёжно сохраняются.')
                  : t(currentZikr.meaning, currentZikr.meaningRu)}
              </p>
            </div>

            {/* Markaziy Interaktiv 3D Tasbeh Aylana Halqasi */}
            <div className="tasbeh-bead-wrap relative flex items-center justify-center">
              <div className="tasbeh-bead-ring relative">
                <div className="tasbeh-ring-ornament" aria-hidden="true" />
                {/* SVG 33 ta 3D Tasbeh Donalari va Oltin ajratgichlar */}
                <svg className="h-full w-full -rotate-90 transform select-none" viewBox="0 0 300 300">
                  <defs>
                    <radialGradient id="beadDarkGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#256b48" />
                      <stop offset="45%" stopColor="#0b3824" />
                      <stop offset="85%" stopColor="#041c12" />
                      <stop offset="100%" stopColor="#010d08" />
                    </radialGradient>

                    <radialGradient id="beadGoldGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#fff8db" />
                      <stop offset="30%" stopColor="#f7d57c" />
                      <stop offset="70%" stopColor="#d6a447" />
                      <stop offset="95%" stopColor="#875c17" />
                      <stop offset="100%" stopColor="#543609" />
                    </radialGradient>

                    <radialGradient id="beadActiveGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="25%" stopColor="#ffe994" />
                      <stop offset="65%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#92400e" />
                    </radialGradient>

                    <linearGradient id="spacerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="50%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f3d78d" floodOpacity="0.85" />
                    </filter>
                  </defs>

                  {/* Orqa fon ip/yo'l sathi */}
                  <circle
                    cx="150"
                    cy="150"
                    r="120"
                    className="stroke-emerald-950/70"
                    strokeWidth="3"
                    strokeDasharray="4 6"
                    fill="none"
                  />

                  <circle cx="150" cy="150" r="94" fill="none" stroke="#d6a447" strokeOpacity="0.62" strokeWidth="1.4" />
                  <circle cx="150" cy="150" r="89" fill="none" stroke="#f8dc92" strokeOpacity="0.23" strokeWidth="1" strokeDasharray="2 4" />

                  {/* Progress oltin silliq aylanasi */}
                  <circle
                    cx="150"
                    cy="150"
                    r="120"
                    className="stroke-accent-400/40 transition-all duration-300 ease-out"
                    strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={(2 * Math.PI * 120) * (1 - beadProgress / totalBeads)}
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* 33 ta 3D Tasbeh donalari */}
                  {Array.from({ length: totalBeads }).map((_, i) => {
                    const angle = (i * 360) / totalBeads;
                    const rad = (angle * Math.PI) / 180;
                    const radius = 120;
                    const cx = 150 + radius * Math.cos(rad);
                    const cy = 150 + radius * Math.sin(rad);

                    const isDone = i < beadProgress;
                    const isCurrent = i === beadProgress - 1;
                    const isSpacer = i === 10 || i === 21;

                    return (
                      <g key={i} className={isCurrent ? 'tasbeh-active-bead' : undefined}>
                        {isSpacer && (
                          <rect
                            x={cx - 3}
                            y={cy - 9}
                            width="6"
                            height="18"
                            rx="2"
                            transform={`rotate(${angle + 90}, ${cx}, ${cy})`}
                            fill="url(#spacerGrad)"
                            className="drop-shadow-sm"
                          />
                        )}

                        <circle
                          cx={cx + 1}
                          cy={cy + 1.5}
                          r={isCurrent ? 11.5 : 10.5}
                          fill="#000000"
                          opacity="0.5"
                        />

                        <circle
                          cx={cx}
                          cy={cy}
                          r={isCurrent ? 11.5 : 10.5}
                          fill={isCurrent ? 'url(#beadActiveGrad)' : isDone ? 'url(#beadGoldGrad)' : 'url(#beadDarkGrad)'}
                          filter={isCurrent || isDone ? 'url(#goldGlow)' : undefined}
                          className="transition-all duration-200"
                          stroke={isCurrent ? '#ffffff' : isDone ? '#fef08a' : '#14532d'}
                          strokeWidth={isCurrent ? '1.5' : '0.8'}
                        />

                        <circle
                          cx={cx - (isCurrent ? 2.5 : 2)}
                          cy={cy - (isCurrent ? 2.5 : 2)}
                          r={isCurrent ? 2.2 : 1.6}
                          fill="#ffffff"
                          opacity={isCurrent ? 0.95 : isDone ? 0.8 : 0.4}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Markaziy Hisoblagich va Tugma (tasbeh-back.png foni bilan) */}
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label={isInfinity ? `Cheksiz: ${currentCount}` : `${currentZikr.name}: ${currentCount} / 33`}
                  className={`tasbeh-count-button group absolute flex flex-col items-center justify-center rounded-full overflow-hidden transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-300 ${
                    animating ? 'scale-95 ring-accent-300 brightness-110' : 'hover:scale-[1.02]'
                  }`}
                >
                  <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(0,54,34,.92),rgba(0,21,15,.94))]" />
                  <div aria-hidden className="absolute inset-0 rounded-full ring-1 ring-inset ring-accent-400/30" />

                  {/* Ichki hisoblagich matnlari */}
                  <div className="relative z-10 flex flex-col items-center select-none px-4 text-center">
                    <span className="font-brand text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] tabular-nums">
                      {currentCount}
                    </span>
                    <span className="mt-0.5 text-xs font-semibold text-accent-300 drop-shadow flex items-center gap-1">
                      {isInfinity ? (
                        <span>/ ∞ ({t('cheksiz', 'бесконечно')})</span>
                      ) : (
                        <span>/ {currentZikr.target}</span>
                      )}
                    </span>
                    <span className="mt-2 rounded-full bg-black/40 px-3 py-0.5 text-[10px] sm:text-[11px] font-medium text-emerald-200/90 ring-1 ring-white/10 group-hover:text-accent-200">
                      {t('Bosish uchun teging', 'Нажмите чтобы считать')}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Boshqaruv tugmalari paneli */}
            <div className="tasbeh-controls flex w-full max-w-md items-center justify-between gap-3 sm:gap-4 pt-2">
              <button
                type="button"
                onClick={handleReset}
                title={t('Qayta boshlash', 'Сбросить')}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-white/[0.05] p-3 text-xs font-semibold text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-emerald-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>{t('Qayta boshlash', 'Сбросить')}</span>
              </button>

              {/* Asosiy "Zikr qilish" tugmasi */}
              <button
                type="button"
                onClick={handleIncrement}
                className="tasbeh-increment relative overflow-hidden flex-[1.5] flex items-center justify-center gap-2 rounded-2xl py-4 px-5 text-base font-bold text-white shadow-xl shadow-black/60 ring-2 ring-accent-400/60 hover:ring-accent-300 transition-all hover:brightness-110 active:scale-95"
              >
                <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-emerald-800/85 via-emerald-700/80 to-[#10b981]/80" />
                
                <span className="relative z-10 flex items-center gap-2 drop-shadow-md">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5 text-accent-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>{t('Zikr qilish', 'Считать')}</span>
                </span>
              </button>

              {/* 99 lik yakunlash yoki Cheksiz rejimda tozalash/sikllar */}
              {isInfinity ? (
                <button
                  type="button"
                  onClick={() => handleSelectMode('standard')}
                  title={t('33 lik rejimga qaytish', 'К режиму 33')}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-white/[0.05] p-3 text-xs font-semibold text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-95"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-accent-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                  <span>{t('33/99 lik rejim', 'Режим 33/99')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteCycle}
                  title={t('99 lik sikl yakunlash', 'Завершить 99')}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-white/[0.05] p-3 text-xs font-semibold text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-95"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-accent-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span>{t('99 lik yakunlash', 'Завершить 99')}</span>
                </button>
              )}
            </div>

            <p className="mt-4 text-[11px] text-emerald-200/50">
              {t('Klaviatura orqali Space (bo‘shliq) yoki Enter tugmasi bilan ham sanash mumkin.', 'Можно также считать клавишей Пробел или Enter.')}
            </p>
          </div>
        </div>

        {/* O'ng qism: Natijalar, Sozlamalar va Kunlik Maqsad Statistikasi */}
        <div className="tasbeh-side space-y-4">
          
          {/* Saqlangan umumiy hisoblar kartasi */}
          <div className="rounded-3xl bg-black/35 p-5 ring-1 ring-white/10 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-emerald-400">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                {t('Zikrlar hisobi', 'Счёт зикров')}
              </h3>
              <span className="text-xs font-semibold text-accent-300 tabular-nums">
                {isInfinity ? `∞ ${state.infinityCount}` : `${totalStandardCount} / 99`}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="stroke-emerald-950/80"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-accent-400 transition-all duration-300"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    strokeDasharray={isInfinity ? '100, 100' : `${(totalStandardCount / 99) * 100}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-lg font-bold text-white tabular-nums">
                    {isInfinity ? state.infinityCount : totalStandardCount}
                  </span>
                  <span className="block text-[9px] text-white/50">
                    {isInfinity ? 'jami' : '/ 99'}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {ZIKRS.map((z, idx) => (
                  <div key={z.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/80">{z.name}</span>
                    <span className="font-semibold text-emerald-300 tabular-nums">
                      {state.counts[idx]} / 33
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-accent-300 font-medium">{t('Cheksiz hisob', 'Бесконечный')}:</span>
                  <span className="font-bold text-accent-300 tabular-nums">
                    {state.infinityCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sozlamalar */}
          <div className="rounded-3xl bg-black/35 p-5 ring-1 ring-white/10 backdrop-blur-md space-y-3.5 shadow-lg">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/10 pb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {t('Sozlamalar', 'Настройки')}
            </h3>

            {/* Vibratsiya */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <span className="text-xs font-semibold text-white block">
                  {t('Vibratsiya', 'Вибрация')}
                </span>
                <span className="text-[11px] text-white/50 block">
                  {t('Sanash va chegaralarda tebranish', 'Вибрация при счёте')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={state.vibrate}
                onChange={(e) => setState((p) => ({ ...p, vibrate: e.target.checked }))}
                className="h-5 w-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            {/* Avtomatik keyingi zikrga o'tish (Standart rejim uchun) */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <span className="text-xs font-semibold text-white block">
                  {t('Avtomatik o‘tish', 'Автопереход')}
                </span>
                <span className="text-[11px] text-white/50 block">
                  {t('33 da keyingi zikrga o‘tish', 'Переход к следующему при 33')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={state.autoNext}
                onChange={(e) => setState((p) => ({ ...p, autoNext: e.target.checked }))}
                className="h-5 w-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            {/* Tovush effekti */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <span className="text-xs font-semibold text-white block">
                  {t('Tovush effekti', 'Звуковой щелчок')}
                </span>
                <span className="text-[11px] text-white/50 block">
                  {t('Har bir sanashda mayin klik', 'Легкий щелчок при нажатии')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={state.sound}
                onChange={(e) => setState((p) => ({ ...p, sound: e.target.checked }))}
                className="h-5 w-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* Maqsad va Statistika */}
          <div className="rounded-3xl bg-black/35 p-5 ring-1 ring-white/10 backdrop-blur-md space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-accent-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
                {t('Kunlik maqsad', 'Дневная цель')}
              </h3>
              <span className="text-xs font-semibold text-accent-300 tabular-nums">
                {goalPercentage}%
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-accent-400 transition-all duration-300"
                  style={{ width: `${goalPercentage}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
                <span>{t('Bugun jami zikr', 'Всего за день')}: <strong className="text-white">{stats.todayTotal}</strong></span>
                <span>{t('Maqsad', 'Цель')}: <strong className="text-white">{stats.dailyGoal}</strong></span>
              </div>
            </div>

            {/* Yakunlangan to'liq 99 lik sikllar soni */}
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-3 text-xs ring-1 ring-white/10">
              <span className="text-white/80">{t('To‘liq yakunlangan 99 lik sikllar', 'Завершённых циклов по 99')}:</span>
              <span className="font-bold text-accent-300 tabular-nums text-sm">
                {state.cycleCount}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
