import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/Home/HomePage';
import { Loading } from './components/common/Loading';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';
import { LangProvider, useT } from './i18n';

// Sahifalar alohida yuklanadi: bosh sahifada faqat kerakli JS yuklanadi
const NamozPage = lazy(() => import('./pages/Namoz/NamozPage').then((m) => ({ default: m.NamozPage })));
const NamozTopicPage = lazy(() => import('./pages/Namoz/NamozTopicPage').then((m) => ({ default: m.NamozTopicPage })));
const PrayerTimesPage = lazy(() => import('./pages/PrayerTimes/PrayerTimesPage').then((m) => ({ default: m.PrayerTimesPage })));
const IymonPage = lazy(() => import('./pages/Iymon/IymonPage').then((m) => ({ default: m.IymonPage })));
const AboutPage = lazy(() => import('./pages/About/AboutPage').then((m) => ({ default: m.AboutPage })));
const DeveloperPage = lazy(() => import('./pages/Developer/DeveloperPage').then((m) => ({ default: m.DeveloperPage })));
const RozaPage = lazy(() => import('./pages/Roza/RozaPage').then((m) => ({ default: m.RozaPage })));
const RozaTopicPage = lazy(() => import('./pages/Roza/RozaTopicPage').then((m) => ({ default: m.RozaTopicPage })));
const ZakotPage = lazy(() => import('./pages/Zakot/ZakotPage').then((m) => ({ default: m.ZakotPage })));
const ZakotTopicPage = lazy(() => import('./pages/Zakot/ZakotTopicPage').then((m) => ({ default: m.ZakotTopicPage })));
const IymonTopicPage = lazy(() => import('./pages/Iymon/IymonTopicPage').then((m) => ({ default: m.IymonTopicPage })));
const SearchPage = lazy(() => import('./pages/Search/SearchPage').then((m) => ({ default: m.SearchPage })));
const LearningPage = lazy(() => import('./pages/Learning/LearningPage').then((m) => ({ default: m.LearningPage })));
const SuralarPage = lazy(() => import('./pages/Suralar/SuralarPage').then((m) => ({ default: m.SuralarPage })));
const QiblaPage = lazy(() => import('./pages/Qibla/QiblaPage').then((m) => ({ default: m.QiblaPage })));
const TasbehPage = lazy(() => import('./pages/Tasbeh/TasbehPage').then((m) => ({ default: m.TasbehPage })));
const LessonPage = lazy(() => import('./pages/Learning/LessonPage').then((m) => ({ default: m.LessonPage })));

function PageLoading() {
  const t = useT();
  return <Loading label={t('Sahifa yuklanmoqda...', 'Загрузка страницы...')} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <LangProvider>
        {(lang) => (
      <BrowserRouter>
        {/* key={lang}: til almashganda sahifalar yangi tilda qayta yuklanadi */}
        <Suspense key={lang} fallback={<PageLoading />}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="namoz" element={<NamozPage />} />
              <Route path="namoz/:slug" element={<NamozTopicPage />} />
              <Route path="namoz-vaqtlari" element={<PrayerTimesPage />} />
              <Route path="iymon" element={<IymonPage />} />
              <Route path="iymon/:slug" element={<IymonTopicPage />} />
              <Route path="roza" element={<RozaPage />} />
              <Route path="roza/:slug" element={<RozaTopicPage />} />
              <Route path="zakot" element={<ZakotPage />} />
              <Route path="zakot/:slug" element={<ZakotTopicPage />} />
              <Route path="qidiruv" element={<SearchPage />} />
              <Route path="namoz-organish" element={<LearningPage />} />
              <Route path="namoz-organish/:slug" element={<LessonPage />} />
              <Route path="tasbeh" element={<TasbehPage />} />
              <Route path="qibla" element={<QiblaPage />} />
              <Route path="suralar" element={<SuralarPage />} />
              <Route path="loyiha-haqida" element={<AboutPage />} />
              <Route path="dasturchilar" element={<DeveloperPage />} />
            </Route>
            {/* Xato sahifasi — to'liq ekran, sidebar va header'siz */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
        )}
      </LangProvider>
    </ErrorBoundary>
  );
}

