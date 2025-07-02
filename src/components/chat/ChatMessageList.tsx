import React from 'react';
import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types/chat.types';

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
  // Helper function to count words in a string
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Helper function to split AI messages into multiple parts for better UX
  const splitAIMessage = (content: string): string[] => {
    const wordCount = countWords(content);
    
    // Only split if message is longer than 50 words and has line breaks
    if (wordCount <= 50) {
      return [content];
    }
    
    // Split by double line breaks (paragraphs) first
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length > 1) {
      const result: string[] = [];
      let currentPart = '';
      let currentWordCount = 0;
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraphWordCount = countWords(paragraphs[i]);
        
        if (currentWordCount === 0) {
          // First paragraph in current part
          currentPart = paragraphs[i];
          currentWordCount = paragraphWordCount;
        } else if (currentWordCount + paragraphWordCount <= 50) {
          // Add to current part if total doesn't exceed 50 words
          currentPart += '\n\n' + paragraphs[i];
          currentWordCount += paragraphWordCount;
        } else {
          // Current part has >50 words, split here
          result.push(currentPart);
          currentPart = paragraphs[i];
          currentWordCount = paragraphWordCount;
        }
      }
      
      // Add the last part
      if (currentPart) {
        result.push(currentPart);
      }
      
      return result.length > 1 ? result : [content];
    }
    
    // If no double line breaks, try single line breaks
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 1) {
      const result: string[] = [];
      let currentPart = '';
      let currentWordCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const lineWordCount = countWords(lines[i]);
        
        if (currentWordCount === 0) {
          // First line in current part
          currentPart = lines[i];
          currentWordCount = lineWordCount;
        } else if (currentWordCount + lineWordCount <= 50) {
          // Add to current part if total doesn't exceed 50 words
          currentPart += '\n' + lines[i];
          currentWordCount += lineWordCount;
        } else {
          // Current part has >50 words, split here
          result.push(currentPart);
          currentPart = lines[i];
          currentWordCount = lineWordCount;
        }
      }
      
      // Add the last part
      if (currentPart) {
        result.push(currentPart);
      }
      
      return result.length > 1 ? result : [content];
    }
    
    return [content]; // No line breaks, return as single message
  };

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
      
      {messages.map((message) => {
        // Split AI messages for better UX
        const messageParts = message.type === 'ai' && !message.isLoading 
          ? splitAIMessage(message.content)
          : [message.content];

        return messageParts.map((part, partIndex) => (
          <div
            key={`${message.id}-${partIndex}`}
            className={`flex items-start gap-3 ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            } ${partIndex > 0 ? 'mt-2' : ''}`}
          >
            {message.type === 'ai' && (
              <div className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center flex-shrink-0 ${
                isLessonMode ? 'bg-purple-400/20' : 'bg-white/20'
              }`}>
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${
                  isLessonMode ? 'from-purple-400 to-blue-500' : 'from-blue-400 to-purple-500'
                }`} />
              </div>
            )}
            
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                message.type === 'user'
                  ? isLessonMode 
                    ? 'bg-purple-500/80 backdrop-blur-sm text-white'
                    : 'bg-blue-500/80 backdrop-blur-sm text-white'
                  : isLessonMode
                    ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm text-white border border-purple-400/20'
                    : 'bg-white/20 backdrop-blur-sm text-white border border-white/10'
              }`}
            >
              {message.isLoading && partIndex === 0 ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <div className="text-sm">
                  {message.type === 'user' ? (
                    <div className="whitespace-pre-wrap">{part}</div>
                  ) : (
                    <div className="relative">
                      <ReactMarkdown
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="mb-2 ml-4 space-y-1 list-disc list-outside">{children}</ul>,
                          ol: ({children}) => <ol className="mb-2 ml-4 space-y-1 list-decimal list-outside">{children}</ol>,
                          li: ({children}) => <li className="ml-2">{children}</li>,
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                          code: ({children}) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs">{children}</code>,
                          pre: ({children}) => <pre className="bg-white/10 p-2 rounded mb-2 overflow-x-auto text-xs">{children}</pre>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-white/30 pl-3 italic mb-2">{children}</blockquote>,
                          a: ({href, children}) => (
                            <a 
                              href={href} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:text-blue-200 underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {part}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {message.type === 'user' && (
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ));
      })}
      
      <div ref={messagesEndRef} />
    </div>
  );
}; 