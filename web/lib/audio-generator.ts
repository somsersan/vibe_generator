/**
 * Audio Generator using ElevenLabs Sound Effects API
 * Генерирует ambient звуки и sound effects для профессий
 */

export interface AudioProfile {
  profession: string;
  timelineSounds: TimelineSound[]; // Звуки для каждого этапа дня
}

export interface TimelineSound {
  id: string;
  timeSlot: string; // Время события, например "10:00" или index события
  description: string;
  prompt: string;
  duration: number;
}

/**
 * Профили звуков для разных профессий
 */
export const AUDIO_PROFILES: Record<string, AudioProfile> = {
  'frontend-developer': {
    profession: 'Frontend Developer',
    timelineSounds: [
      {
        id: 'standup-chat',
        timeSlot: '10:00',
        description: 'Утренний стендап',
        prompt: 'Pleasant ASMR office morning standup: soft friendly voices discussing tasks, gentle coffee cup being placed on table, satisfying keyboard clicks in background, warm collaborative energy, crisp clear audio with rich spatial depth, cozy productive atmosphere, ultra high quality binaural recording',
        duration: 10,
      },
      {
        id: 'code-review',
        timeSlot: '11:00',
        description: 'Ревью кода',
        prompt: 'Satisfying ASMR code review session: calm mentor voice explaining concepts, gentle mouse wheel scrolling, soft keyboard taps, thoughtful contemplative hmms, pages of code rustling, peaceful learning atmosphere, crisp detailed stereo sound, relaxing focus ambience',
        duration: 10,
      },
      {
        id: 'intensive-coding',
        timeSlot: '12:30',
        description: 'Активная работа над задачей',
        prompt: 'Ultra satisfying ASMR deep coding flow: rhythmic mechanical keyboard typing with Cherry MX blue switches, crisp tactile clicks, soft mouse movements, gentle breathing of focused developer, satisfying keystroke patterns, peaceful concentration zone, premium binaural audio quality, meditation-like productive state',
        duration: 12,
      },
      {
        id: 'lunch-break',
        timeSlot: '14:00',
        description: 'Обед',
        prompt: 'Cozy ASMR lunch break: gentle friendly laughter, pleasant conversations, soft pizza box cardboard opening, satisfying food wrapper sounds, warm social bonding, comfortable break room ambience, high quality spatial audio, relaxing camaraderie',
        duration: 10,
      },
      {
        id: 'bug-hunting',
        timeSlot: '15:00',
        description: 'Фикс багов',
        prompt: 'Intense but satisfying ASMR debugging: focused rapid typing bursts, soft frustrated exhales turning to relief, gentle browser tab clicking, victorious "aha" moment sounds, problem-solving concentration, rewarding bug-fixing atmosphere, clear crisp keystrokes',
        duration: 12,
      },
      {
        id: 'planning-session',
        timeSlot: '17:00',
        description: 'Планирование',
        prompt: 'Peaceful ASMR end-of-day planning: slow deliberate keyboard typing, satisfying paper notebook page turning, gentle pen writing on paper, calm organizing sounds, content wrap-up atmosphere, soft desk items being tidied, relaxing completion vibes, premium audio quality',
        duration: 10,
      },
    ],
  },
  
  'devops-engineer': {
    profession: 'DevOps Engineer',
    timelineSounds: [
      {
        id: 'morning-monitoring',
        timeSlot: '10:00',
        description: 'Утренний мониторинг',
        prompt: 'DevOps morning check, multiple terminal windows opening, command line typing, system logs scrolling, checking dashboards, focused monitoring atmosphere',
        duration: 8,
      },
      {
        id: 'incident-response',
        timeSlot: '11:30',
        description: 'Разбор инцидента',
        prompt: 'Urgent incident response, rapid terminal commands, alert notifications beeping, team communication on Slack, stressed but controlled problem-solving',
        duration: 10,
      },
      {
        id: 'lunch-server-room',
        timeSlot: '13:00',
        description: 'Обед в серверной',
        prompt: 'Quick lunch break near servers, continuous server fan hum, eating sounds, checking phone notifications, brief relaxation moment',
        duration: 8,
      },
      {
        id: 'deployment-process',
        timeSlot: '14:30',
        description: 'Процесс деплоя',
        prompt: 'Deployment in progress, CI/CD pipeline running, build logs streaming, occasional success notification beeps, tension and anticipation',
        duration: 10,
      },
      {
        id: 'infrastructure-config',
        timeSlot: '16:00',
        description: 'Настройка инфраструктуры',
        prompt: 'Infrastructure as code work, YAML file editing, terminal commands for Kubernetes, configuration validation, systematic technical work',
        duration: 10,
      },
      {
        id: 'evening-reports',
        timeSlot: '17:30',
        description: 'Вечерние отчёты',
        prompt: 'End of day documentation, calm typing, generating reports, final system checks, satisfied completion of tasks, wrapping up',
        duration: 8,
      },
    ],
  },
  
  'barista': {
    profession: 'Barista',
    timelineSounds: [
      {
        id: 'morning-preparation',
        timeSlot: '10:00',
        description: 'Открытие смены',
        prompt: 'Coffee shop opening routine, espresso machine warming up, steam wand hissing test, coffee beans pouring into grinder hopper, organizing cups and saucers',
        duration: 8,
      },
      {
        id: 'morning-rush',
        timeSlot: '11:30',
        description: 'Утренний поток клиентов',
        prompt: 'Busy morning coffee rush, espresso shots pulling, milk steaming continuously, cups clinking, register beeping, customers ordering, energetic cafe atmosphere',
        duration: 10,
      },
      {
        id: 'lunch-quiet',
        timeSlot: '13:00',
        description: 'Обеденный перерыв',
        prompt: 'Quiet lunch break in back room, eating sounds, distant cafe ambience, brief relaxation, phone scrolling, peaceful moment',
        duration: 6,
      },
      {
        id: 'training-session',
        timeSlot: '14:00',
        description: 'Обучение и практика',
        prompt: 'Barista training session, mentor explaining latte art, practice milk steaming, pouring technique, constructive feedback, learning atmosphere',
        duration: 8,
      },
      {
        id: 'afternoon-service',
        timeSlot: '16:00',
        description: 'Послеобеденный сервис',
        prompt: 'Afternoon cafe service, espresso machine working, dessert plates clinking, friendly customer conversations, relaxed warm atmosphere, acoustic music background',
        duration: 10,
      },
      {
        id: 'closing-cleanup',
        timeSlot: '17:30',
        description: 'Закрытие смены',
        prompt: 'End of shift cleanup, coffee machine backflushing, wiping counters, washing portafilters, organizing workspace, satisfied end of day sounds',
        duration: 8,
      },
    ],
  },
};

