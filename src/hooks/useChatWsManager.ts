import { useEffect, useState, useCallback } from 'react';
import ChatWsManager from '@/utils/ChatWsManager';

interface ChatData {
  answer: string;
  chatId?: string;
  messageId?: string;
  isStreamingComplete?: boolean;
  voiceEnabled?: boolean;
  isVoiceStreaming?: boolean;
}

interface UseChatWsManagerOptions {
  question: string;
  chatId?: string;
  authToken: string;
  triggerWs: boolean;
  setTriggerWs: React.Dispatch<React.SetStateAction<boolean>>;
  isCleared: boolean;
  setIsLoading: (loading: boolean) => void;
  timeout?: number;
  enableVoice?: boolean;
  enableImage?: boolean;
  onChatStart?: (chatId: string, messageId: string, voiceEnabled: boolean, imageEnabled?: boolean) => void;
  onTextComplete?: (chatId: string, fullResponse: string) => void;
  onVoiceStart?: (chatId: string) => void;
  onVoiceChunk?: (chatId: string, audioData: string, format: string) => void;
  onVoiceComplete?: (chatId: string) => void;
  onChatComplete?: (chatId: string, messageId: string, fullResponse: string, voiceEnabled: boolean, imageEnabled?: boolean) => void;
  onImageStart?: (chatId: string, prompt: string) => void;
  onImageProgress?: (chatId: string, message: string) => void;
  onImageComplete?: (chatId: string, imageUrl: string) => void;
  onImageError?: (chatId: string, error: string) => void;
}

