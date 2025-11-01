import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API ключ не настроен' },
        { status: 500 }
      );
    }

    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error('Error getting token:', error);
    return NextResponse.json(
      { error: 'Ошибка получения токена' },
      { status: 500 }
    );
  }
}

