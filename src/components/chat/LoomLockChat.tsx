import { useState, useEffect, useRef } from 'react';
import { Trash } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import WelcomeMessage from './WelcomeMessage';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { Message } from './ChatMessage';
import { initializeChatWsManager } from '@/hooks/useChatWsManager';
import ChatWsManager from '@/utils/ChatWsManager';
import { useApi } from '@/providers/backend';

// Define message types
const MessageType = {
  USER: 'user',
  AI: 'ai'
} as const;

interface ChatData {
  answer: string;
  chatId?: string;
}

interface LoomLockChatProps {
  initialChatId?: string;
}

// Backend message response interface
interface MessageResponse {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  context?: any;
  created_at: string;
}

// Backend chat with messages response interface
interface ChatWithMessages {
  id: string;
  user_id: string;
  name?: string;
  created_at: string;
  messages: MessageResponse[];
}

export default function LoomLockChat({ initialChatId }: LoomLockChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExistingMessages, setIsLoadingExistingMessages] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null);
  const [triggerWs, setTriggerWs] = useState(false);
  const [chatData, setChatData] = useState<ChatData>({ answer: '' });
  const [pendingQuestion, setPendingQuestion] = useState<string>('');
  
  const { getToken, isSignedIn } = useAuth();
  const wsManagerRef = useRef<ChatWsManager | null>(null);
  const loadedChatIdRef = useRef<string | null>(null);
  const router = useRouter();
  const api = useApi();

  // Load existing messages when initialChatId is provided
  useEffect(() => {
    const loadExistingMessages = async () => {
      // Skip if no initialChatId, not signed in, or already loaded this chat
      if (!initialChatId || !isSignedIn || loadedChatIdRef.current === initialChatId) {
        return;
      }
      
      setIsLoadingExistingMessages(true);
      
      try {
        const chatWithMessages = await api.get<ChatWithMessages>(`/chats/${initialChatId}`);
        
        // Transform backend messages to frontend format
        const transformedMessages: Message[] = chatWithMessages.messages.map((msg: MessageResponse) => ({
          type: msg.role === 'user' ? MessageType.USER : MessageType.AI,
          content: msg.content,
          id: msg.id,
          chatId: msg.chat_id,
          isLoading: false,
          isStreaming: false
        }));
        
        setMessages(transformedMessages);
        setCurrentChatId(initialChatId);
        // Mark this chat as loaded
        loadedChatIdRef.current = initialChatId;
      } catch (error) {
        console.error('Failed to load existing messages:', error);
        // If chat not found or error, redirect to home
        router.replace('/');
      } finally {
        setIsLoadingExistingMessages(false);
      }
    };

    loadExistingMessages();
  }, [initialChatId, isSignedIn, api, router]);

  // Handle chat data updates from WebSocket
  useEffect(() => {
    
    if (chatData.answer) {
    
      setMessages(prev => prev.map(msg => {
        if ((msg.isLoading || msg.isStreaming) && msg.type === MessageType.AI) {
            
          return {
            ...msg,
            content: chatData.answer,
            isLoading: false,
            isStreaming: true // Show streaming indicator while content is being received
          };
        }
        return msg;
      }));
    }
    
    // Handle chat ID updates separately
    if (chatData.chatId && !currentChatId) {
      setCurrentChatId(chatData.chatId);
      // Update URL to include chat ID without disrupting the flow
     /*  router.replace(`/c/${chatData.chatId}`, { scroll: false }); */
    }
  }, [chatData.answer, chatData.chatId, currentChatId, router]);

  const handleSendMessage = async (inputMessage: string) => {
    if (isLoading || !isSignedIn) return;
    
    const userMessage: Message = { 
      type: MessageType.USER, 
      content: inputMessage,
      id: `user-${Date.now()}`
    };
    
    // Add user message immediately
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Add loading AI message
    const loadingMessage: Message = {
      type: MessageType.AI,
      content: '',
      id: `ai-${Date.now()}`,
      isLoading: true,
      isStreaming: false
    };
    setMessages(prevMessages => [...prevMessages, loadingMessage]);
    
    setPendingQuestion(inputMessage);
    setTriggerWs(true);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Please sign in to chat');
      }

      // Close existing connection if any
      if (wsManagerRef.current) {
        wsManagerRef.current.close();
      }

      // Initialize new WebSocket connection
      const wsManager = initializeChatWsManager({
        question: inputMessage,
        chatId: currentChatId || undefined,
        setChatData,
        triggerWs: true,
        setTriggerWs,
        isCleared: false,
        setIsLoading,
        authToken: token,
        timeout: 30000, // 30 seconds
        onChatComplete: (chatId, messageId, fullResponse) => {
          console.log('Chat completed, setting final message');
          // Mark the message as complete and not loading or streaming
          setMessages(prev => prev.map(msg => {
            if ((msg.isLoading || msg.isStreaming) && msg.type === MessageType.AI) {
              return {
                ...msg,
                content: fullResponse,
                isLoading: false,
                isStreaming: false
              };
            }
            return msg;
          }));
          setPendingQuestion('');
        },
        
      });

      wsManagerRef.current = wsManager;
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      // Update the loading message with error
      setMessages(prev => prev.map(msg => {
        if (msg.isLoading && msg.type === MessageType.AI) {
          return {
            ...msg,
            content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
            isLoading: false,
            isStreaming: false
          };
        }
        return msg;
      }));
    }
  };
  
  const clearMessages = () => {
    setMessages([]);
    setCurrentChatId(null);
    setChatData({ answer: '', chatId: undefined });
    setPendingQuestion('');
    
    // Reset loaded chat tracking
    loadedChatIdRef.current = null;
    
    // Close WebSocket if active
    if (wsManagerRef.current) {
      wsManagerRef.current.close();
      wsManagerRef.current = null;
    }
    
    // Navigate back to home page
    router.replace('/', { scroll: false });
  };

  const getInputPlaceholder = () => {
    if (!isSignedIn) return "Please sign in to chat...";
    if (isLoading) return "Locky is thinking...";
    return "Ask LoomLock AI anything...";
  };

  const isInputDisabled = !isSignedIn || isLoading;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.close();
      }
    };
  }, []);
  
  
  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-6 bg-transparent text-slate-900">
    
      {/* Welcome message or chat messages */}
      {isLoadingExistingMessages ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-700 p-4 bg-slate-100 rounded-xl border border-slate-200">
            <div className="animate-spin w-6 h-6 border-2 border-primary-dark border-t-transparent rounded-full"></div>
            <span className="font-medium">Loading chat messages...</span>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <WelcomeMessage />
      ) : (
        <ChatMessages messages={messages} />
      )}
      
      {/* Chat input */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={isInputDisabled || isLoadingExistingMessages}
        placeholder={isLoadingExistingMessages ? "Loading messages..." : getInputPlaceholder()}
      />
    </div>
  );
} 