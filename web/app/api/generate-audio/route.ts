import { NextRequest, NextResponse } from 'next/server';
import { generateProfessionAudio, checkCachedAudio, AUDIO_PROFILES } from '@/lib/audio-generator';

export const maxDuration = 300; // 5 минут для генерации всех звуков

/**
 * POST /api/generate-audio
 * Генерирует звуковые эффекты для профессии
 */
export async function POST(request: NextRequest) {
  try {
    const { slug, profession, schedule, isIT } = await request.json();
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Missing required parameter: slug' },
        { status: 400 }
      );
    }
    
    // Проверяем кеш
    const hasCached = await checkCachedAudio(slug);
    if (hasCached) {
      return NextResponse.json({
        message: 'Audio already generated',
        cached: true,
      });
    }
    
    // Генерируем звуки (функция сама найдет профиль или создаст универсальный)
    const audioData = await generateProfessionAudio(
      slug,
      undefined,
      {
        profession,
        schedule,
        isIT,
      }
    );
    
    return NextResponse.json({
      message: 'Audio generated successfully',
      data: audioData,
    });
    
  } catch (error: any) {
    console.error('Error generating audio:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate audio' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-audio?slug=frontend-developer
 * Проверяет наличие звуков для профессии
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (!slug) {
      // Возвращаем список доступных профилей
      return NextResponse.json({
        availableProfiles: Object.keys(AUDIO_PROFILES),
        profiles: AUDIO_PROFILES,
      });
    }
    
    const hasCached = await checkCachedAudio(slug);
    const hasProfile = !!AUDIO_PROFILES[slug];
    
    const profile = hasProfile ? AUDIO_PROFILES[slug] : null;
    
    return NextResponse.json({
      slug,
      hasProfile,
      hasCached,
      profile,
      // Возвращаем timelineSounds для совместимости
      timelineSounds: profile?.timelineSounds || [],
    });
    
  } catch (error: any) {
    console.error('Error checking audio:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check audio' },
      { status: 500 }
    );
  }
}

