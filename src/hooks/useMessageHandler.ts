import { useCallback, useRef, useState } from 'react';
import { Message } from '@/types/chat.types';
import { initializeChatWsManager } from './useChatWsManager';
import ChatWsManager from '@/utils/ChatWsManager';

interface UseMessageHandlerProps {
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
  startVoiceStreaming: () => void;
  endVoiceStreaming: () => void;
  authToken: string;
}

export const useMessageHandler = ({
  isLoading,
  setIsLoading,
  currentChatId,
  isLessonMode,
  messages,
  setMessages,
  onNewAiMessage,
  updateChatId,
  playAudio,
  stopAudio,
  startVoiceStreaming,
  endVoiceStreaming,
  authToken
}: UseMessageHandlerProps) => {
  
  const wsManagerRef = useRef<ChatWsManager | null>(null);
  const [isVoiceStreaming, setIsVoiceStreaming] = useState(false);
  const audioChunksRef = useRef<{data: string, format: string}[]>([]);
  const currentMessageIdRef = useRef<string | null>(null);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  
  const submitMessage = useCallback(async (inputMessage: string, enableImage: boolean = true, enableVoice: boolean = true) => {
    if (!inputMessage.trim() || isLoading) return;
    if (!authToken) {
      console.error('No auth token available');
      return;
    }
    
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
    currentMessageIdRef.current = loadingMessage.id;
    
    setIsLoading(true);
    stopAudio(); // Stop any currently playing audio
    setIsVoiceStreaming(false);
    audioChunksRef.current = []; // Reset audio chunks
    
    try {
      // Close any existing WebSocket connection
      if (wsManagerRef.current) {
        wsManagerRef.current.close();
        wsManagerRef.current = null;
      }

             // Initialize WebSocket manager with new voice-first callbacks
       const wsManager = initializeChatWsManager({
         question: inputMessage,
         chatId: currentChatId || undefined,
         setChatData: () => {}, // We handle state directly in callbacks
         triggerWs: true,
         setTriggerWs: () => {},
         isCleared: false,
         setIsLoading,
         authToken,
         enableVoice: enableVoice, // Use the parameter for voice control
         enableImage: enableImage, // Enable image generation based on parameter
        
        onChatStart: (chatId, messageId, voiceEnabled, imageEnabled) => {
          console.log('Chat started:', { chatId, messageId, voiceEnabled, imageEnabled });
          updateChatId(chatId);
          if (imageEnabled) {
            setIsImageGenerating(true);
          }
        },
        
        onTextComplete: (chatId, fullResponse) => {
          console.log('Text complete:', { chatId, responseLength: fullResponse.length });
          
          // Update the loading message with complete text
          setMessages(prev => prev.map(msg => {
            if (msg.id === currentMessageIdRef.current && msg.isLoading && msg.type === 'ai') {
              return {
                ...msg,
                content: fullResponse,
                isLoading: false,
                hasAudio: true, // Voice will follow
                chatId: chatId
              };
            }
            return msg;
          }));

          // Notify parent component of new AI message
          if (onNewAiMessage) {
            onNewAiMessage(fullResponse);
          }
        },
        
        onVoiceStart: (chatId) => {
          console.log('Voice streaming started:', { chatId });
          setIsVoiceStreaming(true);
          audioChunksRef.current = []; // Reset for new voice stream
          startVoiceStreaming(); // Clear audio queue and prepare for new chunks
        },
        
        onVoiceChunk: async (chatId, audioData, format) => {
          console.log('Voice chunk received:', { chatId, format, dataLength: audioData.length });
          
          // Store chunk for potential concatenation or immediate playback
          audioChunksRef.current.push({ data: audioData, format });
          
          // For real-time streaming, play each chunk immediately
          // You can modify this logic based on your preference:
          // Option 1: Play each chunk immediately (real-time streaming)
          // Option 2: Concatenate chunks and play at end (more stable)
          
          try {
            await playAudio(audioData, format);
          } catch (error) {
            console.error('Error playing voice chunk:', error);
          }
        },
        
        onVoiceComplete: (chatId) => {
          console.log('Voice streaming completed:', { chatId, totalChunks: audioChunksRef.current.length });
          setIsVoiceStreaming(false);
          endVoiceStreaming(); // Let current queue finish naturally
        },
        
        onChatComplete: (chatId, messageId, fullResponse, voiceEnabled, imageEnabled) => {
          console.log('Chat completed:', { chatId, messageId, voiceEnabled, imageEnabled });
          setIsLoading(false);
          setIsVoiceStreaming(false);
          setIsImageGenerating(false);
          
          // Final update to ensure message is marked as complete
          setMessages(prev => prev.map(msg => {
            if (msg.id === currentMessageIdRef.current && msg.type === 'ai') {
              return {
                ...msg,
                content: fullResponse,
                isLoading: false,
                hasAudio: voiceEnabled,
                chatId: chatId
              };
            }
            return msg;
          }));

          // Clean up
          currentMessageIdRef.current = null;
          audioChunksRef.current = [];
          
          // Close WebSocket connection
          if (wsManagerRef.current) {
            wsManagerRef.current.close();
            wsManagerRef.current = null;
          }
        },

        onImageStart: (chatId, prompt) => {
          console.log('Image generation started:', { chatId, prompt });
          setMessages(prev => prev.map(msg => {
            if (msg.id === currentMessageIdRef.current && msg.type === 'ai') {
              return {
                ...msg,
                isGeneratingImage: true,
                imagePrompt: prompt
              };
            }
            return msg;
          }));
        },

        onImageProgress: (chatId, message) => {
          console.log('Image generation progress:', { chatId, message });
          // Optionally update UI with progress message
        },

        onImageComplete: (chatId, imageUrl) => {
          console.log('Image generation completed:', { chatId, imageUrl });
          setIsImageGenerating(false);
          setMessages(prev => prev.map(msg => {
            if (msg.id === currentMessageIdRef.current && msg.type === 'ai') {
              return {
                ...msg,
                isGeneratingImage: false,
                imageUrl: imageUrl
              };
            }
            return msg;
          }));
        },

        onImageError: (chatId, error) => {
          console.error('Image generation error:', { chatId, error });
          setIsImageGenerating(false);
          setMessages(prev => prev.map(msg => {
            if (msg.id === currentMessageIdRef.current && msg.type === 'ai') {
              return {
                ...msg,
                isGeneratingImage: false,
                imageError: error
              };
            }
            return msg;
          }));
        }
      });

      wsManagerRef.current = wsManager;
      
    } catch (error) {
      console.error('Failed to send message via WebSocket:', error);
      
      setMessages(prev => prev.map(msg => {
        if (msg.id === currentMessageIdRef.current && msg.isLoading && msg.type === 'ai') {
          return {
            ...msg,
            content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
            isLoading: false
          };
        }
        return msg;
      }));
      
      setIsLoading(false);
      setIsVoiceStreaming(false);
      currentMessageIdRef.current = null;
    }
  }, [
    isLoading,
    currentChatId,
    isLessonMode,
    setMessages,
    setIsLoading,
    stopAudio,
    startVoiceStreaming,
    endVoiceStreaming,
    onNewAiMessage,
    updateChatId,
    playAudio,
    authToken
  ]);

  // Cleanup function to close WebSocket when component unmounts
  const cleanup = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.close();
      wsManagerRef.current = null;
    }
    stopAudio();
    setIsVoiceStreaming(false);
    audioChunksRef.current = [];
  }, [stopAudio]);

  return {
    submitMessage,
    isVoiceStreaming,
    isImageGenerating,
    cleanup
  };
}; 