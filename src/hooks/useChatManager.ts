import { useState, useRef, useCallback } from 'react';
import { Message } from '@/types/chat.types';

const CHAT_ID_STORAGE_KEY = 'glasschat_chat_id';
const LESSON_CHAT_ID_STORAGE_KEY = 'glasschat_lesson_chat_id';

export const useChatManager = () => {
  const [regularMessages, setRegularMessages] = useState<Message[]>([]);
  const [lessonMessages, setLessonMessages] = useState<Message[]>([]);
  const [regularChatId, setRegularChatId] = useState<string | null>(null);
  const [lessonChatId, setLessonChatId] = useState<string | null>(null);
  const [isLessonMode, setIsLessonMode] = useState(false);
  const hasLoadedPreviousMessages = useRef(false);

  // Current chat ID and messages based on mode
  const currentChatId = isLessonMode ? lessonChatId : regularChatId;
  const messages = isLessonMode ? lessonMessages : regularMessages;
  const setMessages = isLessonMode ? setLessonMessages : setRegularMessages;

  const resetChat = useCallback(() => {
    // Clear all messages
    setRegularMessages([]);
    setLessonMessages([]);
    
    // Clear chat IDs from state and localStorage
    setRegularChatId(null);
    setLessonChatId(null);
    localStorage.removeItem(CHAT_ID_STORAGE_KEY);
    localStorage.removeItem(LESSON_CHAT_ID_STORAGE_KEY);
    
    // Reset lesson mode
    setIsLessonMode(false);
    
    // Reset the flag so new sessions can load
    hasLoadedPreviousMessages.current = false;
    
    console.log('Chat session reset');
  }, []);

  const updateChatId = useCallback((chatId: string) => {
    if (isLessonMode) {
      setLessonChatId(chatId);
      localStorage.setItem(LESSON_CHAT_ID_STORAGE_KEY, chatId);
    } else {
      setRegularChatId(chatId);
      localStorage.setItem(CHAT_ID_STORAGE_KEY, chatId);
    }
  }, [isLessonMode]);

  const toggleLessonMode = useCallback((enabled: boolean) => {
    setIsLessonMode(enabled);
    // Clear the flag to allow reloading messages
    hasLoadedPreviousMessages.current = false;
  }, []);

  const getStoredChatIds = useCallback(() => {
    return {
      regularChatId: localStorage.getItem(CHAT_ID_STORAGE_KEY),
      lessonChatId: localStorage.getItem(LESSON_CHAT_ID_STORAGE_KEY)
    };
  }, []);

  return {
    // State
    regularMessages,
    lessonMessages,
    regularChatId,
    lessonChatId,
    isLessonMode,
    currentChatId,
    messages,
    hasLoadedPreviousMessages,
    
    // Actions
    setRegularMessages,
    setLessonMessages,
    setRegularChatId,
    setLessonChatId,
    setMessages,
    resetChat,
    updateChatId,
    toggleLessonMode,
    getStoredChatIds,
    
    // Constants
    CHAT_ID_STORAGE_KEY,
    LESSON_CHAT_ID_STORAGE_KEY
  };
}; 