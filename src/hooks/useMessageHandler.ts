import { useCallback, useRef, useState } from 'react';
import { Message } from '@/types/chat.types';
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
  getToken: () => Promise<string | null>;
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
  getToken
}: UseMessageHandlerProps) => {
  
  const wsManagerRef = useRef<ChatWsManager | null>(null);
  const [isVoiceStreaming, setIsVoiceStreaming] = useState(false);
  const audioChunksRef = useRef<{data: string, format: string}[]>([]);
  const currentMessageIdRef = useRef<string | null>(null);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  
  const submitMessage = useCallback(async (inputMessage: string, enableImage: boolean = true, enableVoice: boolean = true) => {
    if (!inputMessage.trim() || isLoading) return;
    
    // Fetch auth token for this submission
    let authToken: string;
    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      authToken = token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
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
      const wsManager = new ChatWsManager({
        apiInfo: {
          apiHost: process.env.NEXT_PUBLIC_WS_HOST || 'localhost:8000',
          ssl: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_WS_SSL === 'true'
        },
        callbacks: {
          setSources: () => {}, // We handle state directly in callbacks
          setAnswer: () => {}, // We handle state directly in callbacks
          onError: (reason: string) => {
            console.error('Chat error:', reason);
            setMessages(prev => prev.map(msg => {
              if (msg.id === currentMessageIdRef.current && msg.isLoading && msg.type === 'ai') {
                return {
                  ...msg,
                  content: `Error: ${reason}`,
                  isLoading: false
                };
              }
              return msg;
            }));
            setIsLoading(false);
            setIsVoiceStreaming(false);
            currentMessageIdRef.current = null;
          },
          onConnect: () => {
            console.log('WebSocket connected');
          },
          onAuthenticated: () => {
            console.log('WebSocket authenticated');
          },
          onChatStart: (chatId: string, messageId: string, voiceEnabled: boolean, imageEnabled?: boolean) => {
            console.log('Chat started:', { chatId, messageId, voiceEnabled, imageEnabled });
            updateChatId(chatId);
            if (imageEnabled) {
              setIsImageGenerating(true);
            }
          },
          onTextComplete: (chatId: string, fullResponse: string) => {
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
          onVoiceStart: (chatId: string) => {
            console.log('Voice streaming started:', { chatId });
            setIsVoiceStreaming(true);
            audioChunksRef.current = []; // Reset for new voice stream
            startVoiceStreaming(); // Clear audio queue and prepare for new chunks
          },
          onVoiceChunk: async (chatId: string, audioData: string, format: string) => {
            console.log('Voice chunk received (full audio):', { chatId, format, dataLength: audioData.length });
            
            // Since backend now sends complete audio as "chunks", treat each chunk as full audio
            audioChunksRef.current.push({ data: audioData, format });
            
            try {
              // Play the complete audio immediately
              await playAudio(audioData, format);
            } catch (error) {
              console.error('Error playing complete audio:', error);
            }
          },
          onVoiceComplete: (chatId: string) => {
            console.log('Voice streaming completed:', { chatId, totalChunks: audioChunksRef.current.length });
            setIsVoiceStreaming(false);
            endVoiceStreaming(); // Let current queue finish naturally
          },
          onChatComplete: (chatId: string, messageId: string, fullResponse: string, voiceEnabled: boolean, imageEnabled?: boolean) => {
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
          onImageStart: (chatId: string, prompt: string) => {
            console.log('Image generation started:', { chatId, prompt });
            setMessages(prev => prev.map(msg => {
              if (msg.id === currentMessageIdRef.current && msg.type === 'ai') {
                return {
                  ...msg,
                  isGeneratingImage: true
                };
              }
              return msg;
            }));
          },
          onImageProgress: (chatId: string, message: string) => {
            console.log('Image generation progress:', { chatId, message });
            // Optionally update UI with progress message
          },
          onImageComplete: (chatId: string, imageUrl: string) => {
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
          onImageError: (chatId: string, error: string) => {
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
        },
        question: inputMessage,
        chatId: currentChatId || undefined,
        authToken: authToken,
        timeout: 30000,
        enableVoice: enableVoice,
        enableImage: enableImage
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
    getToken
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