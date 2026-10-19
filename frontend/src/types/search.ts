import type { TopicCategory, TopicIcon } from './namoz';

/** Backend: apps/namoz/search.py */
export interface SearchResult {
  type: 'topic' | 'section';
  category: TopicCategory;
  slug: string;
  number: number;
  icon: TopicIcon;
  topic_title: string;
  title: string;
  snippet: string;
  /** Bo'lim natijasi uchun — sahifadagi #bolim-<id> langari */
  section_id: number | null;
  score: number;
}

export interface SearchResponse {
  query: string;
  /** Normallashtirilgan so'zlar (ajratib ko'rsatish uchun) */
  terms: string[];
  count?: number;
  results: SearchResult[];
}
