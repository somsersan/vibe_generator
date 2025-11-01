/**
 * Music Generator using SUNO API
 * Генерирует музыкальный трек (припев) про профессию
 */

import { GoogleGenAI } from "@google/genai";
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import "./proxy-config"; // Настройка прокси

// Инициализация клиента Google AI
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    if (!process.env.GOOGLE_API_KEY) {
      logger.error('GOOGLE_API_KEY не найден', undefined, { context: 'getAIClient' });
      throw new Error('GOOGLE_API_KEY не найден в переменных окружения');
    }
    logger.info('Инициализация GoogleGenAI клиента для генерации музыки', { hasProxy: !!process.env.HTTP_PROXY });
    aiClient = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });
  }
  return aiClient;
}

export interface MusicGenerationResult {
  url: string;
  lyrics: string;
  title: string;
  taskId?: string;
}

/**
 * Retry функция для надежности запросов
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  operationName?: string
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error?.message || String(error);
      
      // Некоторые ошибки не стоит повторять
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('FAILED_PRECONDITION')) {
        logger.error(`Критическая ошибка API: ${errorMessage}`, error, { operation: operationName, attempt });
        throw error;
      }
      
      // Для сетевых ошибок (ECONNRESET, ETIMEDOUT) используем более быстрый fallback
      const isNetworkError = errorMessage.includes('ECONNRESET') || 
                           errorMessage.includes('ETIMEDOUT') || 
                           errorMessage.includes('ENOTFOUND') ||
                           errorMessage.includes('ECONNREFUSED');
      
      if (isNetworkError && attempt === 1) {
        // Если это первая попытка и сеть не работает, уменьшаем количество попыток до 2
        logger.warn(`Сетевая ошибка на первой попытке, уменьшаем количество попыток`, { 
          operation: operationName, 
          error: errorMessage 
        });
      }
      
      if (isLastAttempt) {
        logger.error(`Ошибка после ${maxRetries} попыток: ${errorMessage}`, error, { operation: operationName });
        throw error;
      }
      
      logger.warn(`Попытка ${attempt}/${maxRetries} не удалась`, { 
        operation: operationName, 
        error: errorMessage,
        retryIn: `${delayMs}ms`
      });
      
      // Экспоненциальная задержка
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw new Error('Unreachable');
}

/**
 * Генерация текста припева про профессию через AI
 */
async function generateChorusLyrics(
  profession: string,
  description?: string
): Promise<{ lyrics: string; title: string }> {
  const ai = getAIClient();
  
  const prompt = `Создай текст припева (4-6 строк) для песни про профессию "${profession}"${description ? ` (${description})` : ''}.

Требования:
- Текст должен быть вдохновляющим и позитивным
- Должен отражать суть профессии и её важность
- 4-6 строк, ритмичный текст для припева
- На русском языке
- Можно использовать простые рифмы

Также придумай короткое название для песни (максимум 80 символов).

Ответь ТОЛЬКО в формате JSON:
{
  "lyrics": "текст припева, каждая строка на новой строке",
  "title": "название песни"
}`;

  try {
    logger.apiCall('GoogleAI', 'generateChorusLyrics', { profession });
    
    // Используем retry логику для надежности с более коротким таймаутом
    // Для генерации текста используем только 2 попытки, так как это не критично
    const response = await withRetry(async () => {
      // Используем Promise.race для установки таймаута на запрос
      // Google GenAI SDK не поддерживает AbortSignal напрямую, поэтому используем обертку
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Таймаут запроса к Google GenAI (30 секунд)')), 30000);
      });
      
      const requestPromise = ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          temperature: 0.8,
          responseMimeType: 'application/json',
        },
      });
      
      return Promise.race([requestPromise, timeoutPromise]) as Promise<any>;
    }, 2, 2000, 'generateChorusLyrics'); // Только 2 попытки для генерации текста

    const result = JSON.parse(response.text || '{}');
    
    return {
      lyrics: result.lyrics || `Профессия ${profession} - это важно!`,
      title: result.title || `Песня про ${profession}`,
    };
  } catch (error: any) {
    logger.error('Ошибка генерации текста припева после всех попыток', error, { profession });
    // Возвращаем fallback значения с более персонализированным текстом
    const professionWords = profession.split(' ');
    const mainWord = professionWords[0] || profession;
    
    return {
      lyrics: `${mainWord} - это важно!\nТы делаешь мир лучше каждый день!\nСвоей работой помогаешь людям!\nГордись профессией своей!`,
      title: `Песня про ${profession}`,
    };
  }
}

/**
 * Генерация музыки через SUNO API
 */
