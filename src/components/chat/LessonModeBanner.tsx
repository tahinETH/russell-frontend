import React from 'react';
import { Sparkles, X, Play } from 'lucide-react';

interface LessonModeBannerProps {
  isLessonMode: boolean;
  onToggleLessonMode: (enabled: boolean) => void;
  onStartLesson?: () => void;
  hasMessages?: boolean;
}

export const LessonModeBanner: React.FC<LessonModeBannerProps> = ({ 
  isLessonMode, 
  onToggleLessonMode,
  onStartLesson,
  hasMessages = false
}) => {
  if (!isLessonMode) {
    return (
      <div className="px-6 py-3 border-t border-white/10">
        <button
          onClick={() => onToggleLessonMode(true)}
          className="w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 backdrop-blur-sm border border-purple-400/30 rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-all duration-200 group"
        >
          <Sparkles className="h-4 w-4 text-purple-300 group-hover:text-purple-200" />
          <span className="text-sm font-medium text-purple-200 group-hover:text-purple-100">
            Take the Black Holes Lesson
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-3 border-t border-purple-400/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-300 animate-pulse" />
          <span className="text-sm font-medium text-purple-200">
            Black Holes Lesson Mode Active
          </span>
        </div>
        <button
          onClick={() => onToggleLessonMode(false)}
          className="p-1 rounded-md hover:bg-white/10 transition-colors"
          title="Exit lesson mode"
        >
          <X className="h-4 w-4 text-purple-300 hover:text-purple-200" />
        </button>
      </div>
      
      {onStartLesson && !hasMessages && (
        <button
          onClick={onStartLesson}
          className="w-full bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/40 hover:to-blue-600/40 backdrop-blur-sm border border-purple-400/40 rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-all duration-200 group"
        >
          <Play className="h-4 w-4 text-purple-200 group-hover:text-purple-100" />
          <span className="text-sm font-medium text-purple-200 group-hover:text-purple-100">
            Start
          </span>
        </button>
      )}
    </div>
  );
}; 