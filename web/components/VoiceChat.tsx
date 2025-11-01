'use client';

import { useState, useRef, useEffect } from 'react';

interface VoiceChatProps {
  professionName: string;
  professionData?: {
    level?: string;
    company?: string;
    schedule?: Array<{ time: string; title: string; description: string }>;
    benefits?: Array<{ text: string }>;
  };
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export default function VoiceChat({ professionName, professionData }: VoiceChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const responseQueueRef = useRef<any[]>([]);

  const systemInstruction = `Ты - живой, реальный представитель профессии "${professionName}"${professionData?.company ? ` в компании ${professionData.company}` : ''}.
Ты разговариваешь с кандидатом, который интересуется этой профессией.

ВАЖНО - СТИЛЬ РЕЧИ И ГОЛОС:
- Говори ТОЛЬКО на русском языке
- Говори естественно, как обычный человек в реальном разговоре
- Используй живые интонации, паузы, эмоции
- Можешь использовать междометия типа "ну", "вот", "знаешь", "понимаешь"
- Звучи увлечённо и заинтересованно, но без излишнего энтузиазма
- Говори в разговорном стиле, как будто рассказываешь коллеге за чашкой кофе
- Избегай формальностей и канцеляризмов
- НЕ звучи как робот или автоответчик
- Отвечай довольно кратко (20-40 секунд), но содержательно
- Можешь добавлять личный опыт и примеры из жизни

ИНФОРМАЦИЯ О ВАКАНСИИ:
${professionData?.level ? `Уровень: ${professionData.level}` : ''}
${professionData?.benefits?.length ? `\nПреимущества:\n${professionData.benefits.map(b => `- ${b.text}`).join('\n')}` : ''}
${professionData?.schedule?.length ? `\nТипичный день:\n${professionData.schedule.slice(0, 3).map(s => `- ${s.time}: ${s.title} - ${s.description}`).join('\n')}` : ''}

ТВОЯ ЗАДАЧА:
- Отвечать на вопросы о работе, условиях, требованиях, карьере
- Делиться инсайтами о профессии
- Помогать понять, подходит ли человеку эта работа
- Если спрашивают о чём-то не связанном с профессией, вежливо возвращай к теме

Помни: ты говоришь вслух, поэтому твоя речь должна звучать максимально естественно и по-человечески!`;

  // Resample audio to 16kHz
  const resampleTo16kHz = async (audioData: Float32Array, sourceSampleRate: number): Promise<Float32Array> => {
    if (sourceSampleRate === 16000) return audioData;
    
    const offlineContext = new OfflineAudioContext(1, Math.ceil(audioData.length * 16000 / sourceSampleRate), 16000);
    const buffer = offlineContext.createBuffer(1, audioData.length, sourceSampleRate);
    buffer.getChannelData(0).set(audioData);
    
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    const renderedBuffer = await offlineContext.startRendering();
    return renderedBuffer.getChannelData(0);
  };

  // Конвертация Float32 в Int16 PCM
  const float32ToInt16PCM = (float32Array: Float32Array): ArrayBuffer => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array.buffer;
  };

  // Воспроизведение аудио из очереди
  const playAudioFromQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    setIsSpeaking(true);

