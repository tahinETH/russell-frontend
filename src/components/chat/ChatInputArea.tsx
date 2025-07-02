import React from 'react';
import { Send } from 'lucide-react';

interface ChatInputAreaProps {
  input: string;
  isSignedIn: boolean | undefined;
  isLoading: boolean;
  isLoadingPreviousMessages: boolean;
  isLessonMode: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  isSignedIn,
  isLoading,
  isLoadingPreviousMessages,
  isLessonMode,
  onInputChange,
  onSubmit,
  onKeyDown,
  placeholder
}) => {
  return (
    <div className="px-6 py-4 border-t border-white/10">
      <form onSubmit={onSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`w-full backdrop-blur-sm text-white rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 resize-none transition-all duration-200 ${
            isLessonMode
              ? 'bg-purple-500/10 placeholder-purple-300/50 focus:ring-purple-400/30 border border-purple-400/20'
              : 'bg-white/10 placeholder-white/40 focus:ring-white/20 border border-white/10'
          }`}
          disabled={!isSignedIn || isLoading || isLoadingPreviousMessages}
          rows={1}
          style={{ minHeight: '44px', maxHeight: '120px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          type="submit"
          disabled={!isSignedIn || isLoading || isLoadingPreviousMessages || !input.trim()}
          className={`absolute right-2 top-[6px] p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isLessonMode
              ? 'bg-purple-400/20 hover:bg-purple-400/30'
              : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          <Send className={`h-4 w-4 ${isLessonMode ? 'text-purple-200' : 'text-white'}`} />
        </button>
      </form>
    </div>
  );
}; 