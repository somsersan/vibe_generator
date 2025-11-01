import { NextRequest } from 'next/server';
import { generateProfessionMusic, checkCachedMusic } from '@/lib/music-generator';
import { logger } from '@/lib/logger';

// Явно загружаем переменные окружения для API routes
if (typeof window === 'undefined') {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.join(process.cwd(), '.env.local') });
  } catch (e) {
    console.log('Note: dotenv not needed, Next.js handles env vars automatically');
  }
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  try {
    const body = await request.json();
    const { slug, profession, description } = body;

    logger.info('Generate Music API: получен запрос', { slug, profession });

    if (!slug || !profession) {
      logger.warn('Generate Music API: отсутствуют обязательные параметры', { body });
      return new Response(
        JSON.stringify({ error: 'slug и profession обязательны' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Проверяем наличие SUNO_API_KEY
    if (!process.env.SUNO_API_KEY) {
      logger.error('Generate Music API: SUNO_API_KEY не настроен');
      return new Response(
        JSON.stringify({ error: 'SUNO_API_KEY не настроен. Убедитесь, что файл .env.local содержит SUNO_API_KEY и перезапустите сервер.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Проверяем кеш
    const hasCached = await checkCachedMusic(slug);
    if (hasCached) {
      logger.info('Generate Music API: музыка найдена в кеше', { slug });
      
      // Читаем текст припева из кеша
      const fs = require('fs');
      const path = require('path');
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
      
      return new Response(
        JSON.stringify({
          url: `/generated/${slug}/music/chorus.mp3`,
          lyrics,
          title,
          cached: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Создаем ReadableStream для SSE
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (message: string, progress: number) => {
          const data = JSON.stringify({ message, progress });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        try {
          logger.info('Generate Music API: начинаем генерацию музыки', { slug });
          sendProgress('Начинаю генерацию музыки...', 0);
          
          const result = await generateProfessionMusic(
            slug,
            profession,
            description,
            sendProgress
          );

          // Отправляем финальный результат
          const finalData = JSON.stringify({
            ...result,
            cached: false,
            done: true,
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          
          controller.close();
        } catch (error: any) {
          const duration = Date.now() - requestStartTime;
          logger.error('Generate Music API: ошибка генерации музыки', error, { slug, duration });
          
          let errorMessage = 'Ошибка генерации музыки';
          if (error?.message) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          const errorData = JSON.stringify({
            error: errorMessage,
            done: true,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    const duration = Date.now() - requestStartTime;
    logger.error('Generate Music API: критическая ошибка', error, { duration });
    return new Response(
      JSON.stringify({ error: error.message || 'Внутренняя ошибка сервера' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

