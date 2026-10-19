import { ApiError, apiError, apiGet } from './api';
import type { NamozTopic, NamozTopicDetail, TopicCategory as Category } from '../types/namoz';

/** Bo'lim mavzulari ro'yxati: /api/<category>/topics/ */
export function getTopics(category: Category): Promise<NamozTopic[]> {
  return apiGet<NamozTopic[]>(`/${category}/topics/`);
}

/** Bitta mavzu va uning tekshirilgan bo'limlari */
export async function getTopic(category: Category, slug: string): Promise<NamozTopicDetail> {
  try {
    return await apiGet<NamozTopicDetail>(`/${category}/topics/${encodeURIComponent(slug)}/`);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'http_404') {
      throw apiError('Bunday mavzu topilmadi.', 'not_found');
    }
    throw err;
  }
}
