'use client';

import { useState, useEffect, useMemo, use, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import TimelineAudioPlayer from '@/components/TimelineAudioPlayer';
import VoiceChat from '@/components/VoiceChat';
import CareerTreeComponent from '@/components/CareerTree';
import SongPlayer from '@/components/SongPlayer';
import { CareerTree } from '@/types/profession';
import { useAuth } from '@/lib/auth-context';

// Компонент горизонтальной карусели комикса
function ComicCarousel({ 
  comicPanels, 
  schedule, 
  slug 
}: { 
  comicPanels: string[]; 
  schedule: Array<{ time: string; title: string; emoji?: string }>; 
  slug: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Фильтруем placeholder URLs и создаем маппинг панелей к элементам расписания
  const validPanels = useMemo(() => {
    return comicPanels
      .map((panelUrl, index) => {
        // Пропускаем placeholder URLs
        if (panelUrl.startsWith('https://placehold.co')) {
          return null;
        }
        
        // Извлекаем номер панели из имени файла (comic-panel-N.png)
        const match = panelUrl.match(/comic-panel-(\d+)\.png/);
        const panelNumber = match ? parseInt(match[1], 10) : index + 1;
        
        // Находим соответствующий элемент расписания (индексы начинаются с 1)
        const scheduleIndex = panelNumber - 1;
        const scheduleItem = schedule[scheduleIndex];
        
        return {
          url: panelUrl,
          panelNumber,
          scheduleItem,
          scheduleIndex
        };
      })
      .filter((panel): panel is NonNullable<typeof panel> => panel !== null);
  }, [comicPanels, schedule]);

  // Сбрасываем индекс, если текущий выходит за границы
  useEffect(() => {
    if (currentIndex >= validPanels.length) {
      setCurrentIndex(Math.max(0, validPanels.length - 1));
    }
  }, [validPanels.length, currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || startX === null) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || startX === null) return;
    
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    const threshold = 50; // Минимальное расстояние для свайпа

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < validPanels.length - 1) {
        // Свайп влево - следующий слайд
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Свайп вправо - предыдущий слайд
        setCurrentIndex(currentIndex - 1);
      }
    }

    setIsDragging(false);
    setStartX(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || startX === null) return;
    e.preventDefault();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || startX === null) return;
    
    const endX = e.clientX;
    const diff = startX - endX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < validPanels.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }

    setIsDragging(false);
    setStartX(null);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Если нет валидных панелей, не показываем компонент
  if (validPanels.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Живой День в Комиксе</h3>
          <p className="mt-1 text-xs text-text-secondary">
            Панель {currentIndex + 1} из {validPanels.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Индикаторы */}
          <div className="flex items-center gap-1.5">
            {validPanels.map((panel, index) => (
              <button
                key={panel.panelNumber}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-6 bg-hh-red'
                    : 'w-2 bg-hh-gray-300 hover:bg-hh-gray-400'
                }`}
                aria-label={`Перейти к панели ${panel.panelNumber}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Карусель */}
      <div 
        ref={carouselRef}
        className="relative overflow-hidden rounded-2xl border border-hh-gray-200 bg-white"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setStartX(null);
        }}
      >
        {/* Контейнер панелей */}
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {validPanels.map((panel, index) => {
            const scheduleItem = panel.scheduleItem;
            return (
              <div
                key={`comic-panel-${panel.panelNumber}`}
                className="min-w-full flex-shrink-0"
              >
                {/* Заголовок панели */}
                {scheduleItem && (
                  <div className="border-b border-hh-gray-100 bg-hh-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{scheduleItem.emoji}</span>
                      <div className="flex-1">
                        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          {scheduleItem.time}
                        </p>
                        <h4 className="mt-0.5 text-sm font-semibold text-text-primary">
                          {scheduleItem.title}
                        </h4>
                      </div>
                    </div>
                  </div>
                )}
                {/* Изображение панели */}
                <div className="relative aspect-video w-full overflow-hidden bg-hh-gray-50">
                  <Image
                    src={panel.url}
                    alt={scheduleItem ? `Комикс: ${scheduleItem.title}` : `Панель комикса ${panel.panelNumber}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
                    priority={index === currentIndex}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Стрелки навигации */}
        {validPanels.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition hover:bg-white"
                aria-label="Предыдущая панель"
              >
                <svg className="h-6 w-6 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {currentIndex < validPanels.length - 1 && (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition hover:bg-white"
                aria-label="Следующая панель"
              >
                <svg className="h-6 w-6 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Подсказка для свайпа */}
      {validPanels.length > 1 && (
        <p className="mt-2 text-center text-xs text-text-secondary">
          👆 Проведите пальцем или мышью для навигации
        </p>
      )}
    </div>
  );
}

const tabs = [
  { id: 'overview', label: 'Обзор', emoji: '👀' },
  { id: 'schedule', label: 'Расписание', emoji: '📅' },
  { id: 'career', label: 'Карьера', emoji: '📈' },
];

type ProfessionData = {
  profession: string;
  level?: string;
  company?: string;
  displayLabels?: {
    level?: string;
    skills?: string;
    schedule?: string;
    careerPath?: string;
    stack?: string;
  };
  images?: string[];
  comicStrip?: string[]; // Панели комикса "Живой День в Комиксе"
  benefits?: { icon: string; text: string }[];
  dialog?: { message: string; options?: string[]; response: string };
  schedule?: { time: string; title: string; description: string; detail?: string; emoji?: string; soundId?: string }[];
  careerPath?: { level: string; years: string; salary: string }[];
  careerTree?: CareerTree;
  avgSalary?: number;
  vacancies?: number;
  competition?: string;
  topCompanies?: string[];
  videos?: { videoId: string; title: string; thumbnail: string; channelTitle: string }[];
  song?: { url: string; lyrics: string; title: string };
  generatedAt?: string;
  isIT?: boolean;
};

export default function ProfessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [fromChat, setFromChat] = useState(false);
  const [data, setData] = useState<ProfessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [dialogAnswer, setDialogAnswer] = useState<string | null>(null);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [activeVideo, setActiveVideo] = useState(0);
  const [isVideoOverlayOpen, setVideoOverlayOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [song, setSong] = useState<{ url: string; lyrics: string; title: string } | null>(null);
  const [isGeneratingSong, setIsGeneratingSong] = useState(false);
  const [songError, setSongError] = useState<string | null>(null);
  const { user } = useAuth();

  // Проверяем query параметр from=chat
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setFromChat(params.get('from') === 'chat');
    }
  }, []);

  const getStorageKey = () => {
    return user?.id ? `favoriteProfessions_${user.id}` : 'favoriteProfessions';
  };

  useEffect(() => {
    fetch(`/api/profession/${id}`)
      .then((response) => response.json())
      .then((payload) => {
        setData(payload);
        setActiveVideo(0);
        setLoading(false);
        
        // Проверяем, есть ли профессия в избранном
        const favorites = JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
        setIsFavorite(favorites.includes(id));
        
        // Если песня уже есть в данных, устанавливаем её
        if (payload.song) {
          setSong(payload.song);
        } else {
          // Проверяем, существует ли файл музыки
          fetch(`/generated/${id}/music/chorus.mp3`, { method: 'HEAD' })
            .then((res) => {
              if (res.ok) {
                // Если файл существует, загружаем текст припева из кеша
                fetch(`/generated/${id}/music/lyrics.json`)
                  .then((lyricsRes) => {
                    if (lyricsRes.ok) {
                      return lyricsRes.json();
                    }
                    return null;
                  })
                  .then((lyricsData) => {
                    if (lyricsData) {
                      setSong({
                        url: `/generated/${id}/music/chorus.mp3`,
                        lyrics: lyricsData.lyrics || `Профессия ${payload.profession} - это важно!`,
                        title: lyricsData.title || `Песня про ${payload.profession}`,
                      });
                    }
                  })
                  .catch(() => {
                    // Игнорируем ошибки
                  });
              }
            })
            .catch(() => {
              // Игнорируем ошибки проверки файла
            });
        }
      })
      .catch((error) => {
        console.error('Error loading profession:', error);
        setLoading(false);
      });
  }, [id, user?.id]);

  useEffect(() => {
    if (isVideoOverlayOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
    return undefined;
  }, [isVideoOverlayOpen]);

  const heroImage = useMemo(() => {
    if (data?.images && data.images.length > 0) {
      return data.images[0];
    }
    return '/generated/image-1.png';
  }, [data]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    const target = document.getElementById(tabId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const vibeLabels = ['Утро в офисе ☀️', 'Фокус & Код 💻', 'Командный вайб 🤝', 'Инсайты и обучение ✨', 'Afterwork chill 🎧'];

  const currentVideo = useMemo(() => {
    if (!data?.videos || data.videos.length === 0) {
      return null;
    }
    const safeIndex = activeVideo >= 0 && activeVideo < data.videos.length ? activeVideo : 0;
    return data.videos[safeIndex];
  }, [data, activeVideo]);

  const openVideo = (index: number) => {
    setActiveVideo(index);
    setVideoOverlayOpen(true);
  };

  const closeVideo = () => {
    setVideoOverlayOpen(false);
  };

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
    
    if (isFavorite) {
      // Удаляем из избранного
      const newFavorites = favorites.filter((fav: string) => fav !== id);
      localStorage.setItem(getStorageKey(), JSON.stringify(newFavorites));
      setIsFavorite(false);
    } else {
      // Добавляем в избранное
      favorites.push(id);
      localStorage.setItem(getStorageKey(), JSON.stringify(favorites));
      setIsFavorite(true);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/profession/${id}`;
    
    // Пытаемся использовать Web Share API если доступен
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.profession || 'Профессия',
          text: `Посмотри вайб профессии ${data?.profession || ''}!`,
          url: shareUrl,
        });
        return;
      } catch (error) {
        // Если пользователь отменил шаринг, ничего не делаем
        if ((error as Error).name === 'AbortError') return;
      }
    }
    
    // Fallback: копируем ссылку в буфер обмена
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Открываем HTML-версию в новой вкладке для печати в PDF
      const response = await fetch(`/api/profession/${id}/pdf`);
      if (response.status === 501) {
        // PDF генерация еще не реализована, используем window.print()
        window.print();
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data?.profession || 'profession'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('PDF download error:', error);
      // Fallback: открываем диалог печати браузера
      window.print();
    }
  };

  const handleGenerateSong = async () => {
    if (!data || isGeneratingSong) return;
    
    setIsGeneratingSong(true);
    setSongError(null);

    try {
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: id,
          profession: data.profession,
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось сгенерировать музыку');
      }

      // Обрабатываем SSE поток
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Не удалось получить поток данных');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (data.url && data.lyrics && data.title) {
              setSong({
                url: data.url,
                lyrics: data.lyrics,
                title: data.title,
              });
              setIsGeneratingSong(false);
              return;
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error generating song:', error);
      setSongError(error.message || 'Не удалось сгенерировать песню');
      setIsGeneratingSong(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-hh-gray-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">⏳</span>
          <p className="text-base font-medium text-text-secondary">Загружаем атмосферу профессии...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-hh-gray-50 px-6 text-center">
        <div className="text-6xl">😕</div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Мы не нашли такую профессию</h1>
          <p className="mt-2 text-sm text-text-secondary">Попробуй выбрать другую или спроси AI ассистента на главной.</p>
        </div>
        <Link
          href="/"
          className="rounded-xl bg-hh-red px-6 py-3 text-sm font-medium text-white shadow-[0_15px_30px_rgba(255,0,0,0.25)] transition hover:bg-hh-red-dark"
        >
          ← Вернуться на главную
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-hh-light">
      <header className="relative h-[360px] overflow-hidden">
        <div className="absolute inset-0">
          <Image src={heroImage} alt={data.profession} fill priority sizes="100vw" className="object-cover" />
          <div className="hh-gradient-overlay absolute inset-0" />
        </div>

        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-between px-4 py-6 text-white sm:px-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/20 text-base font-semibold backdrop-blur-md"
              aria-label="Назад к профессиям"
            >
              ←
            </Link>
          </div>

          <div className="space-y-3">
            {(data.level || data.company) && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide backdrop-blur-md">
                {data.level ?? 'Уровень не указан'}
                {data.company && (
                  <>
                    <span className="text-white/70">•</span>
                    {data.company}
                  </>
                )}
              </span>
            )}
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-tight">{data.profession}</h1>
            <p className="max-w-xl text-sm text-white/80">
              Представь, что ты уже в команде: мы собрали {data.displayLabels?.schedule?.toLowerCase() || 'расписание дня'}, {data.displayLabels?.stack?.toLowerCase() || 'стек'}, атмосферу и карьерный рост, основанные на
              данных hh.ru и опыте специалистов.
            </p>

            <div className="flex flex-wrap gap-3 text-sm">
              <StatsPill label="Вакансий" value={data.vacancies?.toLocaleString('ru-RU') ?? '—'} icon="📊" />
              <StatsPill
                label="Средняя ЗП"
                value={data.avgSalary ? `${data.avgSalary.toLocaleString('ru-RU')} ₽` : '—'}
                icon="💸"
              />
              <StatsPill label="Конкуренция" value={data.competition ?? 'Средняя'} icon="⚖️" />
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-20 -mt-12 rounded-t-3xl bg-hh-light">
        <div className="sticky top-0 z-30 -mx-4 border-b border-hh-gray-200 bg-hh-light/95 px-4 pb-2 pt-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <nav className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-hh-red text-white shadow-[0_10px_20px_rgba(255,0,0,0.25)]'
                    : 'bg-hh-gray-50 text-text-secondary hover:bg-hh-gray-100'
                }`}
              >
                <span>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-28 pt-6 sm:px-6">
          <section id="overview" className="scroll-mt-28 space-y-6">
            <ContentCard title="Визуальный вайб" subtitle="Погрузись в окружение" padding="p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {data.images?.map((image, index) => (
                  <div key={`${image}-${index}`} className="group relative aspect-square overflow-hidden rounded-2xl bg-hh-gray-100">
                    <Image
                      src={image}
                      alt={
                        index === 0 ? `Рабочее место ${data.profession}` :
                        index === 1 ? `Портрет профессионала ${data.profession}` :
                        index === 2 ? `Инструменты работы ${data.profession}` :
                        `Элементы работы ${data.profession}`
                      }
                      fill
                      sizes="(max-width: 640px) 50vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </ContentCard>

            <ContentCard title="Твоя вайбовая миссия" subtitle="Польза обществу" padding="p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {data.benefits?.slice(0, 3).map((benefit, index) => (
                  <div key={`${benefit.text}-${index}`} className="rounded-2xl border border-hh-gray-200 bg-hh-gray-50 p-4">
                    <div className="text-2xl">{benefit.icon}</div>
                    <p className="mt-3 text-sm text-text-secondary">{benefit.text}</p>
                  </div>
                ))}
              </div>
            </ContentCard>

            {data.dialog && (
              <ContentCard title="Диалог с коллегой" subtitle="Ответь на сообщение" padding="p-4 sm:p-6">
                <div className="rounded-2xl border border-hh-gray-200 bg-hh-gray-50 p-4 text-sm text-text-primary">
                  {data.dialog.message}
                </div>
                <div className="mt-4 space-y-2">
                  {dialogAnswer ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-hh-blue/10 p-3 text-sm text-hh-blue">
                        <span className="font-medium">Ты:</span> {dialogAnswer}
                      </div>
                      <div className="rounded-2xl border border-[#00a85433] bg-[#00a8541a] p-3 text-sm text-[#008246]">
                        {data.dialog.response}
                      </div>
                      <button
                        onClick={() => setDialogAnswer(null)}
                        className="text-sm font-medium text-hh-blue hover:text-hh-red"
                      >
                        ↺ Попробовать другой ответ
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs uppercase tracking-wide text-text-secondary">Выбери ответ</p>
                      {data.dialog.options?.map((option) => (
                        <button
                          key={option}
                          onClick={() => setDialogAnswer(option)}
                          className="w-full rounded-2xl border border-hh-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-text-primary transition hover:border-hh-red hover:text-hh-red"
                        >
                          {option}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </ContentCard>
            )}
          </section>

          <section id="schedule" className="scroll-mt-28 space-y-4">
            <ContentCard 
              title={data.displayLabels?.schedule || "График работы"} 
              padding="p-4 sm:p-6"
            >
              <div className="space-y-6">
                {/* Блок комикса с горизонтальной каруселью */}
                {data.comicStrip && data.comicStrip.length > 0 && (
                  <ComicCarousel 
                    comicPanels={data.comicStrip} 
                    schedule={data.schedule || []}
                    slug={id}
                  />
                )}

                {/* График работы */}
                <div className="space-y-5">
                  {data.schedule?.map((item, index) => {
                    const isOpen = selectedTime === index;
                    return (
                      <div key={`${item.time}-${index}`} className="w-full">
                        <div className="flex items-start gap-4 rounded-2xl border border-hh-gray-200 bg-white px-4 py-3 transition hover:border-hh-red">
                          <span className="text-3xl">{item.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <button 
                                onClick={() => setSelectedTime(isOpen ? null : index)} 
                                className="flex-1 text-left"
                              >
                                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-text-secondary">
                                  {item.time}
                                </p>
                                <h3 className="mt-1 text-base font-semibold text-text-primary">{item.title}</h3>
                              </button>
                              <div className="flex items-center gap-2">
                                {/* Аудио плеер для этого этапа дня */}
                                {item.soundId && (
                                  <TimelineAudioPlayer 
                                    slug={id} 
                                    soundId={item.soundId}
                                  />
                                )}
                                <button
                                  onClick={() => setSelectedTime(isOpen ? null : index)}
                                  className="text-xl text-text-secondary hover:text-hh-red"
                                >
                                  {isOpen ? '▲' : '▼'}
                                </button>
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
                            {isOpen && item.detail && (
                              <p className="mt-3 rounded-2xl bg-hh-gray-50 p-3 text-sm text-text-primary">{item.detail}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ContentCard>
          </section>

          <section id="career" className="scroll-mt-28 space-y-4">
            <ContentCard title={data.displayLabels?.careerPath || "Карьерный путь"} subtitle="Как будет развиваться твой вайб" padding="p-4 sm:p-6">
              {data.careerTree ? (
                // Новая древовидная roadmap на основе навыков
                <CareerTreeComponent careerTree={data.careerTree} />
              ) : data.careerPath ? (
                // Старая линейная roadmap (для обратной совместимости)
                <div className="relative">
                  <div className="absolute left-4 top-10 bottom-10 w-px bg-hh-gray-200 md:left-1/2 md:-translate-x-1/2" />
                  <div className="flex flex-col gap-6 md:grid md:grid-cols-2">
                    {data.careerPath.map((stage, index) => (
                      <div key={`${stage.level}-${index}`} className="relative pl-12 md:pl-0">
                        <div className="absolute left-0 top-3 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-hh-red text-sm font-semibold text-white md:left-1/2 md:-translate-x-1/2">
                          {index + 1}
                        </div>
                        <div className="mt-6 rounded-2xl border border-hh-gray-200 bg-white p-4 shadow-sm">
                          <p className="text-xs uppercase tracking-wide text-hh-red">{stage.years}</p>
                          <h3 className="mt-2 text-base font-semibold text-text-primary">{stage.level}</h3>
                          <p className="mt-2 text-sm text-text-secondary">{stage.salary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-text-secondary">Информация о карьерном пути пока недоступна</p>
              )}
            </ContentCard>

            {(data.avgSalary || data.topCompanies?.length) && (
              <ContentCard title="Рынок труда" subtitle="Данные hh.ru" padding="p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatsTile
                    label="Вакансий"
                    value={data.vacancies?.toLocaleString('ru-RU') ?? '—'}
                    description="по данным API hh.ru"
                    tone="default"
                  />
                  <StatsTile
                    label="Средняя зарплата"
                    value={data.avgSalary ? `${data.avgSalary.toLocaleString('ru-RU')} ₽` : '—'}
                    description="до вычета налогов"
                    tone="success"
                  />
                  <StatsTile
                    label="Конкуренция"
                    value={data.competition ?? 'Средняя'}
                    description="по уровню откликов"
                    tone="warning"
                  />
                </div>
                {data.topCompanies && data.topCompanies.length > 0 && (
                  <div className="mt-5">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Топ работодателей</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {data.topCompanies.map((company) => (
                        <span
                          key={company}
                          className="rounded-full border border-hh-gray-200 bg-white px-3 py-1 text-xs font-medium text-text-primary"
                        >
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </ContentCard>
            )}
          </section>

          {/* Блок с песней - предпоследний перед видео */}
          <section className="scroll-mt-28 space-y-4">
            <ContentCard title="Песня про профессию" subtitle="Вдохновляющий припев" padding="p-4 sm:p-6">
              {song ? (
                <SongPlayer songUrl={song.url} lyrics={song.lyrics} title={song.title} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                  <div className="text-5xl">🎵</div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Песня про {data.profession}</h3>
                    <p className="mt-2 text-sm text-text-secondary">
                      Сгенерируй вдохновляющий припев про эту профессию с помощью AI
                    </p>
                  </div>
                  {songError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {songError}
                    </div>
                  )}
                  <button
                    onClick={handleGenerateSong}
                    disabled={isGeneratingSong}
                    className="rounded-xl bg-hh-red px-6 py-3 text-sm font-medium text-white shadow-[0_15px_30px_rgba(255,0,0,0.25)] transition hover:bg-hh-red-dark disabled:opacity-50"
                  >
                    {isGeneratingSong ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Генерирую песню...
                      </span>
                    ) : (
                      '🎵 Сгенерировать песню'
                    )}
                  </button>
                </div>
              )}
            </ContentCard>
          </section>

          {currentVideo && data.videos && data.videos.length > 0 && (
            <ContentCard title="Видео из профессии" subtitle="Погрузись в атмосферу специалиста" padding="p-4">
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => openVideo(activeVideo)}
                  className="relative flex w-full overflow-hidden rounded-3xl bg-black text-left shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                >
                  <div className="relative w-full overflow-hidden aspect-[9/16]">
                    <img src={currentVideo.thumbnail} alt={currentVideo.title} className="absolute inset-0 h-full w-full object-cover opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />
                    <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 text-white">
                      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                        🎧 {vibeLabels[activeVideo % vibeLabels.length]}
                      </span>
                      <h3 className="text-base font-semibold leading-tight">{currentVideo.title}</h3>
                      <span className="text-xs text-white/70">{currentVideo.channelTitle}</span>
                    </div>
                    <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl text-hh-red">
                      ▶
                    </span>
                  </div>
                </button>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Выбери настроение</p>
                    <span className="text-xs text-text-secondary">{activeVideo + 1} / {data.videos.length}</span>
                  </div>
                  <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                    {data.videos.map((video, index) => {
                      const isActive = index === activeVideo;
                      return (
                        <button
                          key={video.videoId}
                          type="button"
                          onClick={() => setActiveVideo(index)}
                          className={`flex w-48 flex-col overflow-hidden rounded-2xl border bg-white text-left transition ${
                            isActive ? 'border-hh-red shadow-[0_15px_30px_rgba(255,0,0,0.2)]' : 'border-hh-gray-200'
                          }`}
                        >
                          <div className="relative aspect-[9/16] w-full overflow-hidden">
                            <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                            <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[11px] font-medium text-white">
                              {vibeLabels[index % vibeLabels.length]}
                            </span>
                            {isActive && (
                              <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-hh-red text-xs font-semibold text-white">
                                ▶
                              </span>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-1 px-3 py-3">
                            <p className="line-clamp-2 text-sm font-semibold text-text-primary">{video.title}</p>
                            <span className="text-xs text-text-secondary">{video.channelTitle}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ContentCard>
          )}

          <footer className="flex flex-col items-center gap-3 pb-10 text-center text-xs text-text-secondary">
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-hh-gray-200 px-4 py-2 text-sm font-medium text-text-primary transition hover:border-hh-red hover:text-hh-red"
              >
                ← Выбрать другую профессию
              </Link>
              <button
                onClick={toggleFavorite}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isFavorite
                    ? 'border-hh-red bg-hh-red text-white hover:bg-hh-red-dark'
                    : 'border-hh-gray-200 text-text-primary hover:border-hh-red hover:text-hh-red'
                }`}
              >
                {isFavorite ? '⭐ В избранном' : '☆ Добавить в избранное'}
              </button>
              <button
                onClick={handleShare}
                className="rounded-full border border-hh-gray-200 px-4 py-2 text-sm font-medium text-text-primary transition hover:border-hh-red hover:text-hh-red"
              >
                🔗 Поделиться
              </button>
              <button
                onClick={handleDownloadPDF}
                className="rounded-full bg-hh-red px-6 py-2 text-sm font-medium text-white shadow-[0_10px_25px_rgba(255,0,0,0.25)] transition hover:bg-hh-red-dark"
              >
                📥 Скачать PDF карточку
              </button>
            </div>
            {data.generatedAt && <p>Сгенерировано: {new Date(data.generatedAt).toLocaleString('ru-RU')}</p>}
          </footer>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 px-4 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm safe-area-inset-bottom sm:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-text-secondary">Готов попробовать?</p>
            <p className="text-sm font-semibold text-text-primary">Спроси у AI о похожих профессиях</p>
          </div>
          {fromChat && (
            <button
              onClick={() => router.back()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-hh-red text-lg text-white"
              aria-label="Вернуться в чат"
            >
              💬
            </button>
          )}
        </div>
      </div>
      {isVideoOverlayOpen && currentVideo && (
        <VideoOverlay video={currentVideo} onClose={closeVideo} />
      )}
      
      {showShareToast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 transform animate-fade-in-up rounded-full bg-[#00a854] px-6 py-3 text-sm font-medium text-white shadow-lg">
          ✅ Ссылка скопирована в буфер обмена!
        </div>
      )}
      
      <VoiceChat 
        professionName={data.profession}
        professionData={{
          level: data.level,
          company: data.company,
          schedule: data.schedule,
          benefits: data.benefits,
        }}
      />
    </div>
  );
}

