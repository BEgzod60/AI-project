import { TopicListPage } from '../../components/topics/TopicListPage';
import { IYMON_CONFIG } from '../../components/topics/config';

export function IymonPage() {
  return <TopicListPage config={IYMON_CONFIG} />;
}
