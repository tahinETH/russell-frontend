import React from 'react';
import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types/chat.types';
import ChatMessage from './ChatMessage';
import { m } from 'framer-motion';

interface ChatMessageListProps {
  messages: Message[];
  isLoadingPreviousMessages: boolean;
  isSignedIn: boolean | undefined;
  isLessonMode: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoadingPreviousMessages,
  isSignedIn,
  isLessonMode,
  messagesEndRef
}) => {
  console.log(messages)
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {isLoadingPreviousMessages && (
        <div className="text-center text-white/60 mt-8">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            <p className="text-sm">Loading previous messages...</p>
          </div>
        </div>
      )}
      
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} isLessonMode={isLessonMode} />
      ))}
      
      <div ref={messagesEndRef} />
    </div>
  );
}; 