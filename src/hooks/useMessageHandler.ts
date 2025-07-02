import { useCallback } from 'react';
import { Message, QueryResponse } from '@/types/chat.types';

type ApiClient = {
  get: <T>(url: string, params?: any) => Promise<T>
  post: <T>(url: string, data?: any) => Promise<T>
  delete: <T>(url: string, params?: any) => Promise<T>
};

interface UseMessageHandlerProps {
  api: ApiClient;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentChatId: string | null;
  isLessonMode: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onNewAiMessage?: (message: string) => void;
  updateChatId: (chatId: string) => void;
  playAudio: (base64Audio: string, format?: string) => Promise<void>;
  stopAudio: () => void;
}

export const useMessageHandler = ({
  api,
  isLoading,
  setIsLoading,
  currentChatId,
  isLessonMode,
  messages,
  setMessages,
  onNewAiMessage,
  updateChatId,
  playAudio,
  stopAudio
}: UseMessageHandlerProps) => {
  
  const submitMessage = useCallback(async (inputMessage: string) => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Add loading AI message
    const loadingMessage: Message = {
      id: `ai-${Date.now()}`,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };
    setMessages(prev => [...prev, loadingMessage]);
    
    setIsLoading(true);
    stopAudio(); // Stop any currently playing audio
    
    try {
      const data: QueryResponse = await api.post('/query', {
        query: inputMessage,
        enable_voice: true,
        ...(currentChatId && { chat_id: currentChatId }),
        ...(isLessonMode && { lesson: 'blackholes' })
      });
      
      setMessages(prev => prev.map(msg => {
        if (msg.isLoading && msg.type === 'ai') {
          return {
            ...msg,
            content: data.text_response,
            isLoading: false,
            hasAudio: !!data.audio_base64,
            chatId: data.chat_id
          };
        }
        return msg;
      }));

      // Notify parent component of new AI message
      if (onNewAiMessage) {
        onNewAiMessage(data.text_response);
      }

      // Update appropriate chat ID based on mode
      if (data.chat_id) {
        updateChatId(data.chat_id);
      }

      // Play audio if available
      if (data.audio_base64) {
        try {
          await playAudio(data.audio_base64, data.audio_format || 'mp3');
        } catch (error) {
          console.error('Audio playback failed:', error);
        }
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(msg => {
        if (msg.isLoading && msg.type === 'ai') {
          return {
            ...msg,
            content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
            isLoading: false
          };
        }
        return msg;
      }));
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    currentChatId,
    isLessonMode,
    api,
    setMessages,
    setIsLoading,
    stopAudio,
    onNewAiMessage,
    updateChatId,
    playAudio
  ]);

  return {
    submitMessage
  };
}; 