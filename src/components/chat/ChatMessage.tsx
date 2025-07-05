import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export interface Message {
  type: 'user' | 'ai';
  content: string;
  id?: string;
  chatId?: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  // Image-related fields
  imageUrl?: string;
  isGeneratingImage?: boolean;
  imageError?: string;
}

interface ChatMessageProps {
  message: Message;
  isLessonMode?: boolean;
}

export default function ChatMessage({ message, isLessonMode = false }: ChatMessageProps) {
  const isUser = message.type === 'user';
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  return (
    <div 
      className={`flex items-start gap-3 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
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
          isUser
            ? isLessonMode 
              ? 'bg-purple-500/80 backdrop-blur-sm text-white'
              : 'bg-blue-500/80 backdrop-blur-sm text-white'
            : isLessonMode
              ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm text-white border border-purple-400/20'
              : 'bg-white/20 backdrop-blur-sm text-white border border-white/10'
        }`}
      >
        {message.isLoading && !message.content ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="relative">
            <div className="text-sm">
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
                    code: ({children}) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs">{children}</code>,
                    pre: ({children}) => <pre className="bg-white/10 p-2 rounded mb-2 overflow-x-auto text-xs">{children}</pre>,
                    // Customize blockquotes
                    blockquote: ({children}) => <blockquote className="border-l-4 border-white/30 pl-3 italic mb-2">{children}</blockquote>,
                    // Customize links
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
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-white/60 animate-pulse ml-1"></span>
            )}
          </div>
        )}
        
        {/* Image section for AI messages */}
        {!isUser && (
          <>
            {/* Show image loading skeleton */}
            {message.isGeneratingImage && (
              <div className="mt-3 space-y-2">
                
                <Skeleton className="h-48 w-full bg-white/20 rounded-lg" />
              </div>
            )}
            
            {/* Show generated image */}
            {message.imageUrl && !message.isGeneratingImage && (
              <div className="mt-3">
                <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                  <DialogTitle className="sr-only">Image</DialogTitle>
                  <DialogTrigger asChild>
                    <div className="relative rounded-lg overflow-hidden border border-white/20 shadow-lg backdrop-blur-sm cursor-pointer hover:opacity-80 transition-opacity">
                      <Image 
                        src={message.imageUrl}
                        alt="AI generated image"
                        width={400}
                        height={400}
                        className="w-full h-auto"
                        unoptimized // Since these are external URLs
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-full p-0 bg-black/90 border-none">
                    <div className="relative w-full h-full flex items-center justify-center">
                      <Image 
                        src={message.imageUrl}
                        alt="AI generated image"
                        width={800}
                        height={800}
                        className="max-w-full max-h-[90vh] object-contain"
                        unoptimized // Since these are external URLs
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            {/* Show image error */}
            {message.imageError && (
              <div className="mt-3 p-3 bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-400/30">
                <p className="text-sm text-red-200">
                  Failed to generate image: {message.imageError}
                </p>
              </div>
            )}
          </>
        )}
      </div>
      
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
} 