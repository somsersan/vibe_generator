import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'professions');
    
    // Проверяем существует ли директория
    try {
      await fs.access(dataDir);
    } catch {
      // Директория не существует, возвращаем пустой массив
      return NextResponse.json([]);
    }
    
    const files = await fs.readdir(dataDir);
    
    const professions = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
          const data = JSON.parse(content);
          return {
            slug: data.slug,
            profession: data.profession,
            level: data.level,
            company: data.company,
            vacancies: data.vacancies,
            competition: data.competition,
            location: data.location,
            image: data.images?.[0] || null,
          };
        })
    );

    return NextResponse.json(professions);
  } catch (error) {
    console.error('Error loading professions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