/**
 * Генерация звукового эффекта через ElevenLabs API
 */
export async function generateSoundEffect(
  prompt: string,
  duration?: number,
  loop: boolean = false,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_68d1e587381f00c8364ce120df0ea73d1e401a78f374752f';
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY не найден в переменных окружения');
  }
  
  if (onProgress) onProgress(10);
  
  // Настройка прокси для обхода региональных ограничений (если нужен)
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: duration || 10,
      loop: loop,
      prompt_influence: 0.7, // Balanced between literal and creative
    }),
  };
  
  // В Node.js окружении используем прокси если он настроен
  if (typeof window === 'undefined' && (process.env.HTTP_PROXY || process.env.HTTPS_PROXY)) {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      if (proxyUrl) {
        (fetchOptions as any).agent = new HttpsProxyAgent(proxyUrl);
        console.log('[Audio] Используется прокси для ElevenLabs API');
      }
    } catch (e) {
      console.warn('⚠️ Не удалось настроить прокси для ElevenLabs:', e);
    }
  }
  
  console.log(`[Audio] Генерация звука через ElevenLabs: "${prompt.substring(0, 50)}..."`);
  
  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', fetchOptions);
  
  if (!response.ok) {
    let errorText = '';
    let errorDetail: any = null;
    
    try {
      errorText = await response.text();
      errorDetail = JSON.parse(errorText);
    } catch (e) {
      // Если не удалось распарсить JSON, используем текст как есть
    }
    
    console.error(`[Audio] ElevenLabs API error ${response.status}:`, errorText);
    
    // Проверяем статус payment_issue в деталях ошибки
    const isPaymentIssue = errorDetail?.detail?.status === 'payment_issue' || 
                          errorText.includes('payment_issue') ||
                          errorText.includes('failed or incomplete payment');
    
    if (response.status === 401 || response.status === 402 || isPaymentIssue) {
      throw new Error(`ElevenLabs API: Требуется оплата подписки (payment_issue). Проверьте https://elevenlabs.io/app/subscription`);
    } else if (response.status === 429) {
      throw new Error(`ElevenLabs API: Превышен лимит запросов. Попробуйте позже.`);
    }
    
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }
  
  if (onProgress) onProgress(90);
  
  const audioBlob = await response.blob();
  
  if (onProgress) onProgress(100);
  
  console.log(`[Audio] Звук успешно сгенерирован: ${audioBlob.size} байт`);
  
  return audioBlob;
}

