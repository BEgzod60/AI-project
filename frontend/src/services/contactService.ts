import { apiPost } from './api';

export interface ContactMessage {
  name: string;
  /** Telefon, Telegram yoki email — javob berish uchun (ixtiyoriy) */
  contact: string;
  message: string;
  /** Bot-tuzoq: odam ko'rmaydi, bo'sh qolishi kerak */
  website: string;
}

/** Xabar backend orqali loyiha egasining Telegram botiga yuboriladi (token faqat serverda) */
export function sendContactMessage(data: ContactMessage): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>('/aloqa/', data);
}