    try {
      const context = audioContextRef.current;
      if (!context) return;

      while (audioQueueRef.current.length > 0) {
        const chunk = audioQueueRef.current.shift();
        if (!chunk) continue;

        const audioBuffer = context.createBuffer(1, chunk.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < chunk.length; i++) {
          channelData[i] = chunk[i] / 32768.0;
        }

        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start(0);
        });
      }
    } finally {
      isPlayingRef.current = false;
      setIsSpeaking(false);
    }
  };

  // Обработка сообщений от Live API
  const handleMessage = (message: any) => {
    console.log('📨 Received message from Live API:', message);
    responseQueueRef.current.push(message);
    
    if (message.data) {
      console.log('🔊 Got audio data, length:', message.data.length);
      // Получили аудио данные
      const buffer = Buffer.from(message.data, 'base64');
      const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Int16Array.BYTES_PER_ELEMENT);
      console.log('🔊 Converted to Int16Array, length:', int16Array.length);
      audioQueueRef.current.push(int16Array);
      console.log('🔊 Audio queue size:', audioQueueRef.current.length);
      playAudioFromQueue();
    }
    
    if (message.serverContent) {
      console.log('📋 Server content:', message.serverContent);
    }
  };

  const startVoiceChat = async () => {
    try {
      setConnectionState('connecting');
      setErrorMessage(null);

      // Динамический импорт SDK
      const { GoogleGenAI, Modality } = await import('@google/genai');
      
      // Получаем API ключ с сервера
      const keyResponse = await fetch('/api/voice-chat/token', {
        method: 'POST',
      });
      
      if (!keyResponse.ok) {
        throw new Error('Не удалось получить токен доступа');
      }
      
      const { apiKey } = await keyResponse.json();
      
      // Используем v1alpha для доступа к affective dialog и proactive audio
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { apiVersion: "v1alpha" }
      });
      
      // Используем native audio модель для поддержки affective и proactive аудио
      const model = "gemini-2.5-flash-native-audio-preview-09-2025";
      const config = {
        responseModalities: [Modality.AUDIO],
        systemInstruction,
        // Native audio автоматически определяет язык из контекста (русский из system instruction)
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede" // Женский голос, более естественный
            }
          }
        },
        enableAffectiveDialog: true, // Адаптирует стиль ответа под эмоции собеседника
        proactivity: { 
          proactiveAudio: true // Может не отвечать на нерелевантные вопросы
        },
        generationConfig: {
          temperature: 0.9, // Больше вариативности и естественности
          candidateCount: 1,
        }
      };

      // Подключаемся к Live API
      const session = await ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            console.log('Connected to Live API');
            setConnectionState('connected');
          },
          onmessage: handleMessage,
          onerror: (e: any) => {
            console.error('Live API error:', e);
            setErrorMessage(e.message || 'Ошибка соединения');
            setConnectionState('error');
          },
          onclose: (e: any) => {
            console.log('Connection closed:', e.reason);
            cleanup();
          },
        },
        config,
      });

      sessionRef.current = session;

      // Получаем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Создаем AudioContext
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      // Создаем source из микрофона
      const source = audioContext.createMediaStreamSource(stream);
      
      // Создаем процессор для обработки аудио
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Обрабатываем аудио с микрофона
      processor.onaudioprocess = async (e) => {
        if (connectionState !== 'connected' || !sessionRef.current) return;
        
        try {
          const inputData = e.inputBuffer.getChannelData(0);
          const resampled = await resampleTo16kHz(inputData, audioContext.sampleRate);
          const pcmBuffer = float32ToInt16PCM(resampled);
          const base64Audio = Buffer.from(pcmBuffer).toString('base64');
          
          // Отправляем аудио в Live API
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: base64Audio,
              mimeType: "audio/pcm;rate=16000"
            }
          });
        } catch (err) {
          console.error('Error processing audio:', err);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (error: any) {
      console.error('Error starting voice chat:', error);
      setErrorMessage(error.message || 'Ошибка подключения');
      setConnectionState('error');
      cleanup();
    }
  };

  const stopVoiceChat = () => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (error) {
        console.error('Error closing session:', error);
      }
    }
    cleanup();
    setConnectionState('idle');
    setIsOpen(false);
  };

  const cleanup = () => {
    // Останавливаем микрофон
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Закрываем audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Закрываем audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    sessionRef.current = null;
    audioQueueRef.current = [];
    responseQueueRef.current = [];
    isPlayingRef.current = false;
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const getStateLabel = () => {
    switch (connectionState) {
      case 'connecting': return 'Подключение...';
      case 'connected': return isSpeaking ? 'Говорит...' : 'Слушает...';
      case 'error': return 'Ошибка';
      default: return 'Начать разговор';
    }
  };

  const getStateColor = () => {
    switch (connectionState) {
      case 'connecting': return 'bg-yellow-500';
      case 'connected': return isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-hh-red text-2xl text-white shadow-[0_20px_40px_rgba(255,0,0,0.35)] transition hover:scale-105 hover:bg-hh-red-dark sm:bottom-8"
        aria-label="Голосовой чат с представителем"
      >
        🎙️
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 rounded-3xl border border-hh-gray-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] sm:bottom-8">
      <div className="flex items-center justify-between border-b border-hh-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🎙️</div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Голосовой чат</h3>
            <p className="text-xs text-text-secondary">Представитель профессии</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (connectionState === 'connected') {
              stopVoiceChat();
            } else {
              setIsOpen(false);
            }
          }}
          className="text-xl text-text-secondary hover:text-hh-red"
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>

      <div className="p-4">
        <div className="mb-4 rounded-2xl bg-hh-gray-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${getStateColor()}`} />
            <span className="text-xs font-medium text-text-secondary">{getStateLabel()}</span>
          </div>
          
          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">
              {errorMessage}
            </div>
          )}

          {connectionState === 'idle' && (
            <div className="space-y-2">
              <p className="text-sm text-text-primary">
                Поговори с живым представителем профессии "{professionName}"
              </p>
              <p className="text-xs text-text-secondary">
                🎤 Говори на русском языке<br/>
                💬 Задавай вопросы о работе, условиях и требованиях<br/>
                🎧 Получай естественные голосовые ответы
              </p>
            </div>
          )}

          {connectionState === 'connected' && (
            <div className="space-y-2">
              <p className="text-sm text-text-primary">
                {isSpeaking ? '🔊 Слушай ответ...' : '🎤 Говори свободно'}
              </p>
              <p className="text-xs text-text-secondary">
                ✨ AI понимает твои эмоции и отвечает с нужной интонацией<br/>
                🎯 Автоматически определяет когда ты закончил говорить
              </p>
            </div>
          )}
        </div>

        {connectionState !== 'connected' ? (
          <button
            onClick={startVoiceChat}
            disabled={connectionState === 'connecting'}
            className="w-full rounded-xl bg-hh-red py-3 text-sm font-medium text-white shadow-[0_10px_25px_rgba(255,0,0,0.25)] transition hover:bg-hh-red-dark disabled:opacity-50"
          >
            {connectionState === 'connecting' ? 'Подключение...' : '🎙️ Начать разговор'}
          </button>
        ) : (
          <button
            onClick={stopVoiceChat}
            className="w-full rounded-xl border border-hh-red py-3 text-sm font-medium text-hh-red transition hover:bg-hh-red hover:text-white"
          >
            Завершить разговор
          </button>
        )}

        <p className="mt-3 text-center text-xs text-text-secondary">
          Powered by Google Gemini 2.5 Native Audio<br/>
          <span className="text-[10px]">Affective Dialog • Proactive Audio • Russian Language</span>
        </p>
      </div>
    </div>
  );
}
