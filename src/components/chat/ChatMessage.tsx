import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

export interface Message {
  type: 'user' | 'ai';
  content: string;
  id?: string;
  chatId?: string;
  isLoading?: boolean;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === 'user';

  return (
    <div 
      className={`flex items-start gap-3 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="rounded-full bg-slate-200 flex items-center justify-center border border-slate-300">
          <Image 
            src="/img/locky4.png" 
            alt="Russell AI" 
            width={48} 
            height={48} 
         
          />
        </div>
      )}
      
      <div 
        className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
          isUser ? 
            'bg-blue-700 text-white' : 
            'bg-slate-100 text-slate-900 border border-slate-200'
        }`}
      >
        {message.isLoading && !message.content ? (
          <div className="flex items-center gap-2 text-sm text-slate-900">
            <div className="animate-spin w-4 h-4 border-2 border-primary-dark border-t-transparent rounded-full"></div>
            
          </div>
        ) : (
          <div className="relative">
            <div className="text-sm leading-relaxed prose prose-sm max-w-none">
              {isUser ? (
                // For user messages, preserve line breaks but don't parse markdown
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                // For AI messages, parse markdown for rich formatting
                <ReactMarkdown
                  components={{
                    // Customize paragraph spacing
                    p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                    // Customize lists
                    ul: ({children}) => <ul className="mb-2 ml-4 space-y-1 list-disc list-outside">{children}</ul>,
                    ol: ({children}) => <ol className="mb-2 ml-4 space-y-1 list-decimal list-outside">{children}</ol>,
                    li: ({children}) => <li className="ml-2">{children}</li>,
                    // Customize headings
                    h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                    h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                    h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                    // Customize code
                    code: ({children}) => <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">{children}</code>,
                    pre: ({children}) => <pre className="bg-slate-200 p-2 rounded mb-2 overflow-x-auto text-xs">{children}</pre>,
                    // Customize blockquotes
                    blockquote: ({children}) => <blockquote className="border-l-4 border-slate-300 pl-3 italic mb-2">{children}</blockquote>,
                    // Customize links
                    a: ({href, children}) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 underline-offset-2 transition-colors duration-200"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary-dark animate-pulse ml-1"></span>
            )}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-dark flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
} 