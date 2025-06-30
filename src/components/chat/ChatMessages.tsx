import { useEffect, useRef } from 'react';
import ChatMessage, { Message } from './ChatMessage';

interface ChatMessagesProps {
  messages: Message[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex-grow overflow-auto py-6 scrollbar-hide">
      <div className="space-y-6">
        {messages.map((message, index) => (
          <ChatMessage 
            key={message.id || index} 
            message={message}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 