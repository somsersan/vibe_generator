'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useChatStore } from '@/lib/chat-store';
import { useAuth } from '@/lib/auth-context';
import { Message } from '@/types/chat';
import Link from 'next/link';
import Logo from '@/components/Logo';
import ReactMarkdown from 'react-markdown';

export default function ChatInterface({ onClose }: { onClose?: () => void }) {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const greetingLoadedRef = useRef(false); // Флаг для предотвращения двойной загрузки
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const { user } = useAuth();
  const { 
    messages, 
    isTyping, 
    persona,
    userId,
    addMessage, 
    setTyping, 
    setPersona,
    setConversationStage,
    clearChat,
    setUserId,
  } = useChatStore();

  // Синхронизируем userId при изменении пользователя
  useEffect(() => {
    if (user?.id !== userId) {
      setUserId(user?.id || null);
    }
  }, [user?.id, userId, setUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Функция загрузки приветствия
  const loadGreeting = useCallback(async () => {
    const startTime = Date.now();
    console.log('[Chat] Загрузка приветствия...');
    setTyping(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'start',
          history: [],
          persona: null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Chat] Приветствие получено', { 
          duration: Date.now() - startTime,
          messageType: data.message.type,
          hasButtons: !!data.message.buttons,
          hasCards: !!data.message.cards
        });
        
        if (data.persona) {
          setPersona(data.persona);
        }
        if (data.stage) {
          setConversationStage(data.stage);
        }
        addMessage({
          role: 'assistant',
          type: data.message.type || 'text',
          content: data.message.content || '',
          buttons: data.message.buttons,
          cards: data.message.cards,
          metadata: data.message.metadata,
        });
      } else {
        console.error('[Chat] Ошибка загрузки приветствия', { status: response.status });
      }
    } catch (error) {
      console.error('[Chat] Ошибка загрузки приветствия:', error);
    } finally {
      setTyping(false);
    }
  }, [setTyping, setPersona, setConversationStage, addMessage]);

  // Автоматически загружаем приветствие при первом открытии чата
  // Используем useLayoutEffect для синхронной проверки перед отрисовкой
  useLayoutEffect(() => {
    // Проверяем флаг загрузки атомарно - если уже загружали, выходим сразу
    if (greetingLoadedRef.current) {
      return;
    }
    
    // Используем небольшую задержку, чтобы дать время на загрузку из localStorage при setUserId
    const timer = setTimeout(() => {
      // Повторно проверяем флаг внутри таймера, чтобы предотвратить двойную загрузку
      if (greetingLoadedRef.current) {
        return;
      }
      
      // Проверяем наличие сообщений и состояние загрузки
      // Используем актуальные значения из store через функцию getState
      const currentState = useChatStore.getState();
      const shouldLoadGreeting = currentState.messages.length === 0 && !currentState.isTyping;
      
      if (shouldLoadGreeting) {
        // Устанавливаем флаг ДО вызова loadGreeting, чтобы предотвратить повторную загрузку
        greetingLoadedRef.current = true;
        loadGreeting();
      }
    }, 150);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Выполняется только один раз при монтировании

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const startTime = Date.now();
    console.log('[Chat] Отправка сообщения', { 
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      messagesCount: messages.length,
      hasPersona: !!persona
    });

    // Add user message
    addMessage({
      role: 'user',
      type: 'text',
      content: text,
    });

    setInputValue('');
    setTyping(true);

    try {
      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          persona: persona,
        }),
      });

      if (!response.ok) {
        throw new Error(`API вернул ошибку: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      console.log('[Chat] Ответ получен', { 
        duration,
        messageType: data.message.type,
        hasButtons: !!data.message.buttons,
        hasCards: !!data.message.cards,
        stage: data.stage
      });

      // Проверяем наличие сообщения в ответе
      if (!data.message) {
        throw new Error('Ответ от API не содержит сообщения');
      }

      // Update persona and stage
      if (data.persona) {
        setPersona(data.persona);
        console.log('[Chat] Persona обновлена', { persona: data.persona });
      }
      if (data.stage) {
        setConversationStage(data.stage);
        console.log('[Chat] Stage обновлен', { stage: data.stage });
      }

      // Add assistant response
      addMessage({
        role: 'assistant',
        type: data.message.type || 'text',
        content: data.message.content || 'Нет ответа от сервера',
        buttons: data.message.buttons,
        cards: data.message.cards,
        metadata: data.message.metadata, // Сохраняем metadata для отслеживания уточняющих вопросов
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[Chat] Ошибка отправки сообщения', { error, duration });
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      addMessage({
        role: 'assistant',
        type: 'text',
        content: `Извини, произошла ошибка: ${errorMessage}. Попробуй еще раз или проверь подключение к интернету.`,
      });
    } finally {
      setTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleButtonClick = (buttonText: string) => {
    console.log('[Chat] Клик по кнопке', { buttonText });
    sendMessage(buttonText);
  };

  const handleNewChat = () => {
    console.log('[Chat] Новый диалог');
    clearChat();
    greetingLoadedRef.current = false; // Сбрасываем флаг для нового диалога
    // Загружаем приветствие для нового диалога
    setTimeout(() => loadGreeting(), 100);
  };

  // Голосовой ввод через Deepgram
  const startVoiceInput = async () => {
    try {
      setIsRecording(true);
      setIsProcessing(true);

      // Получаем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;

      // Создаем AudioContext для обработки аудио
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      // Создаем ScriptProcessor для получения аудио данных
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      // Храним базовый текст (только финальные результаты) и промежуточный текст отдельно
      // Используем текущее значение inputValue через функцию для получения актуального значения
      const baseTextRef = { current: '' };
      const interimTextRef = { current: '' };
      
      // Инициализируем базовый текст текущим значением поля ввода
      setInputValue((currentValue) => {
        baseTextRef.current = currentValue;
        return currentValue;
      });

      // Подключаемся к Deepgram WebSocket API
      const DEEPGRAM_API_KEY = 'f2dcef06e99429aa5f261f7fc895950ecd691080';
      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&language=ru&punctuate=true&interim_results=true&encoding=linear16&sample_rate=16000`,
        ['token', DEEPGRAM_API_KEY]
      );
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('[Voice] Deepgram подключен');
        setIsProcessing(false);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.channel?.alternatives?.[0]?.transcript) {
            const newTranscript = data.channel.alternatives[0].transcript.trim();
            
            if (!newTranscript) return;
            
            if (data.is_final) {
              // Финальный результат - добавляем к базовому тексту
              baseTextRef.current += (baseTextRef.current ? ' ' : '') + newTranscript;
              interimTextRef.current = '';
              // Обновляем поле ввода: базовый текст + пустой промежуточный
              setInputValue(baseTextRef.current);
            } else {
              // Промежуточный результат - показываем в реальном времени
              interimTextRef.current = newTranscript;
              // Обновляем поле ввода: базовый текст + промежуточный
              setInputValue(baseTextRef.current + (baseTextRef.current ? ' ' : '') + newTranscript);
            }
          }
        } catch (err) {
          console.error('[Voice] Ошибка парсинга ответа:', err);
        }
      };

      socket.onerror = (error) => {
        console.error('[Voice] Ошибка Deepgram:', error);
        setIsRecording(false);
        setIsProcessing(false);
        stopVoiceInput();
      };

      socket.onclose = () => {
        console.log('[Voice] Deepgram отключен');
        setIsRecording(false);
        setIsProcessing(false);
        cleanupAudio();
      };

      // Обрабатываем аудио данные и отправляем в Deepgram
      processor.onaudioprocess = (e) => {
        if (socket.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Конвертируем Float32Array в Int16Array (PCM формат)
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Отправляем бинарные данные напрямую
          socket.send(int16Array.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (error) {
      console.error('[Voice] Ошибка начала записи:', error);
      setIsRecording(false);
      setIsProcessing(false);
      alert('Не удалось получить доступ к микрофону. Проверьте разрешения.');
    }
  };

  const cleanupAudio = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const stopVoiceInput = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Отправляем финальное сообщение для завершения транскрипции
      socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      socketRef.current.close();
    }
    
    cleanupAudio();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(false);
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopVoiceInput();
    };
  }, []);

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col bg-white">
      <ChatHeader onClose={onClose} onReset={handleNewChat} />

      <div className="flex-1 overflow-y-auto bg-hh-gray-50 px-4 py-5 sm:px-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} onButtonClick={handleButtonClick} />
          ))}

          {isTyping && (
            <div className="flex items-end gap-2">
              <AssistantAvatar />
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <TypingDot delay="0ms" />
                  <TypingDot delay="120ms" />
                  <TypingDot delay="240ms" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-hh-gray-200 bg-white px-4 pt-3 pb-16 safe-area-inset-bottom sm:px-6 sm:pb-20">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 mb-1">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={isRecording ? "Говорите..." : "Сообщение..."}
            disabled={isTyping || isRecording}
            className="flex-1 rounded-full border border-hh-gray-200 bg-hh-gray-50 px-4 py-3 text-base text-text-primary shadow-sm placeholder:text-text-secondary focus:border-hh-blue focus:outline-none focus:ring-2 focus:ring-hh-blue/30 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => {
              if (isRecording) {
                stopVoiceInput();
              } else {
                startVoiceInput();
              }
            }}
            disabled={isTyping || isProcessing}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              isRecording 
                ? 'bg-hh-red-dark text-white animate-pulse' 
                : 'bg-hh-red text-white hover:bg-hh-red-dark'
            } disabled:opacity-50`}
            aria-label={isRecording ? "Остановить запись" : "Начать голосовой ввод"}
          >
            {isRecording ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="6" y="6" width="8" height="8" rx="1" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                <path d="M5.5 9.643a.75.75 0 00-1.5 0A6.75 6.75 0 0010.907 16.25 6.75 6.75 0 0015.25 9.643a.75.75 0 00-1.5 0 5.25 5.25 0 11-10.5 0z" />
              </svg>
            )}
          </button>
          <button
            type="submit"
            disabled={isTyping || !inputValue.trim() || isRecording}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-hh-red text-white transition hover:bg-hh-red-dark disabled:bg-hh-gray-200"
            aria-label="Отправить сообщение"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
        {isRecording && (
          <div className="mt-2 text-xs text-text-secondary text-center">
            🎤 Запись... Говорите на русском языке
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onButtonClick,
}: {
  message: Message;
  onButtonClick: (text: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && <AssistantAvatar />}

      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${isUser ? 'rounded-br-sm bg-hh-blue text-white' : 'rounded-bl-sm bg-white text-text-primary shadow'} `}>
        <div className={`text-base leading-relaxed markdown-content ${
          isUser ? 'markdown-content-user' : 'markdown-content-assistant'
        }`}>
          <ReactMarkdown
            components={{
              h2: ({ children }) => <h2 className="font-semibold text-lg mt-4 mb-2 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="font-semibold text-base mt-3 mb-2">{children}</h3>,
              p: ({ children }) => <p className="my-2">{children}</p>,
              ul: ({ children }) => <ul className="my-2 ml-4 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 ml-4 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="my-1">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => <code className="bg-hh-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
              a: ({ href, children }) => <a href={href} className="underline hover:no-underline">{children}</a>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {message.buttons && message.buttons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => onButtonClick(button)}
                className="rounded-full border border-hh-gray-200 bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-hh-red hover:text-hh-red"
              >
                {button}
              </button>
            ))}
          </div>
        )}

        {message.cards && message.cards.length > 0 && (
          <div className="mt-4 grid gap-3">
            {message.cards.map((card) => (
              <Link
                key={card.slug}
                href={`/profession/${card.slug}?from=chat`}
                className="flex flex-col gap-3 rounded-2xl border border-hh-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                {card.image && (
                  <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-hh-gray-100">
                    <img src={card.image} alt={card.profession} className="h-full w-full object-cover" />
                  </div>
                )}
                <div>
                  <h4 className="text-base font-semibold text-text-primary">{card.profession}</h4>
                  {(card.level || card.company) && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-text-secondary">
                      {card.level} {card.level && card.company && '•'} {card.company}
                    </p>
                  )}
                  {card.description && (
                    <p className="mt-2 text-sm text-text-secondary">{card.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-hh-blue text-xs font-semibold text-white">
          Ты
        </div>
      )}
    </div>
  );
}

function ChatHeader({ onClose, onReset }: { onClose?: () => void; onReset: () => void }) {
  return (
      <div className="flex items-center gap-3 border-b border-hh-gray-200 bg-white px-4 py-3 safe-area-inset-top sm:px-6">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Закрыть чат"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-hh-gray-200 text-lg"
        >
          ←
        </button>
      )}
      <div className="flex items-center gap-3">
        <Logo size={40} />
        <div>
          <div className="text-sm font-semibold text-text-primary">AI ассистент</div>
          <div className="text-xs text-[#00a854]">Онлайн</div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onReset}
          className="rounded-full border border-hh-gray-200 px-3 py-2 text-xs font-medium text-text-secondary transition hover:border-hh-blue hover:text-hh-blue"
        >
          Новый диалог
        </button>
      </div>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <Logo size={32} />
  );
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-text-secondary"
      style={{ animationDelay: delay }}
    ></span>
  );
}

