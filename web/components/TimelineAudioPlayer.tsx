'use client';

import { useState, useRef, useEffect } from 'react';

interface TimelineAudioPlayerProps {
  slug: string;
  soundId: string;
  className?: string;
}

/**
 * Мини-плеер для воспроизведения звука этапа дня в timeline
 */
export default function TimelineAudioPlayer({ 
  slug, 
  soundId,
  className = '' 
}: TimelineAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Проверяем наличие звука
  useEffect(() => {
    const checkAudio = async () => {
      try {
        const response = await fetch(`/generated/${slug}/audio/${soundId}.mp3`, { method: 'HEAD' });
        setHasError(!response.ok);
      } catch {
        setHasError(true);
      }
    };
    
    checkAudio();
  }, [slug, soundId]);
  
  // Загружаем аудио при первом воспроизведении
  const loadAudio = () => {
    if (audioRef.current) return;
    
    const audioPath = `/generated/${slug}/audio/${soundId}.mp3`;
    const audio = new Audio(audioPath);
    audio.volume = 0.7;
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    });
    
    audio.addEventListener('error', () => {
      console.error('Error loading audio:', audioPath);
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
    });
    
    audioRef.current = audio;
  };
  
  const handlePlay = async () => {
    if (hasError) return;
    
    setIsLoading(true);
    
    if (!audioRef.current) {
      loadAudio();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
      await audioRef.current?.play();
      setIsPlaying(true);
      
      // Обновляем прогресс
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setProgress(percent);
        }
      }, 100);
    } catch (error) {
      console.error('Error playing audio:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };
  
  const handleToggle = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };
  
  // Очистка
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);
  
  if (hasError) {
    return null; // Не показываем плеер, если звука нет
  }
  
  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`group relative flex items-center gap-2 rounded-full bg-hh-gray-100 px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-hh-red hover:text-white disabled:opacity-50 ${className}`}
      aria-label={isPlaying ? 'Остановить звук' : 'Прослушать вайб'}
    >
      {/* Прогресс бар (фон) */}
      {isPlaying && (
        <div 
          className="absolute inset-0 rounded-full bg-hh-red/20 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      )}
      
      {/* Иконка */}
      <span className="relative z-10">
        {isLoading ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isPlaying ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </span>
      
      {/* Текст */}
      <span className="relative z-10">
        {isPlaying ? '🎧 Слушаем...' : '🎧 Вайб'}
      </span>
    </button>
  );
}

