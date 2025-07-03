"use client"

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ArrowUp } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface CenterVoiceButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
  isVoicePlaying?: boolean;
  isProcessing?: boolean;
}

interface TranscriptionResponse {
  transcription: string;
  message: string;
}

export default function CenterVoiceButton({ 
  onTranscriptionComplete, 
  disabled = false, 
  isVoicePlaying = false, 
  isProcessing = false 
}: CenterVoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { getToken, isSignedIn } = useAuth();

  // Function to send voice input to backend for transcription
  const transcribeVoice = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'voice-input.webm');
    
    try {
      const token = await getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to transcribe voice input');
      }
      
      const data: TranscriptionResponse = await response.json();
      return data.transcription || '';
    } catch (error) {
      console.error('Error transcribing voice:', error);
      throw error;
    }
  };

  // Timer effect for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        setIsTranscribing(true);
        try {
          const transcribedText = await transcribeVoice(audioBlob);
          if (transcribedText.trim()) {
            // Send transcribed text to chat interface - it will handle the WebSocket flow
            onTranscriptionComplete(transcribedText);
          }
        } catch (error) {
          console.error('Transcription failed:', error);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceInput = () => {
    if (!isSignedIn) return;
    
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing && !isProcessing && !isVoicePlaying) {
      startRecording();
    }
  };

  const getButtonText = () => {
    if (!isSignedIn) return "Sign in to use voice";
    if (isVoicePlaying) return "Playing response...";
    if (isProcessing) return "Processing response...";
    if (isTranscribing) return "Transcribing...";
    if (isRecording) return "Tap to send";
    return "Tap to speak";
  };

  const getButtonIcon = () => {
    if (isTranscribing || (isProcessing && !isVoicePlaying)) {
      return <div className="animate-spin w-8 h-8 border-3 border-white/60 border-t-white rounded-full" />;
    }
    
    if (isVoicePlaying) {
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse" />
          </div>
        </div>
      );
    }
    
    if (isRecording) {
      return (
        <div className="flex flex-col items-center gap-1">
          <MicOff className="h-8 w-8 text-white" />
          <ArrowUp className="h-4 w-4 text-white animate-bounce" />
        </div>
      );
    }
    
    return <Mic className="h-8 w-8 text-white" />;
  };

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
      {/* Main voice button */}
      <button
        onClick={handleVoiceInput}
        disabled={disabled || isTranscribing || isProcessing || isVoicePlaying || !isSignedIn}
        className={`relative group transition-all duration-300 ${
          isRecording ? 'scale-110' : 'hover:scale-105'
        }`}
      >
        {/* Outer ring with glass effect */}
        <div className={`absolute inset-0 rounded-full ${
          isRecording 
            ? 'bg-red-500/20 animate-pulse' 
            : isVoicePlaying
            ? 'bg-green-500/20 animate-pulse'
            : isProcessing
            ? 'bg-blue-500/20 animate-pulse'
            : 'bg-white/10'
        } backdrop-blur-sm border-2 ${
          isRecording 
            ? 'border-red-400/50' 
            : isVoicePlaying
            ? 'border-green-400/50'
            : isProcessing
            ? 'border-blue-400/50'
            : 'border-white/20'
        }`} />
        
        {/* Inner button */}
        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
          isRecording 
            ? 'bg-red-500/80' 
            : isVoicePlaying
            ? 'bg-green-500/80'
            : isProcessing
            ? 'bg-blue-500/80'
            : 'bg-white/20 hover:bg-white/30'
        } backdrop-blur-md border ${
          isRecording 
            ? 'border-red-400' 
            : isVoicePlaying
            ? 'border-green-400'
            : isProcessing
            ? 'border-blue-400'
            : 'border-white/30'
        } transition-all duration-300`}>
          {getButtonIcon()}
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500/80 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full font-mono">
            {formatTime(recordingTime)}
          </div>
        )}
      </button>

      {/* Label */}
      <div className="text-center">
        <p className="text-white/80 text-lg font-medium">
          {getButtonText()}
        </p>
        {isRecording && (
          <p className="text-white/60 text-sm mt-1">
            Click to send your message
          </p>
        )}
        {isVoicePlaying && (
          <p className="text-white/60 text-sm mt-1">
            Playing voice response
          </p>
        )}
        {isProcessing && !isVoicePlaying && (
          <p className="text-white/60 text-sm mt-1">
            Generating voice response...
          </p>
        )}
      </div>
    </div>
  );
} 