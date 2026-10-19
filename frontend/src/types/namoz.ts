/** Namoz bo'limi — backend apps/namoz serializerlari formati */

export type TopicIcon =
  | 'droplet' | 'waves' | 'hands_water' | 'earth' | 'mosque' | 'book'
  | 'dua' | 'clock' | 'layers' | 'moon' | 'sajda' | 'lantern'
  // Iymon bo'limi
  | 'scroll' | 'heart' | 'star8' | 'wings' | 'pillars' | 'horizon'
  | 'hourglass' | 'sprout' | 'shield' | 'people' | 'scale'
  // Zakot bo'limi
  | 'hand_coin' | 'sheep' | 'coins' | 'banknote' | 'store' | 'ring' | 'gem';

/** Mavzuli bo'limlar: /api/<category>/topics/ */
export type TopicCategory = 'namoz' | 'iymon' | 'zakot' | 'roza';

export type TopicTheme = 'emerald' | 'cream' | 'forest' | 'gold' | 'teal' | 'sand';

export interface NamozTopic {
  number: number;
  slug: string;
  title: string;
  summary: string;
  icon: TopicIcon;
  theme: TopicTheme;
  /** Kartochka rasmi (bo'sh bo'lishi mumkin), masalan /images/namoz/01.jpg */
  image: string;
  /** Kamida bitta tekshirilgan, manbali bo'lim bormi */
  has_content: boolean;
}

export interface SourceReference {
  title: string;
  author: string;
  reference: string;
  url: string;
}

export interface TopicSection {
  id: number;
  title: string;
  kind: 'text' | 'steps' | 'cards' | 'note';
  body: string;
  /** Manbadan olingan formatlangan matn — backendda tozalangan (nh3) HTML */
  content_html: string;
  items: { title: string; body: string }[];
  sources: SourceReference[];
  reviewed_by: string;
  reviewed_at: string | null;
}

export interface TopicNeighbour {
  number: number;
  slug: string;
  title: string;
}

export interface NamozTopicDetail extends Omit<NamozTopic, 'has_content'> {
  sections: TopicSection[];
  /** Hali chop etilmagan bo'limlar soni */
  awaiting_review: number;
  previous: TopicNeighbour | null;
  next: TopicNeighbour | null;
}