export const useChatWsManager = ({
  question,
  chatId,
  authToken,
  triggerWs,
  setTriggerWs,
  isCleared,
  setIsLoading,
  timeout = 30000,
  enableVoice = true,
  enableImage = true,
  onChatStart,
  onTextComplete,
  onVoiceStart,
  onVoiceChunk,
  onVoiceComplete,
  onChatComplete,
  onImageStart,
  onImageProgress,
  onImageComplete,
  onImageError,
}: UseChatWsManagerOptions) => {
  const [chatData, setChatData] = useState<ChatData>({
    answer: '',
    isStreamingComplete: false,
    voiceEnabled: false,
    isVoiceStreaming: false,
  });

  useEffect(() => {
    let wsManager: ChatWsManager | null = null;

    if (isCleared) {
      setChatData({ answer: '', isStreamingComplete: false, voiceEnabled: false, isVoiceStreaming: false });
    }

    if (!triggerWs) {
      return;
    }

    setTriggerWs(false);
    setIsLoading(true);

    try {
      if (!authToken) {
        throw new Error('No authentication token available');
      }

      const apiHost = process.env.NEXT_PUBLIC_WS_HOST || 'localhost:8000';
      const apiSSL = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_WS_SSL === 'true';

      wsManager = new ChatWsManager({
        apiInfo: { apiHost, ssl: apiSSL },
        callbacks: {
          setSources: (sources) => {
            setIsLoading(false);
          },
          setAnswer: (answer) => {
            setIsLoading(false);
            setChatData(prevData => ({
              ...prevData,
              answer: answer,
              isStreamingComplete: false,
            }));
          },
          onError: (reason) => {
            console.error(`ChatWsManager Error: ${reason}`);
            setIsLoading(false);
            setChatData(prevData => ({
              ...prevData,
              answer: `Error: ${reason}`,
              isStreamingComplete: true,
              isVoiceStreaming: false,
            }));
          },
          onConnect: () => {
            console.log('ChatWsManager: Connected to WebSocket');
          },
          onAuthenticated: () => {
            console.log('ChatWsManager: Authenticated successfully');
          },
          onChatStart: (chatId, messageId, voiceEnabled) => {
            console.log(`ChatWsManager: Chat started - Chat ID: ${chatId}, Message ID: ${messageId}, Voice: ${voiceEnabled}`);
            setChatData(prevData => ({
              ...prevData,
              chatId: chatId,
              messageId: messageId,
              voiceEnabled: voiceEnabled,
              isStreamingComplete: false,
              isVoiceStreaming: false,
            }));
            if (onChatStart) {
              onChatStart(chatId, messageId, voiceEnabled, false);
            }
          },
          onTextComplete: (chatId, fullResponse) => {
            console.log(`ChatWsManager: Text completed - Chat ID: ${chatId}`);
            setIsLoading(false);
            setChatData(prevData => ({
              ...prevData,
              answer: fullResponse,
              isStreamingComplete: false,
            }));
            if (onTextComplete) {
              onTextComplete(chatId, fullResponse);
            }
          },
          onVoiceStart: (chatId) => {
            console.log(`ChatWsManager: Voice streaming started - Chat ID: ${chatId}`);
            setChatData(prevData => ({
              ...prevData,
              isVoiceStreaming: true,
            }));
            if (onVoiceStart) {
              onVoiceStart(chatId);
            }
          },
          onVoiceChunk: (chatId, audioData, format) => {
            console.log(`ChatWsManager: Voice chunk received - Chat ID: ${chatId}, Format: ${format}`);
            if (onVoiceChunk) {
              onVoiceChunk(chatId, audioData, format);
            }
          },
          onVoiceComplete: (chatId) => {
            console.log(`ChatWsManager: Voice streaming completed - Chat ID: ${chatId}`);
            setChatData(prevData => ({
              ...prevData,
              isVoiceStreaming: false,
            }));
            if (onVoiceComplete) {
              onVoiceComplete(chatId);
            }
          },
          onChatComplete: (chatId, messageId, fullResponse, voiceEnabled) => {
            console.log(`ChatWsManager: Chat completed - Chat ID: ${chatId}, Message ID: ${messageId}, Voice: ${voiceEnabled}`);
            setIsLoading(false);
            setChatData(prevData => ({
              ...prevData,
              chatId: chatId,
              messageId: messageId,
              answer: fullResponse,
              voiceEnabled: voiceEnabled,
              isStreamingComplete: true,
              isVoiceStreaming: false,
            }));
            if (onChatComplete) {
              onChatComplete(chatId, messageId, fullResponse, voiceEnabled, false);
            }
          },
          onImageStart: (chatId, prompt) => {
            console.log(`ChatWsManager: Image generation started - Chat ID: ${chatId}, Prompt: ${prompt}`);
            if (onImageStart) {
              onImageStart(chatId, prompt);
            }
          },
          onImageProgress: (chatId, message) => {
            console.log(`ChatWsManager: Image generation progress - Chat ID: ${chatId}, Message: ${message}`);
            if (onImageProgress) {
              onImageProgress(chatId, message);
            }
          },
          onImageComplete: (chatId, imageUrl) => {
            console.log(`ChatWsManager: Image generation completed - Chat ID: ${chatId}, Image URL: ${imageUrl}`);
            setChatData(prevData => ({
              ...prevData,
              isStreamingComplete: true,
            }));
            if (onImageComplete) {
              onImageComplete(chatId, imageUrl);
            }
          },
          onImageError: (chatId, error) => {
            console.error(`ChatWsManager: Image generation error - Chat ID: ${chatId}, Error: ${error}`);
            setChatData(prevData => ({
              ...prevData,
              isStreamingComplete: true,
            }));
            if (onImageError) {
              onImageError(chatId, error);
            }
          },
        },
        question: question,
        chatId: chatId,
        authToken: authToken,
        timeout: timeout,
        enableVoice: enableVoice,
        enableImage: enableImage,
      });
    } catch (error) {
      console.error('Failed to initialize ChatWsManager:', error);
      setIsLoading(false);
      setChatData(prevData => ({
        ...prevData,
        answer: `Error: Failed to connect to chat service`,
        isStreamingComplete: true,
        isVoiceStreaming: false,
      }));
    }

    return () => {
      if (wsManager) {
        console.log('Closing WebSocket connection');
        wsManager.close();
      }
    };
  }, [
    triggerWs,
    question,
    chatId,
    authToken,
    setTriggerWs,
    isCleared,
    setIsLoading,
    timeout,
    enableVoice,
    enableImage,
    onChatStart,
    onTextComplete,
    onVoiceStart,
    onVoiceChunk,
    onVoiceComplete,
    onChatComplete,
    onImageStart,
    onImageProgress,
    onImageComplete,
    onImageError,
  ]);

  return { chatData };
}; 