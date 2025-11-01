export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageType = 'text' | 'buttons' | 'cards' | 'questions';

export interface Message {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: number;
  buttons?: string[];
  cards?: ProfessionCard[];
  metadata?: Record<string, any>;
}

export interface ProfessionCard {
  slug: string;
  profession: string;
  level: string;
  company: string;
  image?: string;
  description?: string;
}

export interface UserPersona {
  experience?: string; // junior, middle, senior
  interests?: string[];
  currentRole?: string;
  goals?: string[];
  isUncertain?: boolean;
  skills?: string[]; // Навыки пользователя
  // Новые параметры для уточнения профессии
  companySize?: 'startup' | 'medium' | 'large' | 'any'; // Размер компании
  location?: 'moscow' | 'spb' | 'other' | 'remote'; // Локация работы
  specialization?: string; // Специализация внутри профессии
  // Параметры для сценария "не знаю профессию"
  workStyle?: string; // Стиль работы (в команде / самостоятельно)
  values?: string; // Ценности (стабильность / драйв / смысл / творчество)
  motivation?: string; // Мотивация / что важно в работе
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  persona: UserPersona | null;
  conversationStage: 'initial' | 'clarifying' | 'exploring' | 'showing_results';
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setTyping: (isTyping: boolean) => void;
  setPersona: (persona: UserPersona) => void;
  setConversationStage: (stage: ChatState['conversationStage']) => void;
  clearChat: () => void;
}

export interface ChatRequest {
  message: string;
  history: Message[];
  persona?: UserPersona;
}

// Тип для ответного сообщения от API (без id, role, timestamp - они добавляются на клиенте)
export interface ResponseMessage {
  type: MessageType;
  content: string;
  buttons?: string[];
  cards?: ProfessionCard[];
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  message: ResponseMessage;
  persona?: UserPersona;
  stage?: ChatState['conversationStage'];
}

