import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Загружаем данные профессии
    const dataPath = path.join(process.cwd(), 'data', 'professions', `${id}.json`);
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json(
        { error: 'Profession not found' },
        { status: 404 }
      );
    }
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    // Генерируем HTML для PDF
    const html = generatePDFHTML(data);
    
    // TODO: Использовать библиотеку для генерации PDF из HTML
    // Например: puppeteer, jsPDF, или PDF-lib
    // Пока возвращаем заглушку
    
    return new NextResponse(
      JSON.stringify({
        message: 'PDF generation is not yet implemented',
        profession: data.profession,
        html: html.substring(0, 200) + '...',
      }),
      {
        status: 501, // Not Implemented
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', message: error?.message },
      { status: 500 }
    );
  }
}

function generatePDFHTML(data: any): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${data.profession} - Карточка профессии</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      color: #d6001c;
    }
    h2 {
      font-size: 24px;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #1a1a1a;
    }
    h3 {
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .header {
      border-bottom: 3px solid #d6001c;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .meta {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .schedule-item {
      margin-bottom: 15px;
      padding: 10px;
      border-left: 3px solid #d6001c;
      background: #f9f9f9;
    }
    .schedule-time {
      font-weight: bold;
      color: #d6001c;
    }
    .skills-list, .stack-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .skill-tag, .stack-tag {
      background: #f0f0f0;
      padding: 5px 12px;
      border-radius: 15px;
      font-size: 14px;
    }
    .career-step {
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-top: 20px;
    }
    .stat-box {
      padding: 15px;
      background: #f9f9f9;
      border-radius: 8px;
      text-align: center;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #d6001c;
      margin-top: 5px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.profession}</h1>
    ${data.level || data.company ? `
      <div class="meta">
        ${data.level ? data.level : ''} 
        ${data.level && data.company ? '•' : ''} 
        ${data.company ? data.company : ''}
      </div>
    ` : ''}
  </div>

  ${data.avgSalary || data.vacancies || data.competition ? `
    <div class="section">
      <h2>📊 Статистика рынка</h2>
      <div class="stats">
        ${data.vacancies ? `
          <div class="stat-box">
            <div class="stat-label">Вакансий</div>
            <div class="stat-value">${data.vacancies.toLocaleString('ru-RU')}</div>
          </div>
        ` : ''}
        ${data.avgSalary ? `
          <div class="stat-box">
            <div class="stat-label">Средняя ЗП</div>
            <div class="stat-value">${data.avgSalary.toLocaleString('ru-RU')} ₽</div>
          </div>
        ` : ''}
        ${data.competition ? `
          <div class="stat-box">
            <div class="stat-label">Конкуренция</div>
            <div class="stat-value">${data.competition}</div>
          </div>
        ` : ''}
      </div>
    </div>
  ` : ''}

  ${data.schedule && data.schedule.length > 0 ? `
    <div class="section">
      <h2>📅 Типичный рабочий день</h2>
      ${data.schedule.map((item: any) => `
        <div class="schedule-item">
          <div class="schedule-time">${item.time}</div>
          <div><strong>${item.title}</strong></div>
          <div>${item.description}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${data.stack && data.stack.length > 0 ? `
    <div class="section">
      <h2>⚙️ Технический стек</h2>
      <div class="stack-list">
        ${data.stack.map((tech: string) => `<span class="stack-tag">${tech}</span>`).join('')}
      </div>
    </div>
  ` : ''}

  ${data.skills && data.skills.length > 0 ? `
    <div class="section">
      <h2>🎯 Ключевые навыки</h2>
      <div class="skills-list">
        ${data.skills.map((skill: any) => `
          <span class="skill-tag">${skill.name} (${skill.level}%)</span>
        `).join('')}
      </div>
    </div>
  ` : ''}

  ${data.careerPath && data.careerPath.length > 0 ? `
    <div class="section">
      <h2>📈 Карьерный путь</h2>
      ${data.careerPath.map((stage: any, index: number) => `
        <div class="career-step">
          <h3>${index + 1}. ${stage.level}</h3>
          <div><strong>Срок:</strong> ${stage.years}</div>
          <div><strong>Зарплата:</strong> ${stage.salary}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${data.benefits && data.benefits.length > 0 ? `
    <div class="section">
      <h2>✨ Твоя вайбовая миссия</h2>
      <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Польза обществу</p>
      ${data.benefits.map((benefit: any) => `
        <div style="margin-bottom: 10px;">
          <strong>${benefit.icon}</strong> ${benefit.text}
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div class="footer">
    <p>Сгенерировано на hh.ru Vibe Generator</p>
    ${data.generatedAt ? `<p>${new Date(data.generatedAt).toLocaleString('ru-RU')}</p>` : ''}
  </div>
</body>
</html>
  `;
}

