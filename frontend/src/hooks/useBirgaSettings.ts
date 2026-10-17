import { useEffect, useState } from 'react';
import type { BirgaSettings, BirgaSettingsSchema } from '../types/birga';

const KEY = 'iymon-birga-settings';

function load(schema: BirgaSettingsSchema): BirgaSettings {
  const defaults = schema.defaults;
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Partial<BirgaSettings>;
    const merged = { ...defaults, ...saved };
    if (!(merged.speed in schema.speeds)) merged.speed = defaults.speed;
    if (!(merged.sensitivity in schema.sensitivity)) merged.sensitivity = defaults.sensitivity;
    const { min, max } = schema.fallback_seconds;
    merged.fallback = Math.min(max, Math.max(min, Number(merged.fallback) || defaults.fallback));
    return merged;
  } catch {
    return defaults;
  }
}

/** Namoz rejimi sozlamalari — faqat shu brauzerda saqlanadi */
export function useBirgaSettings(schema: BirgaSettingsSchema) {
  const [settings, setSettings] = useState<BirgaSettings>(() => load(schema));

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* saqlab bo'lmasa ham ishlaydi */
    }
  }, [settings]);

  const update = <K extends keyof BirgaSettings>(key: K, value: BirgaSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  return { settings, update };
}
