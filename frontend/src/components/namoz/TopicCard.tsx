import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '../common/Icons';
import { TopicIconSvg } from './NamozIcons';
import { imageBackground, themeOf, topicNumber } from './topicThemes';
import type { NamozTopic } from '../../types/namoz';

/** Islomiy arka shaklidagi bezak chizig'i */
function ArchOutline({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 160" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className={className}>
      <path d="M10 160V70C10 40 40 22 60 6c20 16 50 34 50 64v90" />
      <path d="M24 160V74c0-22 22-37 36-50 14 13 36 28 36 50v86" />
    </svg>
  );
}

export function TopicCard({ topic, basePath = '/namoz' }: { topic: NamozTopic; basePath?: string }) {
  const t = themeOf(topic.theme);

  return (
    <Link
      to={`${basePath}/${topic.slug}`}
      className={`group relative flex h-full min-h-[240px] flex-col overflow-hidden rounded-3xl p-6 shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${t.card}`}
    >
      {topic.image ? (
        /* Rasm butun kartani qoplaydi; ustida karta rangidan shaffofga o'tuvchi gradient (bitta element — chegara chizig'i yo'q) */
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: imageBackground(t.fadeRgb, topic.image) }}
        />
      ) : (
        <>
          {/* Bezaklar: arka va mavzu ikonkasi */}
          <ArchOutline className={`pointer-events-none absolute -right-4 top-6 h-44 w-32 ${t.watermark}`} />
          <TopicIconSvg
            icon={topic.icon}
            className={`pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 ${t.watermark}`}
          />
        </>
      )}

      <div className="relative flex items-start justify-between gap-3">
        <span className={`font-display text-lg font-bold tabular-nums ${t.number}`}>{topicNumber(topic.number)}</span>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.iconBadge}`}>
          <TopicIconSvg icon={topic.icon} />
        </span>
      </div>

      <h3 className={`relative mt-3 font-display text-xl font-bold leading-snug ${topic.image ? 'max-w-[62%]' : 'max-w-[85%]'}`}>{topic.title}</h3>
      <p className={`relative mt-2 text-sm leading-relaxed ${topic.image ? 'max-w-[58%]' : 'max-w-[90%]'} ${t.summary}`}>{topic.summary}</p>

      <div className="relative mt-auto flex flex-wrap items-center gap-3 pt-5">
        <span className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${t.button}`}>
          Batafsil
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
        {!topic.has_content && (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.badge}`}>Tekshiruvda</span>
        )}
      </div>
    </Link>
  );
}
