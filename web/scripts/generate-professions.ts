import { GoogleGenAI, Type } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Загружаем переменные окружения из .env.local
dotenv.config({ path: '.env.local' });

// Настройка прокси (импортируем после dotenv, чтобы переменные окружения были доступны)
import "../lib/proxy-config";

// Единый клиент для Gemini + Imagen
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});

// Парсим аргументы командной строки
const args = process.argv.slice(2);
const WITH_AUDIO = args.includes('--with-audio') || args.includes('--audio');

// Список профессий для генерации (3 штуки по требованиям хакатона)
const professions = [
  { name: "DevOps Engineer", level: "Middle", company: "стартап" },
  { name: "Frontend Developer", level: "Junior", company: "стартап" },
  { name: "Бариста", level: "Junior", company: "кофейня" }, // не-IT
];

// Retry функция для надежности
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      
      if (isLastAttempt) {
        throw error;
      }
      
      console.log(`    ⚠️  Попытка ${attempt} не удалась: ${error.message}`);
      console.log(`    🔄 Повторяю через ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Unreachable');
}

async function generateProfessionData(profession: string, level: string, company: string) {
  console.log(`  Генерирую текстовый контент...`);

  const prompt = `
Создай детальную карточку профессии для "${profession}" уровня ${level} в ${company}.

ВАЖНЫЕ ТРЕБОВАНИЯ:
- schedule: ровно 6 событий за рабочий день (с 10:00 до 18:00)
  * Для КАЖДОГО события создай audioPrompt - детальный промпт для генерации ASMR-звука
  * audioPrompt должен быть на английском языке для ElevenLabs API
  * audioPrompt должен описывать приятные, расслабляющие звуки этого момента (ASMR-стиль)
  * Включи в audioPrompt: конкретные звуки инструментов, голоса, фоновую атмосферу
  * Примеры качественных промптов:
    - "Pleasant ASMR coffee shop morning: espresso machine steaming milk, gentle cups clinking, soft friendly barista voice, warm cozy ambience, crisp spatial audio"
    - "Satisfying ASMR coding session: rhythmic mechanical keyboard typing Cherry MX switches, soft mouse clicks, gentle focused breathing, peaceful concentration, premium binaural quality"
- stack: 8-10 технологий/инструментов конкретно для этой профессии
- benefits: ровно 4 пункта с конкретными цифрами и метриками
- careerPath: ровно 4 этапа карьеры с реальными зарплатами в рублях
- skills: ровно 5 ключевых скиллов с уровнем от 40 до 90
- dialog: реалистичный диалог с коллегой/клиентом
- Всё на русском языке (кроме audioPrompt)
- Эмоционально, живо, с деталями атмосферы
- Используй разные эмодзи для каждого события в schedule
- В description используй цитаты или короткие фразы из рабочего процесса
`;

  // Используем structured output (SOTA подход) для гарантии валидного JSON
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      profession: { type: Type.STRING },
      level: { type: Type.STRING },
      company: { type: Type.STRING },
      schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            title: { type: Type.STRING },
            emoji: { type: Type.STRING },
            description: { type: Type.STRING },
            detail: { type: Type.STRING },
            audioPrompt: { type: Type.STRING }, // Промпт для генерации звука через ElevenLabs
          },
          required: ["time", "title", "emoji", "description", "detail", "audioPrompt"],
        },
      },
      stack: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      benefits: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            icon: { type: Type.STRING },
            text: { type: Type.STRING },
          },
          required: ["icon", "text"],
        },
      },
      careerPath: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.STRING },
            years: { type: Type.STRING },
            salary: { type: Type.STRING },
          },
          required: ["level", "years", "salary"],
        },
      },
      skills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            level: { type: Type.NUMBER },
          },
          required: ["name", "level"],
        },
      },
      dialog: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          response: { type: Type.STRING },
        },
        required: ["message", "options", "response"],
      },
    },
    required: ["profession", "level", "company", "schedule", "stack", "benefits", "careerPath", "skills", "dialog"],
  };

  return await withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: responseSchema, // Structured output для гарантии валидного JSON
      },
    });
    
    const jsonText = response.text || '{}';
    return JSON.parse(jsonText);
  }, 3, 2000);
}

async function generateImages(profession: string, slug: string) {
  console.log(`  Генерирую изображения...`);
  
  // Определяем, IT профессия или нет (для разных промптов)
  const isITProfession = profession.toLowerCase().includes('developer') || 
                         profession.toLowerCase().includes('devops') ||
                         profession.toLowerCase().includes('engineer') ||
                         profession.toLowerCase().includes('программист') ||
                         profession.toLowerCase().includes('разработчик');
  
  let prompts: string[];
  
  if (isITProfession) {
    // Промпты для IT: фокус на экраны, код, хаос рабочего места
    prompts = [
      // 1. Рабочий момент POV с множественными экранами
      `First-person view POV: ${profession} hands typing on mechanical keyboard, RGB backlight, dual monitors showing real code editor and terminal with commands, energy drink can, sticky notes with passwords on monitor frame, tangled cables, warm desk lamp light, 2am vibe, authentic programmer workspace chaos, ultrarealistic`,
      
      // 2. Крупный план экрана с реальной работой
      `Extreme close-up: computer screen showing authentic ${profession} work - IDE with code, terminal logs scrolling, browser with Stack Overflow tabs, Slack message notifications popping, GitHub commits, blinking cursor, slight screen glare, coffee stain on desk visible in corner, person's tired reflection in screen, dim room lighting, cinematic`,
      
      // 3. Вид сверху на реальный рабочий стол
      `Flat lay top-down: ${profession} messy workspace during active work - laptop covered with developer stickers (Linux, GitHub, etc), second monitor, mechanical keyboard, gaming mouse, smartphone showing work messages, open notebook with handwritten schemas and bugs, 3 coffee mugs, snack wrappers, USB cables everywhere, AirPods, smartwatch, afternoon natural light, authentic chaos`,
      
      // 4. Момент концентрации в ночной работе
      `Cinematic wide shot: ${profession} deep in flow state at night, wearing hoodie, side profile, face illuminated only by multiple monitor glow in dark room, messy hair, intense focused expression, can of energy drink in hand, pizza box on desk, headphones on, code visible on screens, moody cyberpunk aesthetic, realistic photography`,
    ];
  } else {
    // Промпты для не-IT профессий: фокус на реальное рабочее место, инструменты, атмосферу
    prompts = [
      // 1. Рабочий момент от первого лица
      `First-person POV: ${profession} hands actively working, professional tools in use, realistic workplace environment, customers or colleagues visible in background, natural lighting, candid authentic moment, movement and energy, real-life mess and activity`,
      
      // 2. Крупный план инструментов в процессе работы
      `Close-up shot: ${profession} professional equipment and tools being used, hands in action, detailed view of craft, authentic wear and tear on tools, workspace details, natural lighting, professional photography, realistic working conditions`,
      
      // 3. Вид сверху на рабочее пространство
      `Flat lay overhead view: ${profession} workspace during busy shift - all necessary tools laid out, work in progress, organized chaos, professional equipment, order receipts or work documents, smartphone, keys, water bottle, authentic workspace mess, natural daylight`,
      
      // 4. Атмосферный момент в разгар рабочего дня
      `Cinematic environmental shot: ${profession} in action during peak hours, dynamic movement, real customers or team around, authentic workplace atmosphere, natural expressions, busy environment, professional uniform or work attire, realistic lighting, documentary photography style, capturing the vibe and energy`,
    ];
  }
  
  console.log(`  Тип профессии: ${isITProfession ? 'IT' : 'не-IT'}`);
  console.log(`  Используем специализированные промпты для генерации атмосферных изображений`);
  

  const images = [];
  
  for (let i = 0; i < prompts.length; i++) {
    console.log(`    Изображение ${i + 1}/4...`);
    
    try {
      const imagePath = await withRetry(async () => {
        const response = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002', // Быстрая модель для хакатона
          prompt: prompts[i],
          config: {
            numberOfImages: 1,
            aspectRatio: "1:1",
          },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
          throw new Error('No images generated');
        }

        const image = response.generatedImages[0];
        if (!image.image?.imageBytes) {
          throw new Error('Image data is missing');
        }

        const imageDir = path.join(process.cwd(), 'public', 'generated', slug);
        
        if (!fs.existsSync(imageDir)) {
          fs.mkdirSync(imageDir, { recursive: true });
        }

        const filename = `image-${i + 1}.png`;
        const filepath = path.join(imageDir, filename);
        
        // Сохраняем base64 в файл
        const buffer = Buffer.from(image.image.imageBytes, 'base64');
        fs.writeFileSync(filepath, buffer);
        
        return `/generated/${slug}/${filename}`;
      }, 2, 1500); // 2 попытки для изображений (они долго генерируются)
      
      images.push(imagePath);
      console.log(`    ✓ Сохранено: image-${i + 1}.png`);
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`    ✗ Ошибка генерации изображения ${i + 1} после всех попыток:`, error.message);
      // Используем плейсхолдер если генерация не удалась
      images.push(`https://placehold.co/400x400/1e293b/9333ea?text=Image+${i + 1}`);
    }
  }

  return images;
}

