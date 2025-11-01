/**
 * Утилита для настройки прокси-сервера для HTTP/HTTPS запросов
 * Используется библиотекой @google/genai через https-proxy-agent и глобальный fetch
 */

import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

let proxyConfigured = false;

/**
 * Настраивает прокси-сервер из переменных окружения или параметров
 * Устанавливает глобальный fetch с прокси для работы с Google GenAI SDK
 */
export function setupProxy(): void {
  // Проверяем, уже ли настроен прокси
  if (proxyConfigured) {
    return;
  }

  // Получаем данные прокси из переменных окружения или используем значения по умолчанию
  const proxyUrl = process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://user325386:6qea5s@195.64.117.160:7591';

  if (proxyUrl) {
    // Устанавливаем переменные окружения для прокси
    process.env.HTTP_PROXY = proxyUrl;
    process.env.HTTPS_PROXY = proxyUrl;
    process.env.http_proxy = proxyUrl; // Некоторые библиотеки используют lowercase
    process.env.https_proxy = proxyUrl;
    process.env.NO_PROXY = process.env.NO_PROXY || ''; // Для локальных запросов

    // Создаем прокси агент
    const agent = new HttpsProxyAgent(proxyUrl);

    // Сохраняем оригинальный fetch, если он еще не был переопределен
    if (!(global as any).__originalFetch) {
      (global as any).__originalFetch = global.fetch;
    }

    // Устанавливаем глобальный fetch с прокси для работы Google GenAI SDK
    // Google GenAI SDK использует глобальный fetch, поэтому переопределяем его
    // @ts-ignore - hackathon build fix
    global.fetch = async (url: any, init?: RequestInit) => {
      return fetch(url as string, {
        ...init,
        // @ts-ignore - node-fetch поддерживает agent
        agent,
      } as any);
    };

    proxyConfigured = true;

    const maskedUrl = proxyUrl.replace(/:[^:@]+@/, ':****@');
    console.log('✅ Прокси-сервер настроен:', maskedUrl);
    console.log('📍 Переменные окружения:', {
      HTTP_PROXY: process.env.HTTP_PROXY ? 'установлена' : 'не установлена',
      HTTPS_PROXY: process.env.HTTPS_PROXY ? 'установлена' : 'не установлена',
      http_proxy: process.env.http_proxy ? 'установлена' : 'не установлена',
      https_proxy: process.env.https_proxy ? 'установлена' : 'не установлена',
    });
    console.log('🌐 Глобальный fetch переопределен для использования прокси');
  } else {
    console.warn('⚠️ Прокси URL не указан');
  }
}

// Автоматически настраиваем прокси при импорте модуля
setupProxy();

