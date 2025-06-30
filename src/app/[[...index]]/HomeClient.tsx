"use client"

import { useRef } from 'react';
import GlassChatInterface, { GlassChatInterfaceRef } from "@/components/chat/GlassChatInterface";
import CenterVoiceButton from "@/components/chat/CenterVoiceButton";
import { SignedIn, UserButton} from '@clerk/nextjs'



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
      <div className="absolute bottom-4 left-4 right-4">
        
          <SignedIn>
            <div className={`flex items-center
       'justify-center' : 'gap-2 px-4'} py-3 rounded-md`}>
              <UserButton afterSignOutUrl="/" />
             
            </div>
          </SignedIn>
        </div>
      {/* Glass chat interface */}
      <GlassChatInterface ref={chatRef} />
      
      {/* Center voice button */}
      <CenterVoiceButton onTranscriptionComplete={handleVoiceTranscription} />
    </div>
  );
} 