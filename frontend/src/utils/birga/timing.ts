import type { BirgaSession, BirgaSettings, Stage } from '../../types/birga';
import { expectedSeconds } from './engine';
import { stageRecitation, type ZamChoice } from '../../components/birga/shared';

export const stageKey = (stage: Stage, session: BirgaSession, zam: ZamChoice) =>
  stage.zam ? `recitation:${stageRecitation(stage, session, zam)?.slug ?? 'zam'}` :
  stage.recitation ? `recitation:${stage.recitation}` :
  `stage:${stage.title}`;

export function stageSeconds(stage: Stage, session: BirgaSession, zam: ZamChoice, settings: BirgaSettings): number {
  const key = stageKey(stage, session, zam);
  const custom = settings.durations?.[key];
  if (settings.speed === 'shaxsiy' && typeof custom === 'number' && Number.isFinite(custom) && custom >= 1 && custom <= 3600) return custom;
  const rec = stageRecitation(stage, session, zam);
  if (stage.recitation === 'sano') return settings.speed === 'sekin' ? 9 : settings.speed === 'tez' ? 5 : 7;
  return expectedSeconds(stage, rec?.transliteration ?? '', { ...settings, speed: settings.speed === 'shaxsiy' ? 'ortacha' : settings.speed }, session.settings);
}

export function totalSeconds(session: BirgaSession, zam: ZamChoice, settings: BirgaSettings): number {
  return session.stages.reduce((sum, stage) => sum + stageSeconds(stage, session, zam, settings), 0);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
