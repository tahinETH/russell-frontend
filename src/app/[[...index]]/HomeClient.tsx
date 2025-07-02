"use client"

import { useRef, useState, useEffect } from 'react';
import GlassChatInterface, { GlassChatInterfaceRef } from "@/components/chat/GlassChatInterface";
import CenterVoiceButton from "@/components/chat/CenterVoiceButton";
import MediaSettings from "@/components/MediaSettings";
import { SentenceRevealEffect } from "@/components/ui/sentence-reveal-effect";

import { SignedIn, UserButton} from '@clerk/nextjs'



export default function HomeClient() {
  const chatRef = useRef<GlassChatInterfaceRef>(null);
  const [currentAiMessage, setCurrentAiMessage] = useState<string>('');
  const [messageKey, setMessageKey] = useState<number>(0);
  
  // Handle new AI messages from the chat interface
  const handleNewAiMessage = (message: string) => {
    setCurrentAiMessage(message);
    setMessageKey(prev => prev + 1); // Force component to reset animation
  };

  
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/img/bg.png)' }}
      />
      
      {/* Sentence Reveal - positioned right next to GlassChatInterface */}
      {currentAiMessage && (
        <div className="fixed right-[700px] top-1/4 -translate-y-1/2 z-40 max-w-md">
          <SentenceRevealEffect 
            text={currentAiMessage}
            wordsPerMinute={220}
            extraPauseTime={500}
            resetKey={messageKey}
          />
        </div>
      )}

      
      {/* Media Settings - Top Right */}
      <div className="absolute top-6 left-6 z-10">
        <MediaSettings />
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <SignedIn>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-4 py-3 rounded-md">
              <UserButton afterSignOutUrl="/" />
            </div>
            
          </div>
        </SignedIn>
      </div>
      {/* Glass chat interface */}
      <GlassChatInterface 
        ref={chatRef} 
        onNewAiMessage={handleNewAiMessage}
      />
      
      {/* Center voice button */}
      {/* <CenterVoiceButton onTranscriptionComplete={handleVoiceTranscription} /> */}
    </div>
  );
} 