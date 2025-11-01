'use client';

import { useState, useEffect, useRef } from 'react';

export interface AudioTrack {
  id: string;
  url: string;
  type: 'ambient' | 'event';
  loop?: boolean;
  volume?: number;
}

interface AudioPlayerProps {
  slug: string;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
}

/**
 * Проигрыватель звуковых эффектов для профессий
 * Управляет ambient звуками и event звуками
 */
export default function AudioPlayer({ 
  slug, 
  autoPlay = false, 
  showControls = true,
  className = '' 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [hasAudio, setHasAudio] = useState(false);
  const [ambientSoundId, setAmbientSoundId] = useState<string | null>(null);
  
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const eventAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  // Проверяем наличие звуков при монтировании
  useEffect(() => {
    checkAudioAvailability();
  }, [slug]);
  
  // Автоплей если указано
  useEffect(() => {
    if (autoPlay && hasAudio && !isPlaying && ambientSoundId) {
      handlePlay();
    }
  }, [autoPlay, hasAudio, ambientSoundId]);
  
  const checkAudioAvailability = async () => {
    try {
      const response = await fetch(`/api/generate-audio?slug=${slug}`);
      const data = await response.json();
      const available = data.hasCached && data.hasProfile;
      setHasAudio(available);
      
      // Получаем ID первого звука из timeline (используем как ambient)
      if (available && data.timelineSounds?.length > 0) {
        setAmbientSoundId(data.timelineSounds[0].id);
      }
    } catch (error) {
      console.error('Error checking audio:', error);
      setHasAudio(false);
    }
  };
  
  const loadAmbientAudio = () => {
    if (!ambientSoundId) return;
    
    // Загружаем ambient звук на основе профиля профессии
    const ambientPath = `/generated/${slug}/audio/${ambientSoundId}.mp3`;
    
    const audio = new Audio(ambientPath);
    audio.loop = true;
    audio.volume = volume;
    
    audio.addEventListener('canplaythrough', () => {
      setIsLoading(false);
    });
    
    audio.addEventListener('error', () => {
      console.error('Error loading ambient audio:', ambientPath);
      setIsLoading(false);
      setHasAudio(false);
    });
    
    ambientAudioRef.current = audio;
  };
  
  const handlePlay = async () => {
    if (!hasAudio || !ambientSoundId) return;
    
    setIsLoading(true);
    
    if (!ambientAudioRef.current) {
      loadAmbientAudio();
      // Ждем загрузки аудио
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
      await ambientAudioRef.current?.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePause = () => {
    ambientAudioRef.current?.pause();
    setIsPlaying(false);
  };
  
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = newVolume;
    }
    eventAudioRefs.current.forEach(audio => {
      audio.volume = newVolume * 0.8; // Event звуки чуть тише
    });
  };
  
  /**
   * Проиграть event звук (например, при клике на timeline)
   */
  const playEventSound = async (soundId: string) => {
    if (!hasAudio || !isPlaying) return;
    
    const soundPath = `/generated/${slug}/audio/${soundId}.mp3`;
    
    let audio = eventAudioRefs.current.get(soundId);
    
    if (!audio) {
      audio = new Audio(soundPath);
      audio.volume = volume * 0.8;
      eventAudioRefs.current.set(soundId, audio);
    }
    
    try {
      audio.currentTime = 0; // Начинаем с начала
      await audio.play();
    } catch (error) {
      console.error(`Error playing event sound ${soundId}:`, error);
    }
  };
  
  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      ambientAudioRef.current?.pause();
      eventAudioRefs.current.forEach(audio => audio.pause());
    };
  }, []);
  
  if (!hasAudio && !isLoading) {
    return null; // Не показываем контроль, если нет звуков
  }
  
  if (!showControls) {
    return null; // Управление через внешние функции
  }
  
  return (
    <div className={`flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 backdrop-blur-md ${className}`}>
      {/* Play/Pause Button */}
      <button
        onClick={isPlaying ? handlePause : handlePlay}
        disabled={isLoading}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 disabled:opacity-50"
        aria-label={isPlaying ? 'Остановить звук' : 'Включить атмосферу'}
      >
        {isLoading ? (
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isPlaying ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      
      {/* Label */}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-white">
          {isPlaying ? '🎧 Погружаемся в атмосферу' : '🔇 Атмосфера выключена'}
        </span>
      </div>
      
      {/* Volume Slider */}
      {isPlaying && (
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value) / 100)}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20"
            style={{
              background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Hook для программного управления звуками
 */
export function useAudioControl(slug: string) {
  const playerRef = useRef<{
    play: () => void;
    pause: () => void;
    playEvent: (soundId: string) => void;
  } | null>(null);
  
  return {
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause(),
    playEvent: (soundId: string) => playerRef.current?.playEvent(soundId),
  };
}

