import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/Home/HomePage';
import { NamozPage } from './pages/Namoz/NamozPage';
import { NamozTopicPage } from './pages/Namoz/NamozTopicPage';
import { PrayerTimesPage } from './pages/PrayerTimes/PrayerTimesPage';
import { IymonPage } from './pages/Iymon/IymonPage';
import { IymonTopicPage } from './pages/Iymon/IymonTopicPage';
import { SearchPage } from './pages/Search/SearchPage';
import { LearningPage } from './pages/Learning/LearningPage';
import { LessonPage } from './pages/Learning/LessonPage';

/** Amalga oshirilgan: Bosh sahifa, Namoz, Namoz vaqtlari va Iymon bo'limlari; boshqa sahifalar keyingi bosqichlarda. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="namoz" element={<NamozPage />} />
          <Route path="namoz/:slug" element={<NamozTopicPage />} />
          <Route path="namoz-vaqtlari" element={<PrayerTimesPage />} />
          <Route path="iymon" element={<IymonPage />} />
          <Route path="iymon/:slug" element={<IymonTopicPage />} />
          <Route path="qidiruv" element={<SearchPage />} />
          <Route path="namoz-organish" element={<LearningPage />} />
          <Route path="namoz-organish/:slug" element={<LessonPage />} />
          {/* Boshqa sahifalar (Qibla, Suralar, ...) keyingi bosqichlarda qo'shiladi */}
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
