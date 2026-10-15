import { useOutletContext } from 'react-router-dom';

interface LayoutContext {
  region: string;
  setRegion: (region: string) => void;
}

/** MainLayout'dan keladigan region (hudud) kontekstini olish */
export function useLayoutRegion(): string {
  return useOutletContext<LayoutContext>().region;
}

/** Hududni sahifa ichidan o'zgartirish (header'dagi tanlov bilan sinxron) */
export function useSetLayoutRegion(): (region: string) => void {
  return useOutletContext<LayoutContext>().setRegion;
}
