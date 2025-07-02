"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useApi } from '@/providers/backend';
import { useAudioProcessing } from '@/hooks/useAudioProcessing';
import { useChatManager } from '@/hooks/useChatManager';
import { useMessageHandler } from '@/hooks/useMessageHandler';
import { useChatLoader } from '@/hooks/useChatLoader';
import { GlassChatInterfaceRef, GlassChatInterfaceProps } from '@/types/chat.types';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { LessonModeBanner } from './LessonModeBanner';
import { ChatInputArea } from './ChatInputArea';

const GlassChatInterface = forwardRef<GlassChatInterfaceRef, GlassChatInterfaceProps>((props, ref) => {
  const { onNewAiMessage } = props;
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreviousMessages, setIsLoadingPreviousMessages] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isSignedIn } = useAuth();
  const api = useApi();
  
  // Use chat manager hook
  const {
    messages,
    currentChatId,
    isLessonMode,
    hasLoadedPreviousMessages,
    setMessages,
    setRegularChatId,
    setLessonChatId,
    resetChat: resetChatState,
    updateChatId,
    toggleLessonMode,
    CHAT_ID_STORAGE_KEY,
    LESSON_CHAT_ID_STORAGE_KEY
  } = useChatManager();
  
  // Use audio processing hook
  const {
    playAudio,
    stopAudio,
    stopTestAudio,
    cleanup: cleanupAudio
  } = useAudioProcessing();


  // Use message handler hook
  const { submitMessage } = useMessageHandler({
    api,
    isLoading,
    setIsLoading,
    currentChatId,
    isLessonMode,
    messages,
    setMessages,
    onNewAiMessage,
    updateChatId,
    playAudio,
    stopAudio
  });

  // Use chat loader hook
  useChatLoader({
    api,
    isSignedIn,
    isLessonMode,
    hasLoadedPreviousMessages,
    setMessages,
    setRegularChatId,
    setLessonChatId,
    setIsLoadingPreviousMessages,
    CHAT_ID_STORAGE_KEY,
    LESSON_CHAT_ID_STORAGE_KEY
  });



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

 


  // Combined reset function
  const resetChat = () => {
    resetChatState();
    stopAudio();
    stopTestAudio();
    setInput('');
    setIsLoading(false);
    setIsLoadingPreviousMessages(false);
  };

  // Expose submitMessage method via ref
  useImperativeHandle(ref, () => ({
    submitMessage
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isSignedIn) return;
    
    const message = input.trim();
    setInput('');
    await submitMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

    // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('GlassChatInterface cleanup effect running');
      cleanupAudio();
    };
  }, []); // Empty dependency array - only run on unmount

  const getPlaceholder = () => {
    if (!isSignedIn) return "Please sign in to chat...";
    if (isLoadingPreviousMessages) return "Loading previous messages...";
    if (isLoading) return "Russell is contemplating";
    if (isLessonMode) return "Ask about black holes...";
    return "Type your message...";
  };

  const handleToggleLessonMode = (enabled: boolean) => {
    toggleLessonMode(enabled);
  };

  const handleStartLesson = async () => {
    if (!isSignedIn || isLoading) return;
    await submitMessage("Let's start the black hole lesson! Teach me about black holes");
  };

  return (
    <div className="fixed right-6 top-6 bottom-6 w-96 flex flex-col">
      {/* Glass container */}
      <div className={`flex-1 flex flex-col backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isLessonMode 
          ? 'bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-500/10 border border-purple-400/30' 
          : 'bg-white/10 border border-white/20'
      }`}>
        <ChatHeader isLessonMode={isLessonMode} onReset={resetChat} />
        
        <ChatMessageList 
          messages={messages}
          isLoadingPreviousMessages={isLoadingPreviousMessages}
          isSignedIn={isSignedIn}
          isLessonMode={isLessonMode}
          messagesEndRef={messagesEndRef}
        />

        <LessonModeBanner 
          isLessonMode={isLessonMode}
          onToggleLessonMode={handleToggleLessonMode}
          onStartLesson={handleStartLesson}
          hasMessages={messages.length > 0}
        />

        <ChatInputArea
          input={input}
          isSignedIn={isSignedIn}
          isLoading={isLoading}
          isLoadingPreviousMessages={isLoadingPreviousMessages}
          isLessonMode={isLessonMode}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
        />
      </div>
    </div>
  );
});

GlassChatInterface.displayName = 'GlassChatInterface';

export default GlassChatInterface; 