async function generateMusicWithSuno(
  lyrics: string,
  title: string,
  style: string = 'Pop, Inspirational',
  onProgress?: (message: string, progress: number) => void
): Promise<{ taskId: string; streamUrl?: string; downloadUrl?: string }> {
  const SUNO_API_KEY = process.env.SUNO_API_KEY;
  
  if (!SUNO_API_KEY) {
    throw new Error('SUNO_API_KEY не найден в переменных окружения');
  }

  if (onProgress) onProgress('Отправляю запрос в SUNO API...', 20);

  // Отправляем запрос на генерацию музыки
  const requestBody = {
    customMode: true,
    instrumental: false,
    model: 'V4_5', // Используем V4_5 для лучшего качества
    prompt: lyrics, // Текст припева используется как lyrics
    style: style,
    title: title,
    callBackUrl: '', // Мы будем проверять статус вручную
    negativeTags: '',
    vocalGender: 'm' as const,
    styleWeight: 0.7,
    weirdnessConstraint: 0.6,
    audioWeight: 0.7,
  };

  try {
    logger.apiCall('SunoAPI', 'generate', { title, style });
    
    // Используем retry логику для надежности запроса к Suno API
    const response = await withRetry(async () => {
      // Создаем AbortController для таймаута
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут
      
      try {
        const res = await fetch('https://api.sunoapi.org/api/v1/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Превышено время ожидания ответа от Suno API (30 секунд)');
        }
        throw error;
      }
    }, 3, 2000, 'SunoAPI.generate');

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Suno API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.msg || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }

      if (response.status === 401 || response.status === 402) {
        throw new Error(`Suno API: Неверный API ключ или требуется оплата`);
      } else if (response.status === 429) {
        throw new Error(`Suno API: Превышен лимит запросов. Попробуйте позже.`);
      } else if (response.status === 405) {
        throw new Error(`Suno API: Превышен лимит одновременных запросов (20 запросов каждые 10 секунд)`);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (data.code !== 200 || !data.data?.taskId) {
      throw new Error(data.msg || 'Не удалось получить taskId от Suno API');
    }

    const taskId = data.data.taskId;
    logger.info('Suno API: задача создана', { taskId });

    if (onProgress) onProgress('Ожидаю генерацию музыки (30-40 секунд)...', 30);

    // Ожидаем готовности трека (проверяем статус каждые 5 секунд)
    // Stream URL доступен через 30-40 секунд, Download URL через 2-3 минуты
    let streamUrl: string | undefined;
    let downloadUrl: string | undefined;
    let attempts = 0;
    const maxAttempts = 60; // Максимум 5 минут ожидания (60 * 5 секунд)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем 5 секунд
      attempts++;

      if (onProgress) {
        onProgress(`Проверяю статус генерации... (${attempts}/${maxAttempts})`, 30 + (attempts / maxAttempts) * 60);
      }

      try {
        // Добавляем таймаут для запросов статуса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
        
        let statusResponse;
        try {
          statusResponse = await fetch(`https://api.sunoapi.org/api/v1/get/${taskId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${SUNO_API_KEY}`,
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            logger.warn('Таймаут запроса статуса Suno API', { taskId, attempt: attempts });
            continue; // Продолжаем проверку
          }
          throw error;
        }

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          
          if (statusData.code === 200 && statusData.data) {
            const taskData = statusData.data;
            
            // Проверяем наличие URL для загрузки
            // SUNO API возвращает массив с 2 треками, каждый трек может иметь video_url или audio_url
            if (Array.isArray(taskData)) {
              // Если это массив треков
              const firstTrack = taskData[0];
              if (firstTrack?.video_url || firstTrack?.audio_url) {
                downloadUrl = firstTrack.video_url || firstTrack.audio_url;
                logger.info('Suno API: трек готов', { taskId, downloadUrl });
                if (onProgress) onProgress('Музыка готова! Скачиваю...', 90);
                break;
              }
              if (firstTrack?.stream_url && !streamUrl) {
                streamUrl = firstTrack.stream_url;
                logger.info('Suno API: stream URL получен', { taskId, streamUrl });
              }
            } else if (taskData.video_url || taskData.audio_url) {
              // Если это объект с одним треком
              downloadUrl = taskData.video_url || taskData.audio_url;
              logger.info('Suno API: трек готов', { taskId, downloadUrl });
              if (onProgress) onProgress('Музыка готова! Скачиваю...', 90);
              break;
            }
            
            // Проверяем наличие stream URL (доступен раньше)
            if (taskData.stream_url && !streamUrl) {
              streamUrl = taskData.stream_url;
              logger.info('Suno API: stream URL получен', { taskId, streamUrl });
            }
          }
        }
      } catch (statusError) {
        logger.warn('Ошибка проверки статуса', { taskId, error: statusError });
        // Продолжаем проверку
      }
    }

    if (!downloadUrl && !streamUrl) {
      throw new Error('Не удалось получить URL трека. Возможно, генерация занимает больше времени.');
    }

    return {
      taskId,
      streamUrl,
      downloadUrl: downloadUrl || streamUrl,
    };
  } catch (error: any) {
    logger.error('Ошибка генерации музыки через Suno API', error, { title });
    throw error;
  }
}

