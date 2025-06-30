import { useState } from 'react';
import { Send, ArrowUp } from 'lucide-react';
import VoiceRecording from './VoiceRecording';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSendMessage, disabled = false, placeholder = "Ask LoomLock any questions..." }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    
    onSendMessage(input);
    setInput('');
  };

  const handleVoiceTranscription = (text: string) => {
    setInput(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || disabled) return;
      
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="mb-6 bg-transparent">
      <form onSubmit={handleSubmit} className="flex  p-4 rounded-2xl border border-slate-300 flex-col focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent resize-none">
        {/* Text input at the top */}
        <div className="relative mb-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full  text-sm bg-white text-slate-900 focus:outline-none placeholder-slate-500  min-h-[48px] max-h-52 overflow-auto resize-none "
            disabled={disabled}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 208) + 'px';
            }}
          />
        </div>
        
        {/* Bottom section with placeholder text and buttons */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            
          </div>
          
          <div className="flex gap-2 items-center">
            <VoiceRecording 
              onTranscriptionComplete={handleVoiceTranscription}
              disabled={disabled}
            />
            
            {/* Send button */}
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              className="p-2 rounded-xl bg-blue-700 disabled:bg-slate-400 disabled:text-slate-400 disabled:cursor-normal cursor-pointer transition-colors"
            >
              <ArrowUp className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 