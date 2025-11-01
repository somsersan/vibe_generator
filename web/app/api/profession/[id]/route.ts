import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { determineProfessionType } from '@/lib/card-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Путь к JSON файлу профессии
    const filePath = path.join(process.cwd(), 'data', 'professions', `${id}.json`);
    
    // Читаем файл
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Если поле isIT отсутствует, определяем его
    if (data.isIT === undefined && data.profession) {
      data.isIT = await determineProfessionType(data.profession);
    }
    
    // Фильтруем placeholder URLs из comicStrip, если они есть
    if (data.comicStrip && Array.isArray(data.comicStrip)) {
      data.comicStrip = data.comicStrip.filter((url: string) => !url.startsWith('https://placehold.co'));
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error loading profession:', error);
    
    if (error.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Profession not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

