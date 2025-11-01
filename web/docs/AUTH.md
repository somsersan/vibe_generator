# Система авторизации

Простая mock-авторизация для хакathon проекта без использования базы данных.

## Как это работает

1. **Хранение данных**: Все данные пользователя хранятся в `localStorage` браузера
2. **Авторизация**: Пользователь вводит имя и email на странице `/login`
3. **Изоляция данных**: 
   - Чаты сохраняются по ключу `hh_chats_{userId}`
   - Избранное сохраняется по ключу `favoriteProfessions_{userId}`

## Структура

- `lib/auth-context.tsx` - React контекст для управления авторизацией
- `app/login/page.tsx` - Страница входа
- `lib/chat-store.ts` - Обновлен для сохранения чатов по userId
- `app/favorites/page.tsx` - Обновлен для работы с userId
- `app/profession/[id]/page.tsx` - Обновлен для работы с userId

## Использование

```tsx
import { useAuth } from '@/lib/auth-context';

function MyComponent() {
  const { user, login, logout, isLoading } = useAuth();
  
  if (isLoading) return <div>Загрузка...</div>;
  if (!user) return <Link href="/login">Войти</Link>;
  
  return <div>Привет, {user.name}!</div>;
}
```

## Особенности

- **Нет БД**: Все данные в localStorage
- **Mock авторизация**: Не требуется пароль, только имя и email
- **Персистентность**: Данные сохраняются между сессиями
- **Изоляция**: Каждый пользователь видит только свои чаты и избранное

## Для продакшена

Для реального приложения стоит:
1. Добавить реальную БД (PostgreSQL/MongoDB)
2. Использовать NextAuth.js или аналогичное решение
3. Добавить валидацию и безопасность
4. Использовать cookies или JWT токены

