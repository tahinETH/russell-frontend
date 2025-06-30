"use client"
import { useState, useEffect } from 'react';
import { SignIn } from "@clerk/nextjs";
import { Send, User, Bot, Mic } from 'lucide-react';
import WelcomeMessage from '@/components/chat/WelcomeMessage';
import Image from 'next/image';

export default function SignInClient() {
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
        {/* Blurred background */}
        <div className="absolute inset-0 filter blur-sm overflow-hidden">
          <div className="flex flex-col h-full max-w-4xl mx-auto p-6 bg-transparent text-black">
            {/* Welcome message (blurred background) */}
            <WelcomeMessage />
            
            {/* Sample chat messages (blurred background) */}
            <div className="mb-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 justify-end">
                  <div className="max-w-[80%] p-3 rounded-2xl bg-primary-dark text-white">
                    <div className="text-sm">How can I use my Loomlock to break my phone addiction?</div>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-dark flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex items-start gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300">
                    <Bot className="h-4 w-4 text-primary-dark" />
                  </div>
                  <div className="max-w-[80%] p-3 rounded-2xl bg-slate-100 text-slate-900 border border-slate-200">
                    <div className="text-sm">Great question! Start with shorter sessions - lock your phone for 30-60 minutes during focused work time. Gradually increase the duration as you build the habit...</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Input Form (blurred background) */}
            <div className="mt-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Prof Wonder is here to teach you about cosmos."
                  className="w-full p-4 pr-24 rounded-2xl border border-slate-300 bg-white text-slate-900 placeholder-slate-500"
                  disabled
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1 items-center">
                  <button
                    type="button"
                    className="p-2 rounded-xl bg-slate-200 border border-slate-300"
                    disabled
                  >
                    <Mic className="h-4 w-4 text-primary-dark" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-xl bg-primary-dark"
                    disabled
                  >
                    <Send className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sign in overlay */}
        <main className="absolute inset-0 z-10">
          <div className="h-full flex flex-col items-center justify-center space-y-4 backdrop-blur-sm">
            {/* Locky Logo/Image */}
            <div className="mb-4">
              <Image
                src="/img/locky3.png"
                alt="Locky Logo"
                width={120}
                height={120}
                className=""
              />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 text-center hidden md:block">Say Hi to Locky!</h1>
            <p className="text-center max-w-md text-slate-700 hidden md:block">
              Your personal growth assistant for building focus and breaking bad habits. Please sign in to continue.
            </p>
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