function ContentCard({ title, subtitle, padding, children }: { title: string; subtitle?: string; padding?: string; children: ReactNode }) {
  return (
    <section className={`rounded-3xl border border-hh-gray-200 bg-white shadow-sm ${padding ?? 'p-6'}`}>
      <header className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-text-primary sm:text-xl">{title}</h2>
        {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function StatsPill({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-md">
      <span>{icon}</span>
      <span>{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function StatsTile({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: 'success' | 'warning' | 'default';
}) {
  const toneStyles = {
    success: 'border-[#00a85433] text-[#008246] bg-[#00a8541a]',
    warning: 'border-[#ffa50033] text-[#c67600] bg-[#ffa5001a]',
    default: 'border-hh-gray-200 text-text-primary bg-hh-gray-50',
  }[tone];

  return (
    <div className="rounded-2xl border border-hh-gray-200 bg-white p-4 text-sm shadow-sm">
      <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${toneStyles}`}>
        {value}
      </div>
      <p className="mt-2 text-xs text-text-secondary">{description}</p>
    </div>
  );
}

function VideoOverlay({ video, onClose }: { video: { videoId: string; title: string; channelTitle: string }; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 text-white safe-area-inset-top">
        <button
          onClick={onClose}
          aria-label="Закрыть видео"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl"
        >
          ×
        </button>
        <div className="flex flex-col text-right">
          <span className="text-xs text-white/60">Сейчас смотришь</span>
          <span className="text-sm font-semibold">{video.title}</span>
        </div>
      </div>
      <div className="flex flex-1 justify-center pb-6">
        <div className="relative w-full max-w-sm aspect-[9/16]">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 h-full w-full rounded-2xl"
            title={video.title}
          />
        </div>
      </div>
    </div>
  );
}