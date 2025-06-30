"use client"

import { useRef } from 'react';
import GlassChatInterface, { GlassChatInterfaceRef } from "@/components/chat/GlassChatInterface";
import CenterVoiceButton from "@/components/chat/CenterVoiceButton";

export default function HomeClient() {
  const chatRef = useRef<GlassChatInterfaceRef>(null);

  const handleVoiceTranscription = (transcription: string) => {
    // Submit the transcription to the chat interface
    if (chatRef.current) {
      chatRef.current.submitMessage(transcription);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/img/bg.png)' }}
      />
      
      {/* Glass chat interface */}
      <GlassChatInterface ref={chatRef} />
      
      {/* Center voice button */}
      <CenterVoiceButton onTranscriptionComplete={handleVoiceTranscription} />
    </div>
  );
} 