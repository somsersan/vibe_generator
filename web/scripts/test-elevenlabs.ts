/**
 * Тестовый скрипт для проверки ElevenLabs API с прокси
 */
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

// Загружаем переменные окружения
dotenv.config({ path: '.env.local' });

// Настройка прокси
import "../lib/proxy-config";

async function testElevenLabsAPI() {
  console.log('\n🧪 Тестирование ElevenLabs API...\n');
  
  const API_KEY = process.env.ELEVENLABS_API_KEY;
  
  if (!API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY не найден в .env.local');
    process.exit(1);
  }
  
  console.log('✅ API ключ найден:', API_KEY.substring(0, 20) + '...');
  console.log('🌐 Прокси:', process.env.HTTPS_PROXY ? 'Настроен' : 'Не настроен');
  
  // Тест 1: Проверка информации о пользователе
  console.log('\n📋 Тест 1: Получение информации о пользователе...');
  
  try {
    const userResponse = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': API_KEY,
      },
      // @ts-ignore
      agent: process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined,
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`❌ Ошибка ${userResponse.status}:`, errorText);
      
      if (userResponse.status === 401) {
        console.log('\n💡 Возможные причины ошибки 401:');
        console.log('   1. Неверный API ключ');
        console.log('   2. Проблема с оплатой подписки');
        console.log('   3. API ключ отозван');
        console.log('\n🔗 Проверьте ваш аккаунт: https://elevenlabs.io/app/settings/api-keys');
      }
      
      if (userResponse.status === 302) {
        console.log('\n💡 Региональное ограничение:');
        console.log('   ElevenLabs блокирует доступ из вашего региона');
        console.log('   Требуется VPN или прокси');
      }
      
      return;
    }
    
    const userData = await userResponse.json();
    console.log('✅ Пользователь:', JSON.stringify(userData, null, 2));
    
    // Тест 2: Получение доступных моделей
    console.log('\n📋 Тест 2: Получение доступных моделей...');
    
    const modelsResponse = await fetch('https://api.elevenlabs.io/v1/models', {
      method: 'GET',
      headers: {
        'xi-api-key': API_KEY,
      },
      // @ts-ignore
      agent: process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined,
    });
    
    if (modelsResponse.ok) {
      const models = await modelsResponse.json();
      console.log('✅ Доступные модели:', models);
    } else {
      console.log('⚠️ Не удалось получить модели');
    }
    
    // Тест 3: Тестовая генерация короткого звука (если есть квота)
    console.log('\n📋 Тест 3: Генерация тестового звука...');
    console.log('⏳ Генерирую "simple keyboard click sound"...');
    
    const soundResponse = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'simple keyboard click sound',
        duration_seconds: 1,
        prompt_influence: 0.5,
      }),
      // @ts-ignore
      agent: process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined,
    });
    
    if (!soundResponse.ok) {
      const errorText = await soundResponse.text();
      console.error(`❌ Ошибка генерации звука ${soundResponse.status}:`, errorText);
      return;
    }
    
    const soundBlob = await soundResponse.arrayBuffer();
    console.log(`✅ Звук сгенерирован: ${soundBlob.byteLength} байт`);
    
    console.log('\n✅ Все тесты пройдены! ElevenLabs API работает корректно.');
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Проблема с подключением. Проверьте:');
      console.log('   1. Доступ к интернету');
      console.log('   2. Настройки прокси');
    }
  }
}

testElevenLabsAPI().catch(console.error);

