import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useApi } from '@/providers/backend';
import { useAuth } from '@clerk/nextjs';

interface VoiceRecordingProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

interface TranscriptionResponse {
  transcription: string;
  message: string;
}

export default function VoiceRecording({ onTranscriptionComplete, disabled = false }: VoiceRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const api = useApi();
  const { getToken } = useAuth();

  // Function to send voice input to backend
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
          // Don't set Content-Type for FormData - let browser set it with boundary
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
            onTranscriptionComplete(transcribedText);
          }
        } catch (error) {
          console.error('Transcription failed:', error);
          // You might want to show an error message to the user here
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      // Handle permission denied or other errors
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Recording time display */}
      {isRecording && (
        <div className="bg-red-600 text-white text-xs px-2 py-1 rounded-md font-mono">
          {formatTime(recordingTime)}
        </div>
      )}
      
      {/* Voice input button */}
      <button
        type="button"
        onClick={handleVoiceInput}
        disabled={disabled || isTranscribing}
        className={`p-2 rounded-xl transition-colors ${
          isRecording 
            ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
            : 'bg-slate-200 hover:bg-slate-300 border border-slate-300'
        } disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
        title={isRecording ? "Stop recording" : "Start voice input"}
      >
        {isTranscribing ? (
          <div className="animate-spin w-4 h-4 border-2 border-primary-dark border-t-transparent rounded-full"></div>
        ) : isRecording ? (
          <MicOff className="h-4 w-4 text-white" />
        ) : (
          <Mic className="h-4 w-4 text-primary-dark" />
        )}
      </button>
    </div>
  );
} 