import { useEffect, useRef, useState } from 'react';
import type { BirgaSession } from '../../types/birga';
import { useBirgaSettings } from '../../hooks/useBirgaSettings';
import { useFullscreen } from '../../hooks/useScreenControls';
import { cacheSessionOffline } from '../../services/birgaService';
import { BirgaSetup } from './BirgaSetup';
import { BirgaLive, type SessionStats } from './BirgaLive';
import { BirgaFinish } from './BirgaFinish';
import type { Gender } from './shared';

type Phase = 'setup' | 'live' | 'done';

interface Props {
  session: BirgaSession & { offline?: boolean };
  initialGender: Gender;
  initialZam: string;
  onExit: () => void;
  onPart: (index: number) => void;
  partLoading: boolean;
  partError: boolean;
}

/** «Birga o'qish» — sozlash → namoz davomida vizual yordamchi → yakun */
export function BirgaOqish({ session, initialGender, initialZam, onExit, onPart, partLoading, partError }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const fullscreen = useFullscreen(rootRef);
  const { settings, update } = useBirgaSettings(session.settings);
  const [phase, setPhase] = useState<Phase>('setup');
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [gender, setGender] = useState<Gender>(initialGender);
  const [zam, setZam] = useState(() => (session.zam_suras.includes(initialZam) ? initialZam : session.zam_suras[0] ?? ''));

  useEffect(() => {
    if (settings.offline && !session.offline) cacheSessionOffline(session);
  }, [session, settings.offline]);

  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [phase]);

  const start = () => {
    // Telefonda to'liq ekran (foydalanuvchi bosgan paytda so'ralishi shart)
    if (fullscreen.supported && window.matchMedia('(max-width: 1023px)').matches) fullscreen.toggle();
    setPhase('live');
  };

  const exit = () => {
    fullscreen.exit();
    onExit();
  };

  return (
    <section
      ref={rootRef}
      aria-label="Birga o‘qish"
      className={`scroll-mt-20 overflow-hidden bg-gradient-to-br from-[#06180e] via-[#040d08] to-black text-white ring-1 ring-emerald-500/25 ${
        fullscreen.isFullscreen ? 'flex h-[100dvh] flex-col pb-[env(safe-area-inset-bottom)]' : 'flex flex-col rounded-3xl shadow-xl'
      } ${phase === 'live' && !fullscreen.isFullscreen ? 'min-h-[calc(100dvh-7rem)]' : ''}`}
      style={settings.night ? { filter: 'brightness(0.72) sepia(0.15)' } : undefined}
    >
      {phase === 'setup' && (
        <BirgaSetup
          session={session}
          settings={settings}
          update={update}
          zam={zam}
          onZam={setZam}
          gender={gender}
          onGender={setGender}
          offline={!!session.offline}
          onPart={onPart}
          partLoading={partLoading}
          partError={partError}
          onStart={start}
          onExit={exit}
        />
      )}
      {phase === 'live' && (
        <BirgaLive
          session={session}
          settings={settings}
          zam={zam}
          gender={gender}
          fullscreen={fullscreen}
          onExit={() => { fullscreen.exit(); setPhase('setup'); }}
          onFinish={(s) => { setStats(s); fullscreen.exit(); setPhase('done'); }}
        />
      )}
      {phase === 'done' && stats && (
        <BirgaFinish name={session.category.name} partLabel={session.parts.find((p) => p.index === session.part)?.label} stats={stats} onAgain={() => setPhase('setup')} onExit={exit} />
      )}
    </section>
  );
}