/**
 * Сохранение сгенерированного звука в файл
 */
export async function saveSoundToFile(
  audioBlob: Blob,
  slug: string,
  soundId: string
): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');
  
  const audioDir = path.join(process.cwd(), 'public', 'generated', slug, 'audio');
  
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  
  const filename = `${soundId}.mp3`;
  const filepath = path.join(audioDir, filename);
  
  const buffer = Buffer.from(await audioBlob.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  
  return `/generated/${slug}/audio/${filename}`;
}

/**
 * Генерация звуков для конкретного schedule профессии
 */
export async function generateTimelineSounds(
  slug: string,
  schedule: Array<{ time: string; title: string; description: string }>,
  baseProfile: AudioProfile,
  onProgress?: (message: string, progress: number) => void
): Promise<{
  timelineSounds: Array<{ id: string; timeSlot: string; url: string }>;
}> {
  const timelineSounds: Array<{ id: string; timeSlot: string; url: string }> = [];
  
  // Генерируем звуки для каждого события в schedule
  for (let i = 0; i < schedule.length; i++) {
    const scheduleItem = schedule[i];
    
    // Используем базовый промпт профессии или создаем новый
    const baseSound = baseProfile.timelineSounds[i] || baseProfile.timelineSounds[0];
    
    // Создаем ID на основе времени события
    const soundId = `timeline-${scheduleItem.time.replace(':', '-')}`;
    
    // Адаптируем промпт под конкретное событие
    const prompt = `${baseSound.prompt} - during ${scheduleItem.title} at ${scheduleItem.time}`;
    
    if (onProgress) {
      onProgress(`Генерирую звук ${i + 1}/${schedule.length}: ${scheduleItem.title}...`, (i / schedule.length) * 100);
    }
    
    try {
      const audioBlob = await generateSoundEffect(
        prompt,
        baseSound.duration,
        false,
        (progress) => {
          if (onProgress) {
            onProgress(`Генерирую ${scheduleItem.title}... ${progress}%`, (i / schedule.length) * 100);
          }
        }
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
  
  if (onProgress) onProgress('Все звуки готовы! 🎧', 100);
  
  return {
    timelineSounds,
  };
}

/**
 * Создание универсального профиля на основе schedule профессии
 */
function createUniversalAudioProfile(
  profession: string,
  schedule: Array<{ time: string; title: string; description: string; emoji?: string }>,
  isIT: boolean = false
): AudioProfile {
  const timelineSounds: TimelineSound[] = schedule.map((item, index) => {
    // Базовые промпты для разных типов событий
    let basePrompt = '';
    
    if (item.title.toLowerCase().includes('стендап') || item.title.toLowerCase().includes('встреч')) {
      basePrompt = `Pleasant ASMR office meeting: soft friendly voices discussing tasks, gentle keyboard clicks in background, warm collaborative energy, crisp clear audio with rich spatial depth, cozy productive atmosphere`;
    } else if (item.title.toLowerCase().includes('обед') || item.title.toLowerCase().includes('перерыв')) {
      basePrompt = `Cozy ASMR lunch break: gentle friendly laughter, pleasant conversations, soft food wrapper sounds, warm social bonding, comfortable break room ambience, high quality spatial audio, relaxing camaraderie`;
    } else if (item.title.toLowerCase().includes('код') || item.title.toLowerCase().includes('разработк')) {
      basePrompt = `Ultra satisfying ASMR deep coding flow: rhythmic mechanical keyboard typing, crisp tactile clicks, soft mouse movements, gentle breathing of focused developer, satisfying keystroke patterns, peaceful concentration zone, premium binaural audio quality`;
    } else if (item.title.toLowerCase().includes('анализ') || item.title.toLowerCase().includes('данн')) {
      basePrompt = `Satisfying ASMR data analysis: calm focused atmosphere, gentle keyboard typing, soft mouse movements, thoughtful contemplative sounds, peaceful learning atmosphere, crisp detailed stereo sound, relaxing focus ambience`;
    } else if (item.title.toLowerCase().includes('визуализац') || item.title.toLowerCase().includes('дашборд')) {
      basePrompt = `Peaceful ASMR visualization work: slow deliberate keyboard typing, satisfying mouse movements, calm organizing sounds, content creation atmosphere, soft desk items being arranged, relaxing completion vibes, premium audio quality`;
    } else if (item.title.toLowerCase().includes('ревью') || item.title.toLowerCase().includes('проверк')) {
      basePrompt = `Satisfying ASMR review session: calm mentor voice explaining concepts, gentle mouse wheel scrolling, soft keyboard taps, thoughtful contemplative hmms, peaceful learning atmosphere, crisp detailed stereo sound, relaxing focus ambience`;
    } else {
      // Универсальный промпт для остальных случаев
      basePrompt = isIT 
        ? `Pleasant ASMR ${profession.toLowerCase()} work: focused atmosphere, gentle keyboard typing, soft mouse movements, calm productive energy, crisp clear audio, cozy professional ambience`
        : `Pleasant ASMR ${profession.toLowerCase()} work: focused atmosphere, calm productive energy, crisp clear audio, cozy professional ambience`;
    }
    
    return {
      id: `timeline-${item.time.replace(':', '-')}`,
      timeSlot: item.time,
      description: item.title,
      prompt: `${basePrompt} - during ${item.title} at ${item.time}`,
      duration: 10,
    };
  });
  
  return {
    profession,
    timelineSounds,
  };
}

/**
 * Поиск профиля по slug с fallback на базовое название профессии
 */
function findAudioProfile(slug: string, profession?: string, schedule?: Array<{ time: string; title: string; description: string; emoji?: string }>, isIT?: boolean): AudioProfile | null {
  // Прямой поиск по slug
  if (AUDIO_PROFILES[slug]) {
    console.log(`[Audio] Найден профиль по slug: ${slug}`);
    return AUDIO_PROFILES[slug];
  }
  
  // Попытка найти по базовому названию профессии
  if (profession) {
    const baseSlug = profession.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (AUDIO_PROFILES[baseSlug]) {
      console.log(`[Audio] Найден профиль по базовому slug: ${baseSlug}`);
      return AUDIO_PROFILES[baseSlug];
    }
    
    // Проверяем частичные совпадения
    for (const key in AUDIO_PROFILES) {
      if (baseSlug.includes(key) || key.includes(baseSlug)) {
        console.log(`[Audio] Найден профиль по частичному совпадению: ${key} для ${baseSlug}`);
        return AUDIO_PROFILES[key];
      }
    }
  }
  
  // Если есть schedule, создаем универсальный профиль
  if (schedule && schedule.length > 0) {
    console.log(`[Audio] Создаю универсальный профиль для ${profession || slug} на основе schedule (${schedule.length} событий)`);
    return createUniversalAudioProfile(profession || slug, schedule, isIT || false);
  }
  
  console.warn(`[Audio] Профиль не найден для ${slug}, и нет данных schedule для создания универсального профиля`);
  return null;
}

/**
 * Генерация всех звуков для профессии (для timeline) - оригинальная функция
 */
export async function generateProfessionAudio(
  slug: string,
  onProgress?: (message: string, progress: number) => void,
  professionData?: {
    profession?: string;
    schedule?: Array<{ time: string; title: string; description: string; emoji?: string }>;
    isIT?: boolean;
  }
): Promise<{
  timelineSounds: Array<{ id: string; timeSlot: string; url: string }>;
}> {
  // Пытаемся найти профиль с fallback на универсальный
  const profile = findAudioProfile(
    slug,
    professionData?.profession,
    professionData?.schedule,
    professionData?.isIT
  );
  
  if (!profile) {
    throw new Error(`Audio profile not found for: ${slug} and no schedule data provided`);
  }
  
  const timelineSounds: Array<{ id: string; timeSlot: string; url: string }> = [];
  
  // Проверяем API ключ перед началом генерации
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY не найден в переменных окружения. Звуки не будут сгенерированы.');
  }
  
  let paymentIssueDetected = false;
  
  // Генерируем звуки для каждого этапа дня
  for (let i = 0; i < profile.timelineSounds.length; i++) {
    const sound = profile.timelineSounds[i];
    
    // Если обнаружена проблема с оплатой, прекращаем генерацию
    if (paymentIssueDetected) {
      console.warn(`[Audio] Прекращаю генерацию звуков из-за проблемы с оплатой ElevenLabs`);
      break;
    }
    
    if (onProgress) {
      onProgress(`Генерирую звук ${i + 1}/${profile.timelineSounds.length}: ${sound.description}...`, (i / profile.timelineSounds.length) * 100);
    }
    
    try {
      const audioBlob = await generateSoundEffect(
        sound.prompt,
        sound.duration,
        false,
        (progress) => {
          if (onProgress) {
            onProgress(`Генерирую ${sound.description}... ${progress}%`, (i / profile.timelineSounds.length) * 100);
          }
        }
      );
      
      const url = await saveSoundToFile(audioBlob, slug, sound.id);
      timelineSounds.push({ id: sound.id, timeSlot: sound.timeSlot, url });
      
      console.log(`    ✓ ${sound.timeSlot} - ${sound.description}`);
      
      // Задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`    ✗ Ошибка: ${sound.timeSlot} - ${sound.description}:`, error.message);
      
      // Если ошибка связана с оплатой (401, 402), прекращаем генерацию
      if (error.message.includes('payment') || 
          error.message.includes('оплата') || 
          error.message.includes('subscription') ||
          error.message.includes('401') ||
          error.message.includes('402')) {
        paymentIssueDetected = true;
        console.warn(`[Audio] Обнаружена проблема с оплатой ElevenLabs. Генерация звуков прекращена.`);
        console.warn(`[Audio] Для продолжения необходимо оплатить подписку: https://elevenlabs.io/app/subscription`);
        break;
      }
    }
  }
  
  if (paymentIssueDetected && timelineSounds.length === 0) {
    throw new Error('Не удалось сгенерировать звуки: требуется оплата подписки ElevenLabs. Проверьте https://elevenlabs.io/app/subscription');
  }
  
  if (onProgress) {
    if (timelineSounds.length > 0) {
      onProgress(`Сгенерировано ${timelineSounds.length} из ${profile.timelineSounds.length} звуков ${paymentIssueDetected ? '(прервано из-за проблемы с оплатой)' : ''}`, 100);
    } else {
      onProgress('Не удалось сгенерировать звуки', 100);
    }
  }
  
  return {
    timelineSounds,
  };
}

/**
 * Проверка наличия готовых звуков
 */
export async function checkCachedAudio(slug: string): Promise<boolean> {
  const fs = await import('fs');
  const path = await import('path');
  
  const audioDir = path.join(process.cwd(), 'public', 'generated', slug, 'audio');
  return fs.existsSync(audioDir);
}

