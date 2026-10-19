import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getLang } from '../../i18n';
import { ErrorPage } from './ErrorPage';

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
      <ErrorPage
        code={500}
        title={getLang() === 'ru' ? 'Что-то пошло не так' : "Nimadir noto'g'ri ketdi"}
        message={getLang() === 'ru' ? 'Не удалось загрузить страницу. Обновите её или перейдите на главную.' : "Sahifani yuklashda xatolik yuz berdi. Sahifani yangilab ko'ring yoki bosh sahifaga o'ting."}
      />
    );
  }
}