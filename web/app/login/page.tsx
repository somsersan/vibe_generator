'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Если пользователь уже авторизован, перенаправляем на главную
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    // Простая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Пожалуйста, введите корректный email');
      return;
    }

    setIsSubmitting(true);
    
    // Имитируем небольшую задержку для UX
    setTimeout(() => {
      login(name, email);
      setIsSubmitting(false);
      router.push('/');
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-hh-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-text-secondary">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Будет редирект через useEffect
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-hh-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-hh-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-hh-red text-2xl font-bold text-white">
                hh
              </div>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Добро пожаловать!</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Войдите, чтобы сохранять чаты и избранное
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-text-primary">
                Ваше имя
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-hh-gray-200 bg-hh-gray-50 px-4 py-3 text-base text-text-primary placeholder:text-text-secondary/60 focus:border-hh-blue focus:outline-none focus:ring-2 focus:ring-hh-blue/30 disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-text-primary">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-hh-gray-200 bg-hh-gray-50 px-4 py-3 text-base text-text-primary placeholder:text-text-secondary/60 focus:border-hh-blue focus:outline-none focus:ring-2 focus:ring-hh-blue/30 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !email.trim()}
              className="w-full rounded-xl bg-hh-red px-6 py-3 text-base font-medium text-white shadow-[0_10px_20px_rgba(255,0,0,0.25)] transition hover:bg-hh-red-dark disabled:bg-hh-gray-200 disabled:text-text-secondary disabled:shadow-none"
            >
              {isSubmitting ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-text-secondary">
              Это демо-версия для хакathon. Данные хранятся локально.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-text-secondary hover:text-hh-red transition-colors"
          >
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}

