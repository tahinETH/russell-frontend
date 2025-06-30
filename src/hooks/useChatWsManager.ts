import ChatWsManager from '@/utils/ChatWsManager';

interface ChatData {
  answer: string;
  chatId?: string;
  messageId?: string;
  isStreamingComplete?: boolean;
}

interface InitializeChatWsManagerOptions {
  question: string;
  chatId?: string;
  setChatData: React.Dispatch<React.SetStateAction<ChatData>>;
  triggerWs: boolean;
  setTriggerWs: React.Dispatch<React.SetStateAction<boolean>>;
  isCleared: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  authToken: string;
  timeout?: number;
  onChatStart?: (chatId: string, messageId: string) => void;
  onChatComplete?: (chatId: string, messageId: string, fullResponse: string) => void;
}

export const initializeChatWsManager = ({
  question,
  chatId,
  setChatData,
  triggerWs,
  setTriggerWs,
  isCleared,
  setIsLoading,
  authToken,
  timeout = 30000,
  onChatStart,
  onChatComplete,
}: InitializeChatWsManagerOptions): ChatWsManager | null => {
  let wsManager: ChatWsManager | null = null;

  if (isCleared) {
    setChatData({ answer: '', isStreamingComplete: false });
  }

  if (triggerWs !== true) {
    return null;
  }

  setTriggerWs(false);
  setIsLoading(true);

  try {
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    // Determine API host and SSL
    const apiHost = process.env.NEXT_PUBLIC_WS_HOST || 'localhost:8000';
    const apiSSL = process.env.NODE_ENV === 'production' || 
                   process.env.NEXT_PUBLIC_WS_SSL === 'true';

    wsManager = new ChatWsManager({
      apiInfo: {
        apiHost,
        ssl: apiSSL,
      },
      callbacks: {
        setSources: (sources) => {
          // Sources not used in current implementation
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
          // Optionally set error in chat data
          setChatData(prevData => ({
            ...prevData,
            answer: `Error: ${reason}`,
            isStreamingComplete: true,
          }));
        },
        onConnect: () => {
          console.log('ChatWsManager: Connected to WebSocket');
        },
        onAuthenticated: () => {
          console.log('ChatWsManager: Authenticated successfully');
        },
        onChatStart: (chatId, messageId) => {
          console.log(`ChatWsManager: Chat started - Chat ID: ${chatId}, Message ID: ${messageId}`);
          setChatData(prevData => ({
            ...prevData,
            chatId: chatId,
            messageId: messageId,
            isStreamingComplete: false,
          }));
          // Call external callback if provided
          if (onChatStart) {
            onChatStart(chatId, messageId);
          }
        },
        onChatComplete: (chatId, messageId, fullResponse) => {
          console.log(`ChatWsManager: Chat completed - Chat ID: ${chatId}, Message ID: ${messageId}`);
          setIsLoading(false);
          setChatData(prevData => ({
            ...prevData,
            chatId: chatId,
            messageId: messageId,
            answer: fullResponse,
            isStreamingComplete: true,
          }));
          // Call external callback if provided
          if (onChatComplete) {
            onChatComplete(chatId, messageId, fullResponse);
          }
        },
      },
      question: question,
      chatId: chatId,
      authToken: authToken,
      timeout: timeout,
    });

    return wsManager;
  } catch (error) {
    console.error('Failed to initialize ChatWsManager:', error);
    setIsLoading(false);
    setChatData(prevData => ({
      ...prevData,
      answer: `Error: Failed to connect to chat service`,
      isStreamingComplete: true,
    }));
    return null;
  }
};

// Hook for easier use in React components
export const useChatWsManager = () => {
  return {
    initializeChatWsManager,
  };
}; 