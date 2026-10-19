import { TopicListPage } from '../../components/topics/TopicListPage';
import { ZAKOT_CONFIG } from '../../components/topics/config';

export function ZakotPage() {
  return <TopicListPage config={ZAKOT_CONFIG} />;
}
