import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/Home/HomePage';
import { Loading } from './components/common/Loading';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';

// Sahifalar alohida yuklanadi: bosh sahifada faqat kerakli JS yuklanadi
const NamozPage = lazy(() => import('./pages/Namoz/NamozPage').then((m) => ({ default: m.NamozPage })));
const NamozTopicPage = lazy(() => import('./pages/Namoz/NamozTopicPage').then((m) => ({ default: m.NamozTopicPage })));
const PrayerTimesPage = lazy(() => import('./pages/PrayerTimes/PrayerTimesPage').then((m) => ({ default: m.PrayerTimesPage })));
const IymonPage = lazy(() => import('./pages/Iymon/IymonPage').then((m) => ({ default: m.IymonPage })));
const IymonTopicPage = lazy(() => import('./pages/Iymon/IymonTopicPage').then((m) => ({ default: m.IymonTopicPage })));
const SearchPage = lazy(() => import('./pages/Search/SearchPage').then((m) => ({ default: m.SearchPage })));
const LearningPage = lazy(() => import('./pages/Learning/LearningPage').then((m) => ({ default: m.LearningPage })));
const AiAssistantPage = lazy(() => import('./pages/AiAssistant/AiAssistantPage').then((m) => ({ default: m.AiAssistantPage })));
const LessonPage = lazy(() => import('./pages/Learning/LessonPage').then((m) => ({ default: m.LessonPage })));

/** Amalga oshirilgan: Bosh sahifa, Namoz, Namoz vaqtlari, Iymon, Qidiruv, Namozni o'rganish. */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<Loading label="Sahifa yuklanmoqda..." />}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="namoz" element={<NamozPage />} />
              <Route path="namoz/:slug" element={<NamozTopicPage />} />
              <Route path="namoz-vaqtlari" element={<PrayerTimesPage />} />
              <Route path="iymon" element={<IymonPage />} />
              <Route path="iymon/:slug" element={<IymonTopicPage />} />
              <Route path="qidiruv" element={<SearchPage />} />
              <Route path="ai-yordamchi" element={<AiAssistantPage />} />
              <Route path="namoz-organish" element={<LearningPage />} />
              <Route path="namoz-organish/:slug" element={<LessonPage />} />
              {/* Boshqa sahifalar (Qibla, Suralar, ...) keyingi bosqichlarda qo'shiladi */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