/**
 * Скачивание и сохранение трека
 */
async function downloadAndSaveMusic(
  url: string,
  slug: string,
  onProgress?: (message: string, progress: number) => void
): Promise<string> {
  if (onProgress) onProgress('Скачиваю трек...', 95);

  try {
    // Используем retry логику для скачивания
    const response = await withRetry(async () => {
      // Создаем AbortController для таймаута
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 секунд таймаут для скачивания
      
      try {
        const res = await fetch(url, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Превышено время ожидания скачивания трека (60 секунд)');
        }
        throw error;
      }
    }, 3, 2000, 'downloadAndSaveMusic');
    
    if (!response.ok) {
      throw new Error(`Ошибка скачивания трека: ${response.status}`);
    }

    const musicDir = path.join(process.cwd(), 'public', 'generated', slug, 'music');
    
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
    }

    const filename = 'chorus.mp3';
    const filepath = path.join(musicDir, filename);
    
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    
    const relativePath = `/generated/${slug}/music/${filename}`;
    
    logger.info('Музыка сохранена', { slug, path: relativePath });
    
    if (onProgress) onProgress('Музыка сохранена ✅', 100);
    
    return relativePath;
  } catch (error: any) {
    logger.error('Ошибка скачивания и сохранения музыки', error, { url, slug });
    throw error;
  }
}

/**
 * Основная функция генерации музыки для профессии
 */
export async function generateProfessionMusic(
  slug: string,
  profession: string,
  description?: string,
  onProgress?: (message: string, progress: number) => void
): Promise<MusicGenerationResult> {
  const startTime = Date.now();
  logger.trace('generateProfessionMusic', { slug, profession });

  try {
    // Проверяем, не существует ли уже музыка
    const musicPath = `/generated/${slug}/music/chorus.mp3`;
    const fullPath = path.join(process.cwd(), 'public', musicPath);
    
    if (fs.existsSync(fullPath)) {
      logger.info('Музыка уже существует, используем существующую', { slug });
      if (onProgress) onProgress('Музыка уже готова ✅', 100);
      
      // Читаем текст припева из кеша если есть
      const lyricsCachePath = path.join(process.cwd(), 'public', 'generated', slug, 'music', 'lyrics.json');
      let lyrics = `Профессия ${profession} - это важно!`;
      let title = `Песня про ${profession}`;
      
      if (fs.existsSync(lyricsCachePath)) {
        try {
          const cached = JSON.parse(fs.readFileSync(lyricsCachePath, 'utf-8'));
          lyrics = cached.lyrics || lyrics;
          title = cached.title || title;
        } catch (e) {
          // Игнорируем ошибки чтения кеша
        }
      }
      
      return {
        url: musicPath,
        lyrics,
        title,
      };
    }

    if (onProgress) onProgress('Генерирую текст припева...', 10);

    // 1. Генерируем текст припева
    const { lyrics, title } = await generateChorusLyrics(profession, description);

    // 2. Генерируем музыку через SUNO API
    const style = 'Pop, Inspirational, Motivating';
    const { downloadUrl } = await generateMusicWithSuno(
      lyrics,
      title,
      style,
      onProgress
    );

    if (!downloadUrl) {
      throw new Error('Не удалось получить URL для скачивания трека');
    }

    // 3. Скачиваем и сохраняем трек
    const musicUrl = await downloadAndSaveMusic(downloadUrl, slug, onProgress);

    // 4. Сохраняем текст припева в кеш
    const lyricsCachePath = path.join(process.cwd(), 'public', 'generated', slug, 'music', 'lyrics.json');
    fs.writeFileSync(lyricsCachePath, JSON.stringify({ lyrics, title }, null, 2), 'utf-8');

    const duration = Date.now() - startTime;
    logger.performance('generateProfessionMusic', duration, { slug, profession });
    logger.traceEnd('generateProfessionMusic', { success: true }, duration);

    return {
      url: musicUrl,
      lyrics,
      title,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Ошибка генерации музыки для профессии', error, { slug, profession });
    logger.traceEnd('generateProfessionMusic', { success: false }, duration);
    throw error;
  }
}

/**
 * Проверка наличия готовой музыки
 */
export async function checkCachedMusic(slug: string): Promise<boolean> {
  const musicPath = path.join(process.cwd(), 'public', 'generated', slug, 'music', 'chorus.mp3');
  return fs.existsSync(musicPath);
}