async function fetchYouTubeVideos(profession: string) {
  console.log(`  Ищу видео на YouTube...`);
  
  if (!process.env.YOUTUBE_API_KEY) {
    console.log(`    ⚠ YOUTUBE_API_KEY не найден, пропускаю...`);
    return [];
  }
  
  try {
    const query = `${profession} день в профессии`;
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&q=${encodeURIComponent(query)}&` +
      `type=video&videoDuration=short&maxResults=6&` +
      `order=relevance&key=${process.env.YOUTUBE_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`    ✗ YouTube API ошибка:`, data.error.message);
      return [];
    }
    
    const videos = data.items?.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
    })) || [];
    
    console.log(`    ✓ Найдено ${videos.length} видео`);
    
    return videos;
  } catch (error: any) {
    console.error(`    ✗ Ошибка поиска видео:`, error.message);
    return [];
  }
}

async function fetchVacanciesStats(profession: string) {
  console.log(`  Получаю статистику вакансий с HH.ru...`);
  
  try {
    // Получаем топ-20 вакансий для анализа из России (area=113)
    const response = await fetch(
      `https://api.hh.ru/vacancies?text=${encodeURIComponent(profession)}&per_page=20&order_by=relevance&area=113`
    );
    const data = await response.json();
    
    const found = data.found || 0;
    const competition = found > 1000 ? 'высокая' : 
                       found > 500 ? 'средняя' : 'низкая';
    
    // Парсим зарплаты и компании
    const salaries: number[] = [];
    const companies: string[] = [];
    
    data.items?.forEach((vacancy: any) => {
      // Обрабатываем только вакансии с зарплатой в рублях (RUR)
      if (vacancy.salary && vacancy.salary.currency === 'RUR') {
        const from = vacancy.salary.from;
        const to = vacancy.salary.to;
        
        // Вычисляем среднее значение для вакансии
        if (from && to) {
          // Если указаны оба значения, берем среднее
          salaries.push((from + to) / 2);
        } else if (from) {
          // Если только "от", используем его
          salaries.push(from);
        } else if (to) {
          // Если только "до", используем его
          salaries.push(to);
        }
      }
      
      if (vacancy.employer?.name) {
        companies.push(vacancy.employer.name);
      }
    });
    
    // Средняя зарплата (округляем до тысяч)
    const avgSalary = salaries.length > 0 
      ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length / 1000) * 1000
      : null;
    
    // Топ компании (уникальные, первые 5)
    const topCompanies = [...new Set(companies)].slice(0, 5);
    
    console.log(`    ✓ Найдено вакансий: ${found}`);
    if (avgSalary) {
      console.log(`    ✓ Средняя зарплата: ${avgSalary.toLocaleString('ru-RU')} ₽ (на основе ${salaries.length} вакансий с указанной зарплатой)`);
    } else {
      console.log(`    ⚠ Средняя зарплата: не указана в вакансиях`);
    }
    if (topCompanies.length > 0) {
      console.log(`    ✓ Топ компании: ${topCompanies.slice(0, 3).join(', ')}`);
    }
    
    return {
      vacancies: found,
      competition,
      avgSalary,
      topCompanies,
    };
  } catch (error: any) {
    console.error(`    ✗ Ошибка получения вакансий:`, error.message);
    return {
      vacancies: 0,
      competition: 'неизвестно',
      avgSalary: null,
      topCompanies: [],
    };
  }
}

