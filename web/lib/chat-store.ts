import { create } from 'zustand';
import { ChatState, Message, UserPersona } from '@/types/chat';

interface ChatStorage {
  messages: Message[];
  persona: UserPersona | null;
  conversationStage: ChatState['conversationStage'];
}

const getStorageKey = (userId: string | null) => {
  return userId ? `hh_chats_${userId}` : 'hh_chats_guest';
};

const loadFromStorage = (userId: string | null): ChatStorage => {
  if (typeof window === 'undefined') {
    return { messages: [], persona: null, conversationStage: 'initial' };
  }
  
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading chat from storage:', error);
  }
  
  return { messages: [], persona: null, conversationStage: 'initial' };
};

const saveToStorage = (userId: string | null, data: ChatStorage) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(data));
  } catch (error) {
    console.error('Error saving chat to storage:', error);
  }
};

export const useChatStore = create<ChatState & { userId: string | null; setUserId: (id: string | null) => void }>((set, get) => ({
  messages: [],
  isTyping: false,
  persona: null,
  conversationStage: 'initial',
  userId: null,
  
  setUserId: (userId: string | null) => {
    // При смене пользователя загружаем его чаты
    const stored = loadFromStorage(userId);
    set({
      userId,
      messages: stored.messages,
      persona: stored.persona,
      conversationStage: stored.conversationStage,
    });
  },
  
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    set((state) => {
      const newState = {
        ...state,
        messages: [...state.messages, newMessage],
      };
      // Сохраняем в localStorage
      saveToStorage(state.userId, {
        messages: newState.messages,
        persona: newState.persona,
        conversationStage: newState.conversationStage,
      });
      return newState;
    });
  },
  
  setTyping: (isTyping) => set({ isTyping }),
  
  setPersona: (persona) => {
    set((state) => {
      const newState = { ...state, persona };
      saveToStorage(state.userId, {
        messages: newState.messages,
        persona: newState.persona,
        conversationStage: newState.conversationStage,
      });
      return newState;
    });
  },
  
  setConversationStage: (stage) => {
    set((state) => {
      const newState = { ...state, conversationStage: stage };
      saveToStorage(state.userId, {
        messages: newState.messages,
        persona: newState.persona,
        conversationStage: newState.conversationStage,
      });
      return newState;
    });
  },
  
  clearChat: () => {
    set((state) => {
      const newState = {
        ...state,
        messages: [],
        isTyping: false,
        persona: null,
        conversationStage: 'initial' as const,
      };
      saveToStorage(state.userId, {
        messages: [],
        persona: null,
        conversationStage: 'initial',
      });
      return newState;
    });
  },
}));

