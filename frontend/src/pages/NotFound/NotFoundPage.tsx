import { ErrorPage } from '../../components/common/ErrorPage';
import { useT } from '../../i18n';

/** Topilmagan manzil uchun to'liq ekranli sahifa (layout'siz) */
export function NotFoundPage() {
  const t = useT();
  return (
    <ErrorPage
      code={404}
      title={t('Sahifa topilmadi', 'Страница не найдена')}
      message={t('Siz izlagan sahifa ko‘chirilgan yoki o‘chirilgan bo‘lishi mumkin. Manzilni tekshiring yoki bosh sahifaga qayting.', 'Страница, которую вы ищете, была перемещена или удалена. Проверьте адрес или вернитесь на главную.')}
    />
  );
}