// Генерация звуков через ElevenLabs API (опционально)
async function generateAudio(slug: string, schedule: any[]) {
  console.log(`  🎧 Генерирую звуковые эффекты для ${schedule.length} событий...`);
  
  if (!process.env.ELEVENLABS_API_KEY) {
    console.log(`    ⚠ ELEVENLABS_API_KEY не найден, пропускаю генерацию звуков`);
    console.log(`    💡 Добавьте ELEVENLABS_API_KEY в .env.local для генерации звуков`);
    return null;
  }
  
  try {
    // Импортируем audio-generator динамически
    const { generateSoundEffect, saveSoundToFile } = await import('../lib/audio-generator');
    
    const timelineSounds: Array<{ id: string; timeSlot: string; url: string }> = [];
    
    // Генерируем звуки используя промпты из LLM
    for (let i = 0; i < schedule.length; i++) {
      const scheduleItem = schedule[i];
      const soundId = `timeline-${scheduleItem.time.replace(':', '-')}`;
      
      console.log(`    Генерирую звук ${i + 1}/${schedule.length}: ${scheduleItem.title}...`);
      
      try {
        // Используем промпт, сгенерированный LLM
        const audioBlob = await generateSoundEffect(
          scheduleItem.audioPrompt || `Pleasant ambient sound for ${scheduleItem.title}`,
          10, // duration
          false
        );
        
        const url = await saveSoundToFile(audioBlob, slug, soundId);
        timelineSounds.push({ id: soundId, timeSlot: scheduleItem.time, url });
        
        console.log(`    ✓ ${scheduleItem.time} - ${scheduleItem.title}`);
        
        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`    ✗ Ошибка: ${scheduleItem.time} - ${scheduleItem.title}:`, error.message);
      }
    }
    
    console.log(`    ✓ Звуки сгенерированы: ${timelineSounds.length} звуков для timeline`);
    
    return { timelineSounds };
  } catch (error: any) {
    console.error(`    ✗ Ошибка генерации звуков:`, error.message);
    return null;
  }
}

