export interface ScheduleItem {
  time: string;
  title: string;
  emoji: string;
  description: string;
  detail: string;
  audioPrompt?: string; // Промпт для генерации звука (генерируется LLM)
  soundId?: string; // ID звука для этого этапа дня
}

export interface Benefit {
  icon: string;
  text: string;
}

export interface CareerStage {
  level: string;
  years: string;
  salary: string;
  current?: boolean;
}

// Древовидная структура roadmap на основе навыков
export interface SkillNode {
  id: string;
  name: string;
  level: number; // 0-100
  description: string;
  opensRoles?: string[]; // ID ролей, которые открывает этот навык
}

export interface CareerPathNode {
  id: string;
  title: string;
  type: 'current' | 'vertical' | 'horizontal' | 'alternative';
  skills: string[]; // Названия навыков для этой роли
  skillsRequired: string[]; // Навыки, которые нужно развить
  timeToReach: string;
  salaryRange: string;
  vacancies?: number;
  relatedProfessions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  benefits: string[];
  prerequisites?: string[]; // ID узлов-предшественников
  description?: string;
}

export interface CareerTree {
  currentRole: {
    title: string;
    skills: string[];
    level: string;
  };
  paths: CareerPathNode[];
  skillTree?: {
    skills: SkillNode[];
  };
}

export interface Skill {
  name: string;
  level: number;
}

export interface Dialog {
  message: string;
  options: string[];
  response: string;
}

export interface Video {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

export interface Song {
  url: string;
  lyrics: string;
  title: string;
}

export interface ProfessionData {
  profession: string;
  level: string;
  company: string;
  vacancies: number;
  competition: string;
  avgSalary?: number | null;
  topCompanies?: string[];
  schedule: ScheduleItem[];
  stack: string[];
  benefits: Benefit[];
  careerPath: CareerStage[]; // Старая линейная структура (для обратной совместимости)
  careerTree?: CareerTree; // Новая древовидная структура
  skills: Skill[];
  dialog: Dialog;
  videos?: Video[];
  song?: Song; // Песня про профессию (припев)
  slug: string;
  images: string[];
  comicStrip?: string[]; // Панели комикса "Живой День в Комиксе" (16:9 формат)
  generatedAt: string;
  isIT?: boolean;
  // Новые параметры для контекстной генерации
  companySize?: 'startup' | 'medium' | 'large' | 'any';
  location?: 'moscow' | 'spb' | 'other' | 'remote';
  specialization?: string;
  // Предпочтения пользователя для персонализации
  userPreferences?: {
    location?: 'moscow' | 'spb' | 'other' | 'remote';
    companySize?: 'startup' | 'medium' | 'large' | 'any';
    specialization?: string;
    motivation?: string;
    workStyle?: string;
  };
}

