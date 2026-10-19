import { TopicListPage } from '../../components/topics/TopicListPage';
import { ROZA_CONFIG } from '../../components/topics/config';
import { SaharIftor } from '../../components/roza/SaharIftor';
import { RozaDuas } from '../../components/roza/RozaDuas';

export function RozaPage() {
  return (
    <TopicListPage config={ROZA_CONFIG}>
      <SaharIftor />
      <RozaDuas />
    </TopicListPage>
  );
}