// Функция транслитерации для slug
function transliterate(text: string): string {
  const translitMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  
  return text
    .toLowerCase()
    .split('')
    .map(char => translitMap[char] || char)
    .join('')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

// Генерация одной профессии
async function generateOneProfession(
  prof: { name: string; level: string; company: string },
  index: number,
  total: number,
  dataDir: string
) {
  const startTime = Date.now();
  console.log(`\n[${index + 1}/${total}] 📝 ${prof.name} (${prof.level} в ${prof.company})`);
  console.log('─'.repeat(60));
  
  try {
    // 1. Генерация текстового контента через Gemini
    const data = await generateProfessionData(prof.name, prof.level, prof.company);
    
    // Создаем slug
    const slug = transliterate(prof.name);
    
    // 2-4. Параллельная генерация изображений, статистики и видео
    console.log(`  🚀 Запускаю параллельную генерацию контента...`);
    const [images, vacanciesStats, videos] = await Promise.all([
      generateImages(prof.name, slug),
      fetchVacanciesStats(prof.name),
      fetchYouTubeVideos(prof.name),
    ]);
    
    // 5. Генерация звуков (если указан флаг --with-audio)
    let audioData: any = null;
    if (WITH_AUDIO) {
      audioData = await generateAudio(slug, data.schedule);
      
      // Привязываем звуки к событиям schedule по индексу
      if (audioData && audioData.timelineSounds) {
        data.schedule = data.schedule.map((scheduleItem: any, index: number) => {
          const sound = audioData.timelineSounds[index];
          
          if (sound) {
            return {
              ...scheduleItem,
              soundId: sound.id,
            };
          }
          
          return scheduleItem;
        });
        
        console.log(`  🎧 Привязал ${audioData.timelineSounds.length} звуков к событиям schedule`);
      }
    }
    
    // 6. Объединяем всё в один объект
    const fullData = {
      ...data,
      slug,
      images,
      ...vacanciesStats,
      videos,
      ...(audioData ? { audio: audioData } : {}),
      generatedAt: new Date().toISOString(),
    };

    // 6. Сохраняем в JSON файл
    const filepath = path.join(dataDir, `${slug}.json`);
    fs.writeFileSync(filepath, JSON.stringify(fullData, null, 2), 'utf-8');
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ Сохранено: data/professions/${slug}.json (${elapsed}s)`);
    
    return { slug, profession: prof.name, success: true };
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`  ❌ ОШИБКА для ${prof.name} после ${elapsed}s:`, error.message);
    return { slug: '', profession: prof.name, success: false, error: error.message };
  }
}

async function generateAll() {
  const startTime = Date.now();
  
  console.log('\n🚀 Начинаем ПАРАЛЛЕЛЬНУЮ генерацию профессий...\n');
  console.log(`Всего профессий: ${professions.length}`);
  console.log(`Режим: все профессии генерируются одновременно`);
  console.log(`Генерация звуков: ${WITH_AUDIO ? '✓ ВКЛЮЧЕНА (--with-audio)' : '✗ Выключена (добавьте --with-audio)'}\n`);
  
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ ОШИБКА: Не найден GOOGLE_API_KEY в .env.local');
    console.error('   Создай файл .env.local и добавь: GOOGLE_API_KEY=твой_ключ');
    process.exit(1);
  }
  
  const dataDir = path.join(process.cwd(), 'data', 'professions');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Параллельная генерация всех профессий
  const results = await Promise.allSettled(
    professions.map((prof, index) => 
      generateOneProfession(prof, index, professions.length, dataDir)
    )
  );
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(70));
  console.log(`🎉 ГЕНЕРАЦИЯ ЗАВЕРШЕНА за ${totalTime}s!\n`);
  
  console.log('Результаты:');
  const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.success);
  const failedResults = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      console.log(`  ✅ ${result.value.profession} → data/professions/${result.value.slug}.json`);
    } else if (result.status === 'fulfilled') {
      console.log(`  ❌ ${result.value.profession} → ОШИБКА: ${result.value.error}`);
    } else {
      console.log(`  ❌ ${professions[index].name} → ОШИБКА: ${result.reason}`);
    }
  });
  
  console.log(`\nУспешно: ${successfulResults.length}/${results.length}`);
  console.log(`⚡ Средняя скорость: ${(parseFloat(totalTime) / professions.length).toFixed(1)}s на профессию`);
  
  if (successfulResults.length > 0) {
    console.log('\n💡 Теперь можно запустить: npm run dev');
    
    if (!WITH_AUDIO) {
      console.log('\n🎧 Хотите добавить звуковые эффекты?');
      console.log('   Запустите: npm run generate -- --with-audio');
      console.log('   (Требуется ELEVENLABS_API_KEY в .env.local)');
    }
  }
}

generateAll().catch(console.error);

