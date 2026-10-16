import { ApiError, apiGet, apiPost } from './api';
import type { ApiErrorPayload } from '../types/prayer';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiStatus {
  configured: boolean;
  model: string;
}

export interface AiChatResponse {
  answer: string;
}

export interface AiImageResponse {
  text: string;
}

export function getAiStatus(): Promise<AiStatus> {
  return apiGet<AiStatus>('/ai/status/');
}

export function askAi(question: string, history: ChatMessage[]): Promise<AiChatResponse> {
  return apiPost<AiChatResponse>('/ai/chat/', { question, history: history.slice(-8) });
}

/** Rasmni AI bilan o'qish — tavsif va ixtiyoriy savolga javob */
export function describeImage(image: string, question = ''): Promise<AiImageResponse> {
  return apiPost<AiImageResponse>('/ai/describe-image/', { image, question });
}

/**
 * SSE orqali javobni bosqichma-bosqich oladi — foydalanuvchi javobni kutib turmaydi.
 * `onText` har bir bo'lak uchun, `onDone`/`onError` yakun uchun chaqiriladi.
 */
export function askAiStream(
  question: string,
  history: ChatMessage[],
  handlers: { onText: (text: string) => void; onDone: () => void; onError: (err: Error) => void },
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch('/api/ai/chat/stream/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: history.slice(-8) }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        const err = payload?.error as ApiErrorPayload | undefined;
        throw new ApiError(err?.message ?? 'AI javob bermadi.', err?.code ?? `http_${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') {
            handlers.onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data) as { text?: string; error?: ApiErrorPayload };
            if (parsed.text) handlers.onText(parsed.text);
            if (parsed.error) throw new ApiError(parsed.error.message, parsed.error.code);
          } catch (err) {
            if (err instanceof ApiError) {
              handlers.onError(err);
              return;
            }
          }
        }
      }
      handlers.onDone();
    } catch (err) {
      if (controller.signal.aborted) return;
      handlers.onError(err instanceof Error ? err : new Error('Noma\'lum xato'));
    }
  })();

  return () => controller.abort();
}