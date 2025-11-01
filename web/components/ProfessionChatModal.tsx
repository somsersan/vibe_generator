'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProfessionData } from '@/types/profession';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ProfessionChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionData: ProfessionData;
}

export default function ProfessionChatModal({
  isOpen,
  onClose,
  professionData,
}: ProfessionChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isSessionReadyRef = useRef<boolean>(false);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const greetingSentRef = useRef<boolean>(false);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Приветственное сообщение при открытии
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = generateGreeting(professionData);
      setMessages([
        {
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, professionData]);

  // Закрытие голосового соединения при закрытии модалки
  useEffect(() => {
    if (!isOpen) {
      stopVoiceMode();
    }
  }, [isOpen]);

  const generateGreeting = (data: ProfessionData): string => {
    const greetings = [
      `Привет! Я ${data.level || ''} ${data.profession}${data.company ? ` в ${data.company}` : ''}. Рад ответить на твои вопросы о профессии!`,
      `Здравствуй! Работаю ${data.profession}${data.level ? ` на позиции ${data.level}` : ''}. Что тебя интересует?`,
      `Приветствую! Я практикующий ${data.profession}. Спрашивай о работе, буднях, карьере — отвечу честно!`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  // Отправка текстового сообщения
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Подготавливаем историю для отправки (убираем timestamp, так как он не нужен на сервере)
      const historyForApi = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/profession-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          professionData,
          history: historyForApi,
        }),
      });

      if (!response.ok) {
        let errorText = '';
        let errorData: any = {};
        
        try {
          errorText = await response.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch (parseError) {
              // Если не JSON, используем текст как есть
              errorData = { error: errorText };
            }
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('Ошибка API - статус:', response.status);
        console.error('Ошибка API - статус текст:', response.statusText);
        console.error('Ошибка API - текст ответа:', errorText);
        console.error('Ошибка API - распарсенные данные:', errorData);
        
        const errorMessage = errorData.error || errorData.details || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Ошибка чата:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Извини, произошла ошибка. Попробуй задать вопрос снова.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Переключение в голосовой режим
  const toggleVoiceMode = async () => {
    if (isVoiceMode) {
      stopVoiceMode();
    } else {
      await startVoiceMode();
    }
  };

  // Начало голосового режима
  const startVoiceMode = async () => {
    setIsConnecting(true);
    try {
      // Запрашиваем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        } 
      });
      mediaStreamRef.current = stream;

      // Инициализация AudioContext
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      // Динамический импорт Google GenAI для клиентской стороны
      const { GoogleGenAI } = await import('@google/genai');
      
      // Получаем ephemeral token с сервера
      const tokenResponse = await fetch('/api/ephemeral-token');
      if (!tokenResponse.ok) {
        throw new Error('Не удалось получить токен аутентификации');
      }
      const { token } = await tokenResponse.json();

      const ai = new GoogleGenAI({ apiKey: token });

      // Создаем системный промпт для представителя профессии
      const systemInstruction = generateSystemPrompt(professionData);

      // Правильная конфигурация согласно документации Live API
      const config: any = {
        generationConfig: {
          responseModalities: ['AUDIO'],
        },
        systemInstruction,
      };

      console.log('Подключение к Live API...');
      console.log('Конфигурация:', {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        generationConfig: config.generationConfig,
        hasSystemInstruction: !!config.systemInstruction,
      });
      
      // Сбрасываем флаги
      isSessionReadyRef.current = false;
      greetingSentRef.current = false;
      
      // Подключаемся к Live API с callbacks
      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config,
        callbacks: {
          onopen: () => {
            console.log('=== Live API соединение открыто ===');
            // Соединение готово к отправке данных
            isSessionReadyRef.current = true;
            console.log('Флаг готовности установлен в true через onopen');
            
            // Запускаем обработку аудио если есть функция
            if ((liveSessionRef.current as any)?.startAudioProcessing) {
              console.log('Запуск обработки аудио через onopen callback');
              (liveSessionRef.current as any).startAudioProcessing();
            }
            
            // Отправляем приветствие после открытия соединения
            setTimeout(() => {
              if (liveSessionRef.current && isSessionReadyRef.current && !greetingSentRef.current) {
                try {
                  console.log('Отправка текстового приветствия через onopen...');
                  liveSessionRef.current.sendRealtimeInput({
                    text: 'Привет! Начинаем голосовой разговор.',
                  });
                  greetingSentRef.current = true;
                  console.log('✅ Текстовое приветствие отправлено через onopen');
                } catch (error: any) {
                  console.warn('Не удалось отправить текстовое приветствие через onopen:', error);
                  if (error?.message?.includes('CLOSING') || 
                      error?.message?.includes('CLOSED') ||
                      error?.message?.includes('WebSocket')) {
                    console.error('❌ Соединение закрыто при попытке отправки приветствия');
                    isSessionReadyRef.current = false;
                  }
                }
              }
            }, 500);
          },
          onmessage: async (message: any) => {
            console.log('=== Получено сообщение от Live API ===');
            console.log('Полное сообщение:', JSON.stringify(message, null, 2));
            console.log('Тип сообщения:', message.type);
            console.log('hasServerContent:', !!message.serverContent);
            console.log('hasAudioChunks:', !!message.serverContent?.audioChunks);
            console.log('hasText:', !!message.serverContent?.text);
            console.log('audioChunks length:', message.serverContent?.audioChunks?.length || 0);
            
            // Обработка аудио-ответов
            if (message.serverContent?.audioChunks && audioContextRef.current) {
              console.log(`Обработка ${message.serverContent.audioChunks.length} аудио-чаунков`);
              for (let i = 0; i < message.serverContent.audioChunks.length; i++) {
                const chunk = message.serverContent.audioChunks[i];
                if (chunk?.data) {
                  try {
                    console.log(`Обработка чаунка ${i + 1}, размер данных: ${chunk.data.length}`);
                    // Декодируем base64 аудио
                    const audioData = atob(chunk.data);
                    const audioArray = new Uint8Array(audioData.length);
                    for (let j = 0; j < audioData.length; j++) {
                      audioArray[j] = audioData.charCodeAt(j);
                    }

                    // Воспроизводим аудио
                    const audioBuffer = await audioContextRef.current.decodeAudioData(
                      audioArray.buffer
                    );
                    const source = audioContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContextRef.current.destination);
                    source.start();
                    console.log(`Аудио чаунк ${i + 1} воспроизведен`);
                  } catch (error) {
                    console.error(`Ошибка воспроизведения аудио чаунка ${i + 1}:`, error);
                  }
                }
              }
            }

            // Добавляем текстовое представление ответа, если есть
            if (message.serverContent?.text) {
              console.log('Получен текстовый ответ:', message.serverContent.text);
              const assistantMessage: Message = {
                role: 'assistant',
                content: message.serverContent.text,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
            }
          },
          onerror: (error: any) => {
            console.error('=== Ошибка Live API ===');
            console.error('Полная ошибка:', error);
            console.error('Детали ошибки:', {
              message: error?.message,
              code: error?.code,
              status: error?.status,
              stack: error?.stack,
              errorObject: JSON.stringify(error),
            });
            isSessionReadyRef.current = false;
            setIsConnecting(false);
          },
          onclose: (event?: any) => {
            console.log('=== Live API соединение закрыто ===');
            console.log('Детали закрытия:', {
              code: event?.code,
              reason: event?.reason,
              wasClean: event?.wasClean,
              isVoiceMode,
              event: event,
            });
            isSessionReadyRef.current = false;
            // Останавливаем обработку аудио при закрытии соединения
            // (isProcessorActive будет остановлен в обработчике ошибок)
            // Закрываем соединение только если это не было вызвано пользователем
            if (isVoiceMode) {
              setIsVoiceMode(false);
              setIsRecording(false);
            }
          },
        },
      });
      
      console.log('Live API подключен успешно, сессия:', session);
      liveSessionRef.current = session;
      
      // Устанавливаем готовность через небольшую задержку после подключения
      // Это fallback на случай если onopen не сработает
      setTimeout(() => {
        if (!isSessionReadyRef.current && liveSessionRef.current) {
          console.log('Fallback: устанавливаем готовность через таймаут (onopen не сработал)');
          isSessionReadyRef.current = true;
        }
      }, 1500);
      
      // Переменные для обработки аудио
      let audioChunkCount = 0;
      let isProcessorActive = false;
      let source: MediaStreamAudioSourceNode | null = null;
      let processor: ScriptProcessorNode | null = null;
      
      // Функция для проверки состояния соединения
      const checkConnectionState = (): boolean => {
        if (!liveSessionRef.current) {
          console.log('checkConnectionState: нет сессии');
          return false;
        }
        
        try {
          const session = liveSessionRef.current;
          
          // Проверяем наличие метода sendRealtimeInput
          if (typeof session.sendRealtimeInput !== 'function') {
            console.log('checkConnectionState: sendRealtimeInput не доступен');
            return false;
          }
          
          // Проверяем состояние через внутренние свойства если доступны
          // Но не блокируем если _ws недоступен (может быть не всегда доступен)
          try {
            if (session._ws) {
              const ws = session._ws;
              if (ws.readyState !== WebSocket.OPEN) {
                console.log(`checkConnectionState: WebSocket состояние ${ws.readyState} (не OPEN)`);
                return false;
              }
            }
          } catch (wsError) {
            // _ws может быть недоступен, это нормально - продолжаем
            console.log('checkConnectionState: _ws недоступен, продолжаем без проверки');
          }
          
          // Если есть сессия и метод доступен, считаем соединение готовым
          return true;
        } catch (error) {
          console.log('checkConnectionState: ошибка проверки', error);
          return false;
        }
      };
      
      // Функция для запуска обработки аудио (создаем processor только когда соединение готово)
      const startAudioProcessing = () => {
        // Проверяем базовые условия
        if (!liveSessionRef.current) {
          console.warn('⚠️ Нет сессии для обработки аудио');
          return;
        }
        
        if (isProcessorActive) {
          console.log('⚠️ Обработка аудио уже активна');
          return;
        }
        
        // Проверяем готовность соединения
        if (!checkConnectionState()) {
          console.warn('⚠️ Соединение не готово для обработки аудио, будет повторная попытка');
          // Пытаемся установить готовность, если её еще нет
          if (!isSessionReadyRef.current && liveSessionRef.current) {
            console.log('Устанавливаем готовность через fallback');
            isSessionReadyRef.current = true;
          }
          
          // Если все еще не готово, повторяем попытку через небольшую задержку
          if (!checkConnectionState()) {
            setTimeout(() => {
              if (!isProcessorActive && liveSessionRef.current) {
                console.log('Повторная попытка запуска обработки аудио...');
                startAudioProcessing();
              }
            }, 500);
            return;
          }
        }
        
        try {
          console.log('Создание ScriptProcessorNode для захвата аудио...');
          
          // Создаем processor только когда соединение готово
          source = audioContextRef.current!.createMediaStreamSource(stream);
          processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (e) => {
            // Дополнительная проверка перед каждым вызовом
            if (!checkConnectionState()) {
              isProcessorActive = false;
              return;
            }
            
            try {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = convertToPCM16(inputData);
              
              // Проверяем, что данные не пустые и есть звук
              if (pcmData.length > 0) {
                // Проверяем уровень звука (чтобы не отправлять тишину)
                const hasAudio = pcmData.some(sample => Math.abs(sample) > 100);
                
                if (hasAudio && checkConnectionState()) {
                  audioChunkCount++;
                  // Конвертируем PCM16 в base64
                  const base64Audio = btoa(
                    String.fromCharCode(...new Uint8Array(pcmData.buffer))
                  );

                  // Логируем первые несколько чанков для отладки
                  if (audioChunkCount <= 3) {
                    console.log(`Отправка аудио чанка #${audioChunkCount}, размер: ${base64Audio.length} байт`);
                  }

                  // Отправляем аудио только если соединение готово
                  try {
                    liveSessionRef.current!.sendRealtimeInput({
                      audio: {
                        data: base64Audio,
                        mimeType: 'audio/pcm;rate=16000',
                      },
                    });
                    
                    // Логируем успешную отправку первых чанков
                    if (audioChunkCount <= 3) {
                      console.log(`✅ Аудио чанк #${audioChunkCount} отправлен успешно`);
                    }
                  } catch (sendError: any) {
                    // Если соединение закрыто, останавливаем отправку
                    if (sendError?.message?.includes('CLOSING') || 
                        sendError?.message?.includes('CLOSED') ||
                        sendError?.message?.includes('WebSocket')) {
                      console.warn('❌ Соединение закрыто, остановка отправки аудио:', sendError.message);
                      isSessionReadyRef.current = false;
                      isProcessorActive = false;
                      return;
                    }
                    console.error('Ошибка отправки аудио:', sendError);
                  }
                }
              }
            } catch (error) {
              console.error('Ошибка обработки аудио:', error);
            }
          };

          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);
          
          // Сохраняем ссылки для очистки
          audioProcessorRef.current = processor;
          (liveSessionRef.current as any).audioSource = source;
          
          isProcessorActive = true;
          console.log('✅ Обработка аудио активирована');
        } catch (error) {
          console.error('Ошибка создания processor:', error);
        }
      };
      
      // Сохраняем функцию для запуска обработки аудио в сессии
      (session as any).startAudioProcessing = startAudioProcessing;
      
      // Пытаемся запустить обработку через таймаут (fallback на случай если onopen не сработает)
      // Увеличиваем задержку чтобы дать время соединению установиться
      setTimeout(() => {
        if (!isProcessorActive && liveSessionRef.current) {
          console.log('Fallback: запуск обработки аудио через таймаут');
          // Устанавливаем готовность перед запуском
          if (!isSessionReadyRef.current) {
            isSessionReadyRef.current = true;
            console.log('Установлена готовность перед запуском обработки');
          }
          startAudioProcessing();
        }
      }, 3000);

      // Устанавливаем состояние после полной настройки
      setIsVoiceMode(true);
      setIsRecording(true);
      setIsConnecting(false);

      // Отправляем приветствие пользователю
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '🎤 Голосовой режим активирован. Говори, я слушаю!',
          timestamp: new Date(),
        },
      ]);
      
      console.log('Голосовой режим полностью настроен');
      
      // Fallback на случай, если onopen не сработает
      setTimeout(() => {
        if (isSessionReadyRef.current && liveSessionRef.current && !greetingSentRef.current) {
          try {
            console.log('Fallback: отправка текстового приветствия...');
            liveSessionRef.current.sendRealtimeInput({
              text: 'Привет! Начинаем голосовой разговор.',
            });
            greetingSentRef.current = true;
            console.log('Текстовое приветствие отправлено через fallback');
          } catch (error: any) {
            console.warn('Не удалось отправить текстовое приветствие через fallback:', error);
            if (error?.message?.includes('CLOSING') || error?.message?.includes('CLOSED')) {
              console.error('Соединение закрыто при попытке отправки приветствия');
              isSessionReadyRef.current = false;
            }
          }
        }
      }, 2500);
    } catch (error) {
      console.error('Ошибка запуска голосового режима:', error);
      alert(
        'Не удалось запустить голосовой режим. Проверь доступ к микрофону и попробуй снова.'
      );
      setIsConnecting(false);
    }
  };

  // Остановка голосового режима
  const stopVoiceMode = () => {
    // Останавливаем запись
    setIsRecording(false);
    isSessionReadyRef.current = false;

    // Отключаем ScriptProcessorNode
    if (audioProcessorRef.current) {
      try {
        audioProcessorRef.current.disconnect();
      } catch (error) {
        console.error('Ошибка при отключении processor:', error);
      }
      audioProcessorRef.current = null;
    }
    
    // Отключаем audio source если есть
    if (liveSessionRef.current && (liveSessionRef.current as any).audioSource) {
      try {
        ((liveSessionRef.current as any).audioSource as MediaStreamAudioSourceNode).disconnect();
      } catch (error) {
        console.error('Ошибка при отключении source:', error);
      }
      (liveSessionRef.current as any).audioSource = null;
    }

    // Закрываем Live API сессию
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.close();
      } catch (error) {
        console.error('Ошибка при закрытии Live API сессии:', error);
      }
      liveSessionRef.current = null;
    }

    // Останавливаем медиа-поток
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Закрываем AudioContext
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (error) {
        console.error('Ошибка при закрытии AudioContext:', error);
      }
      audioContextRef.current = null;
    }

    setIsVoiceMode(false);

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '🎤 Голосовой режим выключен. Можешь продолжить текстом.',
        timestamp: new Date(),
      },
    ]);
  };

  // Конвертация Float32Array в PCM16
  const convertToPCM16 = (float32Array: Float32Array): Int16Array => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  };

  // Генерация системного промпта для представителя профессии
  const generateSystemPrompt = (data: ProfessionData): string => {
    // Получаем данные о пользователе из истории чата или из metadata карточки
    const userPreferences = data.userPreferences || {};
    
    const locationContext = userPreferences.location ? 
      (userPreferences.location === 'remote' ? 'работаю удаленно из дома' :
       userPreferences.location === 'moscow' ? 'работаю в Москве' :
       userPreferences.location === 'spb' ? 'работаю в Санкт-Петербурге' :
       'работаю в регионе') : '';
    
    const companySizeContext = userPreferences.companySize ?
      (userPreferences.companySize === 'startup' ? 'в стартапе' :
       userPreferences.companySize === 'medium' ? 'в средней компании' :
       userPreferences.companySize === 'large' ? 'в крупной корпорации' : '') : '';
    
    const specializationContext = userPreferences.specialization ? 
      `, специализируюсь на ${userPreferences.specialization}` : '';
    
    const motivationContext = userPreferences.motivation ? 
      `\n\nМОЯ МОТИВАЦИЯ:\nМеня привлекает в профессии: ${userPreferences.motivation}. Это влияет на то, как я подхожу к работе и что мне важно.` : '';
    
    return `Ты опытный ${data.profession}${data.level ? ` уровня ${data.level}` : ''}${data.company ? ` в компании ${data.company}` : ''}${locationContext ? `, ${locationContext}` : ''}${companySizeContext ? `, ${companySizeContext}` : ''}${specializationContext}.

ТВОЙ ПРОФИЛЬ:
- Профессия: ${data.profession}
- Уровень: ${data.level || 'не указан'}
- Компания: ${data.company || 'не указана'}
${locationContext ? `- Локация: ${locationContext}` : ''}
${companySizeContext ? `- Тип компании: ${companySizeContext}` : ''}
${specializationContext ? `- Специализация: ${specializationContext}` : ''}
${data.stack && data.stack.length > 0 ? `- Технологический стек: ${data.stack.join(', ')}` : ''}
${motivationContext}

ТВОЙ ТИПИЧНЫЙ ДЕНЬ:
${data.schedule?.map((item) => `${item.time} - ${item.title}: ${item.description}`).join('\n') || 'Не указан'}

ТВОИ НАВЫКИ:
${data.skills?.map((skill) => `- ${skill.name}: ${skill.level}%`).join('\n') || 'Не указаны'}

КАРЬЕРНЫЙ ПУТЬ В ПРОФЕССИИ:
${data.careerPath?.map((stage, i) => `${i + 1}. ${stage.level} (${stage.years}) - ${stage.salary}`).join('\n') || 'Не указан'}

СТАТИСТИКА РЫНКА:
- Вакансий: ${data.vacancies || 'н/д'}
- Средняя зарплата: ${data.avgSalary ? `${data.avgSalary.toLocaleString('ru-RU')} ₽` : 'н/д'}
- Конкуренция: ${data.competition || 'н/д'}
${data.topCompanies && data.topCompanies.length > 0 ? `- Топ работодатели: ${data.topCompanies.join(', ')}` : ''}

ТВОЯ РОЛЬ:
1. Отвечай от первого лица, как реальный специалист
2. Используй профессиональный сленг и термины
3. Делись личным опытом и инсайтами
4. Будь честным о сложностях и вызовах профессии
5. Отвечай кратко и по существу (2-4 предложения)
6. Используй эмоции и живой язык
7. Давай практические советы
8. Если не знаешь чего-то - признайся честно
${motivationContext ? '9. Учитывай свою мотивацию при ответах - говори о том, что тебя заводит в работе' : ''}

СТИЛЬ ОБЩЕНИЯ:
- Дружелюбный, но профессиональный
- Энергичный и мотивирующий
- С долей юмора, где уместно
- Максимально приближенный к реальному разговору с коллегой

Твоя цель - помочь человеку понять, каково это - работать в этой профессии.`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-hh-gray-200 bg-white shadow-2xl">
        {/* Заголовок */}
        <div className="flex items-center justify-between border-b border-hh-gray-200 bg-gradient-to-r from-hh-red to-hh-red-dark px-6 py-4 text-white">
          <div>
            <h2 className="text-lg font-semibold">
              💬 Чат с {professionData.profession}
            </h2>
            <p className="text-sm text-white/80">
              {professionData.level || 'Специалист'}{professionData.company ? ` • ${professionData.company}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl font-bold transition hover:bg-white/30"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {/* Область сообщений */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((msg, idx) => (
            <div
              key={`${msg.timestamp.getTime()}-${idx}`}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-hh-blue text-white'
                    : 'border border-hh-gray-200 bg-hh-gray-50 text-text-primary'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                <p
                  className={`mt-1 text-xs ${
                    msg.role === 'user' ? 'text-white/70' : 'text-text-secondary'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-hh-gray-200 bg-hh-gray-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-hh-red"></div>
                  <div
                    className="h-2 w-2 animate-pulse rounded-full bg-hh-red"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="h-2 w-2 animate-pulse rounded-full bg-hh-red"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Панель управления голосом */}
        {isVoiceMode && (
          <div className="border-t border-hh-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                  <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-green-400 opacity-75"></div>
                </div>
                <span className="text-sm font-medium text-green-700">
                  {isRecording ? '🎤 Слушаю...' : '⏸ Пауза'}
                </span>
              </div>
              <button
                onClick={() => setIsRecording(!isRecording)}
                className="rounded-full bg-white px-4 py-2 text-xs font-medium text-green-700 shadow-sm transition hover:bg-green-50"
              >
                {isRecording ? 'Поставить на паузу' : 'Продолжить'}
              </button>
            </div>
          </div>
        )}

        {/* Поле ввода */}
        <div className="border-t border-hh-gray-200 bg-white p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  isVoiceMode
                    ? 'Голосовой режим активен...'
                    : 'Напиши свой вопрос...'
                }
                disabled={isVoiceMode || isLoading}
                className="w-full resize-none rounded-2xl border border-hh-gray-200 bg-hh-gray-50 px-4 py-3 text-sm text-text-primary placeholder-text-secondary focus:border-hh-red focus:outline-none focus:ring-2 focus:ring-hh-red/20 disabled:opacity-50"
                rows={2}
              />
            </div>

            {/* Кнопка голосового режима */}
            <button
              onClick={toggleVoiceMode}
              disabled={isConnecting}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl shadow-lg transition ${
                isVoiceMode
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              } ${isConnecting ? 'animate-pulse opacity-50' : ''}`}
              title={isVoiceMode ? 'Отключить голосовой режим' : 'Включить голосовой режим'}
            >
              {isConnecting ? '⏳' : isVoiceMode ? '📞' : '🎤'}
            </button>

            {/* Кнопка отправки */}
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isVoiceMode}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-hh-red text-lg text-white shadow-lg transition hover:bg-hh-red-dark disabled:opacity-50"
            >
              ↑
            </button>
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            {isVoiceMode
              ? '🎤 Говори в микрофон или отключи голосовой режим для текстового чата'
              : 'Нажми Enter для отправки или используй голосовой режим 🎤'}
          </p>
        </div>
      </div>
    </div>
  );
}

