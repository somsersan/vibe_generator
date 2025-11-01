'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ChatInterface from '@/components/ChatInterface';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

const quickCategories = [
  { label: 'IT', emoji: '💻', query: 'Frontend-разработчик' },
  { label: 'Дизайн', emoji: '🎨', query: 'Дизайнер' },
  { label: 'Аналитика', emoji: '📊', query: 'Продуктовый аналитик' },
  { label: 'Общение', emoji: '🤝', query: 'Менеджер по работе с клиентами' },
];

const bottomNavItems = [
  { label: 'Главная', icon: '🏠' },
  { label: 'Профессии', icon: '🧭' },
  { label: 'Избранное', icon: '⭐️' },
  { label: 'Профиль', icon: '👤' },
];

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [availableProfessions, setAvailableProfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/professions')
      .then((res) => res.json())
      .then((data) => {
        setAvailableProfessions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading professions:', err);
        setLoading(false);
      });
  }, []);

  const filteredProfessions = useMemo(() => {
    if (!searchValue.trim()) {
      return availableProfessions;
    }
    const normalized = searchValue.toLowerCase();
    return availableProfessions.filter((prof) =>
      [prof.profession, prof.level, prof.company]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [availableProfessions, searchValue]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-hh-gray-50">
      <header className="sticky top-0 z-40 border-b border-hh-gray-200/80 bg-hh-light/95 backdrop-blur-md safe-area-inset-top">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={40} />
            <div className="hidden flex-col sm:flex">
              <span className="text-xs font-medium text-hh-red">Генератор вайба</span>
              <span className="text-sm text-text-secondary">Почувствуй профессию изнутри</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/favorites"
              aria-label="Открыть избранное"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-hh-gray-50 text-xl transition hover:bg-hh-red/10"
            >
              ⭐
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-text-secondary sm:block">{user.name}</span>
                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  aria-label="Выйти"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-hh-gray-200 text-sm transition hover:border-hh-red hover:text-hh-red"
                  title="Выйти"
                >
                  👤
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex h-10 items-center gap-2 rounded-full border border-hh-gray-200 px-4 text-sm font-medium text-text-primary transition hover:border-hh-red hover:text-hh-red"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="hh-gradient-hero text-white">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-7 pb-12 sm:px-6 sm:pt-10">
            <div className="max-w-xl space-y-3">
              <h1 className="text-[clamp(1.75rem,5vw,2.75rem)] font-bold leading-tight">
                Найди профессию, которая передает твой вайб
              </h1>
              <p className="text-base text-white/85">
                Ответь на пару вопросов, включи атмосферу и погрузись в день специалиста: задачи, диалоги, звуки,
                визуал и карьерный путь.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Какая профессия интересна?"
                  aria-label="Поиск по профессиям"
                  className="h-12 w-full rounded-xl border border-white/20 bg-white/90 px-4 pr-12 text-base text-text-primary shadow-sm placeholder:text-text-secondary/70 focus:border-hh-blue focus:outline-none focus:ring-2 focus:ring-hh-blue/40"
                />
                <svg
                  aria-hidden="true"
                  className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary/60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              <div className="flex flex-wrap gap-2">
                {['Junior', 'Стартап', 'Гибрид', 'Москва'].map((chip) => (
                  <button
                    key={chip}
                    className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition active:scale-95"
                    onClick={() => setSearchValue(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-10">
          <div className="mx-auto max-w-5xl rounded-3xl bg-hh-light px-4 py-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)] sm:px-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {quickCategories.map((category) => (
                <button
                  key={category.label}
                  onClick={() => setSearchValue(category.label)}
                  className="flex flex-col items-center rounded-2xl border border-hh-gray-200 bg-hh-light px-3 py-4 text-center transition active:scale-95"
                >
                  <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-hh-red/10 text-2xl">
                    {category.emoji}
                  </span>
                  <span className="text-xs font-medium text-text-primary">{category.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
          <button
            onClick={() => setShowChat(true)}
            className="w-full rounded-2xl border-2 border-hh-red bg-gradient-to-r from-hh-red to-hh-red/90 px-6 py-6 text-center text-base font-semibold text-white shadow-[0_10px_25px_rgba(255,0,0,0.25)] transition-all hover:shadow-[0_15px_35px_rgba(255,0,0,0.35)] active:scale-[0.98] sm:py-8 sm:text-lg"
          >
            <span className="flex items-center justify-center gap-3">
              <span className="text-2xl">📄</span>
              <span>Загрузить резюме и посмотреть вайб своей профессии</span>
              <span className="text-xl">→</span>
            </span>
          </button>
        </section>

        <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-28 pt-8 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">Популярные профессии</h2>
              <p className="text-sm text-text-secondary">Сформированы на основе запросов пользователей и данных HH.ru</p>
            </div>
            <button className="hidden items-center gap-2 rounded-full border border-hh-gray-200 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-hh-blue hover:text-hh-blue md:flex">
              Фильтры
              <span className="text-lg">⚙️</span>
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="animate-pulse rounded-2xl border border-hh-gray-200 bg-hh-gray-50 p-4">
                  <div className="aspect-[16/9] rounded-xl bg-hh-gray-200/70" />
                  <div className="mt-4 space-y-2">
                    <div className="h-4 w-3/4 rounded-full bg-hh-gray-200" />
                    <div className="h-3 w-1/2 rounded-full bg-hh-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProfessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hh-gray-200 bg-white px-6 py-16 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-text-primary">
                Мы не нашли профессию по запросу «{searchValue}»
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                Попробуй изменить параметры поиска или попроси AI подобрать альтернативу.
              </p>
              <button
                onClick={() => setShowChat(true)}
                className="mt-6 rounded-xl bg-hh-red px-5 py-3 text-sm font-medium text-white shadow-[0_10px_20px_rgba(255,0,0,0.25)] transition active:scale-95"
              >
                Спросить AI
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProfessions.map((prof) => (
                <Link
                  href={`/profession/${prof.slug}`}
                  key={prof.slug}
                  className="group block overflow-hidden rounded-2xl border border-hh-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] active:scale-[0.99]"
                >
                  {prof.image && (
                    <div className="relative aspect-[16/9] bg-hh-gray-100">
                      {prof.image.startsWith('http') ? (
                        <img
                          src={prof.image}
                          alt={prof.profession}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image src={prof.image} alt={prof.profession} fill sizes="(max-width: 768px) 100vw, 1024px" className="object-cover" priority={false} />
                      )}
                      {prof.sector && (
                        <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-text-primary backdrop-blur-sm">
                          {prof.sector}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary group-hover:text-hh-red sm:text-xl">
                          {prof.profession}
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          {prof.level} • {prof.company}
                        </p>
                      </div>
                      <span className="rounded-full bg-hh-red/10 px-3 py-1 text-xs font-medium text-hh-red">
                        {prof.workMode || 'Full time'}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                      <span className="flex items-center gap-1 font-medium text-[#00a854]">
                        ✓ {prof.vacancies ? prof.vacancies.toLocaleString('ru-RU') : '—'} вакансий
                      </span>
                      <span className="flex items-center gap-1">
                        🔔 {prof.competition || 'Средняя'} конкуренция
                      </span>
                      {prof.location && <span>📍 {prof.location}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <section className="grid gap-4 rounded-3xl border border-hh-gray-200 bg-white px-4 py-6 sm:grid-cols-3 sm:px-6">
            {[
              {
                icon: '📅',
                title: 'Типичный день',
                text: 'Понедельник или пятница — почувствуй ритм жизни профессионала.',
              },
              {
                icon: '🎧',
                title: 'Атмосфера',
                text: 'Подкасты из митингов, гул серверной или кофейни — выбирай свой вайб.',
              },
              {
                icon: '💬',
                title: 'Интерактивный чат',
                text: 'Ответь на вопросы коллег и получи фидбек, будто ты уже в команде.',
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-hh-gray-200/70 bg-hh-gray-50 p-5">
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="mt-3 text-base font-semibold text-text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{feature.text}</p>
              </div>
            ))}
          </section>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-hh-gray-200 bg-white/95 backdrop-blur-lg safe-area-inset-bottom md:hidden">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-around">
          {bottomNavItems.map((item) => {
            const isActive = item.label === 'Главная';
            const className = `flex h-full flex-1 flex-col items-center justify-center text-xs font-medium transition-colors ${
              isActive ? 'text-hh-red' : 'text-text-secondary hover:text-hh-red'
            }`;
            
            if (item.label === 'Избранное') {
              return (
                <Link
                  key={item.label}
                  href="/favorites"
                  className={className}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            }
            
            if (item.label === 'Профессии') {
              return (
                <Link
                  key={item.label}
                  href="/professions"
                  className={className}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            }
            
            return (
              <button
                key={item.label}
                className={className}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <button
        onClick={() => setShowChat(true)}
        aria-label="Открыть чат"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-hh-red text-2xl text-white shadow-[0_20px_35px_rgba(255,0,0,0.35)] transition active:scale-95 sm:bottom-28 sm:right-6"
      >
        💬
      </button>

      {showChat && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <ChatInterface onClose={() => setShowChat(false)} />
        </div>
      )}
    </div>
  );
}
