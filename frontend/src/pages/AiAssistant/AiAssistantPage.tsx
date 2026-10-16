import { useEffect, useRef, useState } from 'react';
import { askAiStream, getAiStatus, type ChatMessage } from '../../services/aiService';

const SUGGESTIONS = [
  'Tayammum qachon bajariladi?',
  'Peshin namozi necha rakat?',
  'Qazo namozi qanday o‘qiladi?',
  'Iymonning oltita sharti nima?',
];

/** AI yordamchisi: sayt matnlari asosida qisqa javob beradi (Neon AI Gateway orqali) */
export function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAiStatus()
      .then((s) => setReady(s.configured))
      .catch(() => setReady(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => () => abortRef.current?.(), []);

  const send = (question: string) => {
    const text = question.trim();
    if (!text || busy) return;

    const history = messages;
    setMessages([...history, { role: 'user', content: text }]);
    setInput('');
    setBusy(true);
    setNotice(null);

    const answer: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...history, { role: 'user', content: text }, answer]);

    abortRef.current = askAiStream(text, history, {
      onText: (part) => {
        answer.content += part;
        setMessages([...history, { role: 'user', content: text }, { ...answer }]);
      },
      onDone: () => {
        setBusy(false);
        setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 && !m.content ? { ...m, content: 'Javob bo‘sh qaytdi.' } : m)));
      },
      onError: (err) => {
        setBusy(false);
        setMessages((prev) => prev.filter((_, i) => i !== prev.length - 1));
        setNotice(err.message);
      },
    });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col px-4 py-6 md:px-6">
      <header className="mb-4">
        <h1 className="font-display text-3xl font-extrabold text-neutral-900 dark:text-white">AI yordamchisi</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Savol bering — javob saytdagi tekshirilgan ma’lumotlar asosida, qisqa beriladi.
        </p>
      </header>

      {ready === false && (
        <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
          AI xizmati hali yoqilgan. Backend’da <code>NEON_AI_GATEWAY_TOKEN</code> va
          <code> NEON_AI_GATEWAY_BASE_URL</code> (yoki <code>AI_API_KEY</code>) berilishi kerak.
        </div>
      )}

      {notice && (
        <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30">
          {notice}
        </div>
      )}

      <div className="flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-2xl bg-white p-4 text-left text-sm font-medium text-neutral-700 shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-white/10"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-2xl bg-primary-600 px-4 py-2.5 text-sm text-white'
                  : 'max-w-[90%] rounded-2xl bg-white px-4 py-2.5 text-sm leading-relaxed text-neutral-800 shadow-sm ring-1 ring-black/5 whitespace-pre-wrap dark:bg-neutral-900 dark:text-neutral-100 dark:ring-white/10'
              }
            >
              {m.content || (busy && i === messages.length - 1 ? <TypingDots /> : '')}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 mt-4 flex items-center gap-2 bg-white/90 py-3 backdrop-blur dark:bg-neutral-900/90"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Savolingizni yozing..."
          aria-label="Savol"
          className="w-full rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-neutral-700 dark:bg-neutral-800"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          Yuborish
        </button>
      </form>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1" aria-label="Yozilmoqda">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}