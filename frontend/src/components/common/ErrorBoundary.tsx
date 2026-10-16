import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Xato ekrani: "Qayta urinish" bilan sahifani qayta yuklaydi */
export function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-extrabold text-neutral-900 dark:text-white">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{message}</p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Qayta yuklash
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
        >
          Orqaga
        </button>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Butun ilovani ushlab turadi — bitta sahifa xotasi brauzerni bo'sh qoldirmaydi */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Xato:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorScreen
        title="Nimadir noto'g'ri ketdi"
        message="Sahifani yuklashda xatolik yuz berdi. Sahifani yangilab ko'ring yoki bosh sahifaga o'ting."
      />
    );
  }
}