'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';

interface FavoriteProfession {
  slug: string;
  profession: string;
  level?: string;
  company?: string;
  images?: string[];
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteProfession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const getStorageKey = () => {
    return user?.id ? `favoriteProfessions_${user.id}` : 'favoriteProfessions';
  };

  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadFavorites = async () => {
    try {
      const favoriteIds = JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
      
      if (favoriteIds.length === 0) {
        setLoading(false);
        return;
      }

      // Загружаем данные для каждой избранной профессии
      const promises = favoriteIds.map((id: string) =>
        fetch(`/api/profession/${id}`).then((res) => res.json())
      );

      const results = await Promise.all(promises);
      setFavorites(results.filter((r) => r && r.slug));
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = (slug: string) => {
    const favoriteIds = JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
    const newFavorites = favoriteIds.filter((id: string) => id !== slug);
    localStorage.setItem(getStorageKey(), JSON.stringify(newFavorites));
    setFavorites(favorites.filter((f) => f.slug !== slug));
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-hh-gray-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">⏳</span>
          <p className="text-base font-medium text-text-secondary">Загружаем избранное...</p>
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
                <h1 className="text-xl font-bold text-text-primary">⭐ Избранное</h1>
                <p className="text-sm text-text-secondary">
                  {favorites.length} {favorites.length === 1 ? 'профессия' : 'профессий'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <div className="text-6xl">☆</div>
            <div>
              <h2 className="text-2xl font-semibold text-text-primary">Пока пусто</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Добавляй профессии в избранное, чтобы быстро возвращаться к ним
              </p>
            </div>
            <Link
              href="/"
              className="rounded-xl bg-hh-red px-6 py-3 text-sm font-medium text-white shadow-[0_15px_30px_rgba(255,0,0,0.25)] transition hover:bg-hh-red-dark"
            >
              Искать профессии
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((profession) => (
              <div
                key={profession.slug}
                className="group relative overflow-hidden rounded-2xl border border-hh-gray-200 bg-white shadow-sm transition hover:shadow-lg"
              >
                <Link href={`/profession/${profession.slug}`} className="block">
                  <div className="relative aspect-[16/9] overflow-hidden bg-hh-gray-100">
                    {profession.images && profession.images[0] ? (
                      <Image
                        src={profession.images[0]}
                        alt={profession.profession}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">
                        💼
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-text-primary line-clamp-2">
                      {profession.profession}
                    </h3>
                    {(profession.level || profession.company) && (
                      <p className="mt-1 text-xs uppercase tracking-wide text-text-secondary">
                        {profession.level}
                        {profession.level && profession.company && ' • '}
                        {profession.company}
                      </p>
                    )}
                  </div>
                </Link>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromFavorites(profession.slug);
                  }}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base backdrop-blur-sm transition hover:bg-hh-red hover:text-white"
                  aria-label="Удалить из избранного"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

