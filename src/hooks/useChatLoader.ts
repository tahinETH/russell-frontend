import { useEffect, useCallback } from 'react';
import { Message, MessageResponse, ChatWithMessages } from '@/types/chat.types';

type ApiClient = {
  get: <T>(url: string, params?: any) => Promise<T>
};

interface UseChatLoaderProps {
  api: ApiClient;
  isSignedIn: boolean | undefined;
  isLessonMode: boolean;
  hasLoadedPreviousMessages: React.MutableRefObject<boolean>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setRegularChatId: (id: string | null) => void;
  setLessonChatId: (id: string | null) => void;
  setIsLoadingPreviousMessages: (loading: boolean) => void;
  CHAT_ID_STORAGE_KEY: string;
  LESSON_CHAT_ID_STORAGE_KEY: string;
}

export const useChatLoader = ({
  api,
  isSignedIn,
  isLessonMode,
  hasLoadedPreviousMessages,
  setMessages,
  setRegularChatId,
  setLessonChatId,
  setIsLoadingPreviousMessages,
  CHAT_ID_STORAGE_KEY,
  LESSON_CHAT_ID_STORAGE_KEY
}: UseChatLoaderProps) => {
  
  const loadPreviousChat = useCallback(async () => {
    if (!isSignedIn || hasLoadedPreviousMessages.current) return;
    
    // Load both regular and lesson chat IDs
    const storedRegularChatId = localStorage.getItem(CHAT_ID_STORAGE_KEY);
    const storedLessonChatId = localStorage.getItem(LESSON_CHAT_ID_STORAGE_KEY);
    
    // Set the IDs if they exist
    if (storedRegularChatId) {
      setRegularChatId(storedRegularChatId);
    }
    if (storedLessonChatId) {
      setLessonChatId(storedLessonChatId);
    }
    
    // Load messages from the appropriate chat based on current mode
    const chatIdToLoad = isLessonMode ? storedLessonChatId : storedRegularChatId;
    
    if (!chatIdToLoad) return;

    setIsLoadingPreviousMessages(true);
    hasLoadedPreviousMessages.current = true;

    try {
      const chatWithMessages = await api.get<ChatWithMessages>(`/chats/${chatIdToLoad}`);
      
      // Transform backend messages to frontend format
      const transformedMessages: Message[] = chatWithMessages.messages.map((msg: MessageResponse) => ({
        type: msg.role === 'user' ? 'user' : 'ai',
        content: msg.content,
        id: msg.id,
        chatId: msg.chat_id,
        timestamp: new Date(msg.created_at),
        isLoading: false,
        hasAudio: false, // Previous messages don't have audio playback
        // Handle images from database
        imageUrl: msg.images && msg.images.length > 0 ? msg.images[0].image_url : undefined
      }));
      console.log('transformedMessages', transformedMessages);
      
      setMessages(transformedMessages);
      console.log(`Loaded ${transformedMessages.length} messages from previous session`);
    } catch (error) {
      console.error('Failed to load previous chat session:', error);
      // Clear invalid chat ID from storage
      if (isLessonMode) {
        localStorage.removeItem(LESSON_CHAT_ID_STORAGE_KEY);
      } else {
        localStorage.removeItem(CHAT_ID_STORAGE_KEY);
      }
    } finally {
      setIsLoadingPreviousMessages(false);
    }
  }, [
    isSignedIn,
    isLessonMode,
    api,
    hasLoadedPreviousMessages,
    setMessages,
    setRegularChatId,
    setLessonChatId,
    setIsLoadingPreviousMessages,
    CHAT_ID_STORAGE_KEY,
    LESSON_CHAT_ID_STORAGE_KEY
  ]);

  // Load previous chat session on component mount
  useEffect(() => {
    loadPreviousChat();
  }, [loadPreviousChat]);

  return {
    loadPreviousChat
  };
}; 