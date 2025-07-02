"use client"
import { useState, useEffect, useRef } from 'react';
import { SignIn } from "@clerk/nextjs";
import GlassChatInterface from "@/components/chat/GlassChatInterface";
import { GlassChatInterfaceRef } from '@/types/chat.types';
import CenterVoiceButton from "@/components/chat/CenterVoiceButton";
import { UserButton } from '@clerk/nextjs';

export default function SignInClient() {
  const chatRef = useRef<GlassChatInterfaceRef>(null);

  const handleVoiceTranscription = (transcription: string) => {
    // Submit the transcription to the chat interface (disabled for sign-in page)
    if (chatRef.current) {
      chatRef.current.submitMessage(transcription);
    }
  };

  useEffect(() => {
    try {
      // Prevent scrolling on the body when sign-in page is mounted
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      // Cleanup function to restore scrolling when component unmounts
      return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      };
    } catch (error) {
      // Error handling for useEffect
    }
  }, []);

  try {
    return (
      <div className="fixed inset-0 z-50 bg-transparent overflow-hidden">
        {/* Blurred background with same layout as HomeClient */}
        <div className="absolute inset-0 filter blur-sm overflow-hidden">
          <div className="relative w-full h-screen overflow-hidden">
            {/* Background image */}
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: 'url(/img/bg.png)' }}
            />
            
            {/* UserButton in bottom left */}
            <div className="absolute bottom-4 left-4">
              <div className="flex items-center justify-center py-3 rounded-md">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
            
            {/* Glass chat interface */}
            <GlassChatInterface ref={chatRef} />
            
            {/* Center voice button */}
            <CenterVoiceButton 
              onTranscriptionComplete={handleVoiceTranscription}
              disabled={true} // Disabled on sign-in page
            />
          </div>
        </div>
        
        {/* Sign in overlay */}
        <main className="absolute inset-0 z-10">
          <div className="h-full flex flex-col items-center justify-center space-y-4 backdrop-blur-sm">
            <SignIn
              path="/sign-in"
              fallbackRedirectUrl="/"
              withSignUp={true}
            />
          </div>
        </main>
      </div>
    );
  } catch (error) {
    return <div>An error occurred while loading the sign-in page. Check console for details.</div>;
  }
} 