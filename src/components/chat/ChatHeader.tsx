import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ChatHeaderProps {
  isLessonMode: boolean;
  onReset: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ isLessonMode, onReset }) => {
  return (
    <div className={`px-6 py-4 border-b ${isLessonMode ? 'border-purple-400/20' : 'border-white/10'}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-semibold text-lg ${isLessonMode ? 'text-purple-100' : 'text-white'}`}>
          {isLessonMode ? 'Russell - Black Holes Lesson' : 'Russell'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors bg-white/20 hover:bg-white/30 text-white flex items-center gap-1"
            title="Reset Chat"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}; 