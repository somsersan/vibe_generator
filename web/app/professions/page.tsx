'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';

interface Profession {
  slug: string;
  profession: string;
  level?: string;
  company?: string;
  vacancies?: number;
  competition?: string;
  image?: string;
  workMode?: string;
  location?: string;
  sector?: string;
}

export default function ProfessionsPage() {
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetch('/api/professions')
      .then((res) => res.json())
      .then((data) => {
        setProfessions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading professions:', err);
        setLoading(false);
      });
  }, []);

  const filteredProfessions = useMemo(() => {
    if (!searchValue.trim()) {
      return professions;
    }
    const normalized = searchValue.toLowerCase();
    return professions.filter((prof) =>
      [prof.profession, prof.level, prof.company]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [professions, searchValue]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-hh-gray-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">⏳</span>
          <p className="text-base font-medium text-text-secondary">Загружаем профессии...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-hh-gray-50">
      <header className="sticky top-0 z-30 border-b border-hh-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hh-gray-200 text-lg transition hover:border-hh-red hover:text-hh-red"
                aria-label="На главную"
              >
                ←
              </Link>
              <div>
                <h1 className="text-xl font-bold text-text-primary">🧭 Профессии</h1>
                <p className="text-sm text-text-secondary">
                  {professions.length} {professions.length === 1 ? 'профессия' : 'профессий'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="relative">
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Поиск по профессиям..."
              aria-label="Поиск по профессиям"
              className="h-12 w-full rounded-xl border border-hh-gray-200 bg-white px-4 pr-12 text-base text-text-primary shadow-sm placeholder:text-text-secondary/70 focus:border-hh-blue focus:outline-none focus:ring-2 focus:ring-hh-blue/40"
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
        </div>

        {filteredProfessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <div className="text-6xl">🔍</div>
            <div>
              <h2 className="text-2xl font-semibold text-text-primary">
                {searchValue ? `Ничего не найдено по запросу «${searchValue}»` : 'Профессии не найдены'}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                {searchValue
                  ? 'Попробуйте изменить параметры поиска'
                  : 'Профессии будут добавлены позже'}
              </p>
            </div>
            {searchValue && (
              <button
                onClick={() => setSearchValue('')}
                className="rounded-xl bg-hh-red px-6 py-3 text-sm font-medium text-white shadow-[0_15px_30px_rgba(255,0,0,0.25)] transition hover:bg-hh-red-dark"
              >
                Очистить поиск
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProfessions.map((profession) => (
              <Link
                href={`/profession/${profession.slug}`}
                key={profession.slug}
                className="group block overflow-hidden rounded-2xl border border-hh-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] active:scale-[0.99]"
              >
                {profession.image && (
                  <div className="relative aspect-[16/9] bg-hh-gray-100">
                    {profession.image.startsWith('http') ? (
                      <img
                        src={profession.image}
                        alt={profession.profession}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={profession.image}
                        alt={profession.profession}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        priority={false}
                      />
                    )}
                    {profession.sector && (
                      <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-text-primary backdrop-blur-sm">
                        {profession.sector}
                      </span>
                    )}
                  </div>
                )}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary group-hover:text-hh-red sm:text-xl">
                        {profession.profession}
                      </h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        {profession.level}
                        {profession.level && profession.company && ' • '}
                        {profession.company}
                      </p>
                    </div>
                    {profession.workMode && (
                      <span className="rounded-full bg-hh-red/10 px-3 py-1 text-xs font-medium text-hh-red whitespace-nowrap">
                        {profession.workMode}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                    {profession.vacancies !== undefined && (
                      <span className="flex items-center gap-1 font-medium text-[#00a854]">
                        ✓ {profession.vacancies.toLocaleString('ru-RU')} вакансий
                      </span>
                    )}
                    {profession.competition && (
                      <span className="flex items-center gap-1">
                        🔔 {profession.competition} конкуренция
                      </span>
                    )}
                    {profession.location && <span>📍 {profession.location}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-hh-gray-200 bg-white/95 backdrop-blur-lg safe-area-inset-bottom md:hidden">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-around">
          {[
            { label: 'Главная', icon: '🏠', href: '/' },
            { label: 'Профессии', icon: '🧭', href: '/professions' },
            { label: 'Избранное', icon: '⭐️', href: '/favorites' },
            { label: 'Профиль', icon: '👤', href: '#' },
          ].map((item) => {
            const isActive = item.label === 'Профессии';
            const className = `flex h-full flex-1 flex-col items-center justify-center text-xs font-medium transition-colors ${
              isActive ? 'text-hh-red' : 'text-text-secondary hover:text-hh-red'
            }`;
            
            if (item.href === '#') {
              return (
                <button
                  key={item.label}
                  className={className}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              );
            }
            
            return (
              <Link
                key={item.label}
                href={item.href}
                className={className}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

