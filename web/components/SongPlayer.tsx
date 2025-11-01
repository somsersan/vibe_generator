'use client';

import { useState, useEffect, useRef } from 'react';

interface SongPlayerProps {
  songUrl: string;
  lyrics: string;
  title: string;
  className?: string;
}

/**
 * Компонент для проигрывания песни про профессию
 */
export default function SongPlayer({ songUrl, lyrics, title, className = '' }: SongPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(songUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError('Не удалось загрузить трек');
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, [songUrl]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Не удалось воспроизвести трек');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Заголовок и описание */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary">Припев про профессию</p>
      </div>

      {/* Текст припева */}
      <div className="rounded-2xl border border-hh-gray-200 bg-hh-gray-50 p-4">
        <p className="whitespace-pre-line text-sm text-text-primary leading-relaxed">{lyrics}</p>
      </div>

      {/* Плеер */}
      <div className="rounded-2xl border border-hh-gray-200 bg-white p-4">
        {error ? (
          <div className="text-center text-sm text-red-600">{error}</div>
        ) : (
          <>
            {/* Кнопки управления */}
            <div className="mb-4 flex items-center justify-center gap-4">
              <button
                onClick={handlePlayPause}
                disabled={isLoading}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-hh-red text-white shadow-[0_10px_25px_rgba(255,0,0,0.25)] transition hover:bg-hh-red-dark disabled:opacity-50"
                aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
              >
                {isLoading ? (
                  <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : isPlaying ? (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Прогресс-бар */}
            {duration > 0 && (
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={handleSeek}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-hh-gray-200"
                  style={{
                    background: `linear-gradient(to right, #ff0000 ${progress}%, #e5e7eb ${progress}%)`,
                  }}
                />
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

