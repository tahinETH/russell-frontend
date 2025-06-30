"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, User, Volume2, RotateCcw } from 'lucide-react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useApi } from '@/providers/backend';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  chatId?: string;
  hasAudio?: boolean;
}

interface QueryResponse {
  text_response: string;
  audio_base64?: string; // base64 encoded audio
  audio_format?: string;
  context_chunks?: number;
  processing_time?: number;
  chat_id?: string;
  message_id?: string;
}

// Backend message response interface (matching LoomLockChat structure)
interface MessageResponse {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  context?: any;
  created_at: string;
}

// Backend chat with messages response interface
interface ChatWithMessages {
  id: string;
  user_id: string;
  name?: string;
  created_at: string;
  messages: MessageResponse[];
}

export interface GlassChatInterfaceRef {
  submitMessage: (message: string) => void;
}

const CHAT_ID_STORAGE_KEY = 'glasschat_chat_id';

const GlassChatInterface = forwardRef<GlassChatInterfaceRef>((props, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreviousMessages, setIsLoadingPreviousMessages] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const testSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const hasLoadedPreviousMessages = useRef(false);
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const api = useApi();

  
  // Load previous chat session on component mount
  useEffect(() => {
    const loadPreviousChat = async () => {
      if (!isSignedIn || hasLoadedPreviousMessages.current) return;
      
      const storedChatId = localStorage.getItem(CHAT_ID_STORAGE_KEY);
      
      if (!storedChatId) return;

      setIsLoadingPreviousMessages(true);
      hasLoadedPreviousMessages.current = true;

      try {
        const chatWithMessages = await api.get<ChatWithMessages>(`/chats/${storedChatId}`);
        
        // Transform backend messages to frontend format
        const transformedMessages: Message[] = chatWithMessages.messages.map((msg: MessageResponse) => ({
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          id: msg.id,
          chatId: msg.chat_id,
          timestamp: new Date(msg.created_at),
          isLoading: false,
          hasAudio: false // Previous messages don't have audio playback
        }));
        
        setMessages(transformedMessages);
        setCurrentChatId(storedChatId);
        console.log(`Loaded ${transformedMessages.length} messages from previous session`);
      } catch (error) {
        console.error('Failed to load previous chat session:', error);
        // Clear invalid chat ID from storage
        localStorage.removeItem(CHAT_ID_STORAGE_KEY);
      } finally {
        setIsLoadingPreviousMessages(false);
      }
    };

    loadPreviousChat();
  }, [isSignedIn, api]);

  // Save chat ID to localStorage whenever it changes
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem(CHAT_ID_STORAGE_KEY, currentChatId);
    }
  }, [currentChatId]);

  // Initialize audio context
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Create reverb impulse response with pre-delay
  const createReverbImpulse = (audioContext: AudioContext, duration: number = 1.2, decay: number = 3, preDelay: number = 0.03) => {
    const sampleRate = audioContext.sampleRate;
    const preDelayFrames = Math.floor(preDelay * sampleRate);
    const length = sampleRate * duration + preDelayFrames;
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      // Add pre-delay silence
      for (let i = 0; i < preDelayFrames; i++) {
        channelData[i] = 0;
      }
      
      // Generate reverb tail after pre-delay
      for (let i = preDelayFrames; i < length; i++) {
        const t = (i - preDelayFrames) / (length - preDelayFrames);
        // More complex reverb algorithm for lush sound
        const noise = (Math.random() * 2 - 1);
        const envelope = Math.pow(1 - t, decay) * Math.exp(-t * 2);
        const modulation = 1 + 0.1 * Math.sin(t * Math.PI * 8); // Add subtle modulation
        channelData[i] = noise * envelope * modulation * 0.3;
      }
    }
    
    return impulse;
  };

  // Create professional EQ chain
  const createEQChain = (audioContext: AudioContext) => {
    // De-essing filter (notch around 6kHz)
    const deEsser = audioContext.createBiquadFilter();
    deEsser.type = 'peaking';
    deEsser.frequency.setValueAtTime(6000, audioContext.currentTime);
    deEsser.Q.setValueAtTime(3, audioContext.currentTime);
    deEsser.gain.setValueAtTime(-4, audioContext.currentTime); // Reduce harsh sibilants

    // Warmth boost (200Hz)
    const warmthBoost = audioContext.createBiquadFilter();
    warmthBoost.type = 'peaking';
    warmthBoost.frequency.setValueAtTime(200, audioContext.currentTime);
    warmthBoost.Q.setValueAtTime(1.5, audioContext.currentTime);
    warmthBoost.gain.setValueAtTime(3, audioContext.currentTime); // Add warmth

    // High-cut for reverb clarity (gentle roll-off above 8kHz)
    const highCut = audioContext.createBiquadFilter();
    highCut.type = 'lowpass';
    highCut.frequency.setValueAtTime(8000, audioContext.currentTime);
    highCut.Q.setValueAtTime(0.7, audioContext.currentTime);

    // Low-cut to clean up mud (below 80Hz)
    const lowCut = audioContext.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.setValueAtTime(80, audioContext.currentTime);
    lowCut.Q.setValueAtTime(0.7, audioContext.currentTime);

    // Chain the EQ filters
    lowCut.connect(warmthBoost);
    warmthBoost.connect(deEsser);
    deEsser.connect(highCut);

    return { input: lowCut, output: highCut };
  };

  // Simulate compression with dynamic range control
  const createCompressor = (audioContext: AudioContext) => {
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioContext.currentTime); // Gentle threshold
    compressor.knee.setValueAtTime(8, audioContext.currentTime); // Soft knee
    compressor.ratio.setValueAtTime(3, audioContext.currentTime); // 3:1 ratio
    compressor.attack.setValueAtTime(0.003, audioContext.currentTime); // Fast attack
    compressor.release.setValueAtTime(0.1, audioContext.currentTime); // Medium release
    return compressor;
  };

  // Generate a test tone (for testing when no MP3 is available)
  const generateTestTone = (audioContext: AudioContext, frequency: number = 440, duration: number = 2) => {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      // Create a more complex tone that mimics voice characteristics
      const t = i / sampleRate;
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      const harmonic2 = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.3;
      const harmonic3 = Math.sin(2 * Math.PI * frequency * 3 * t) * 0.1;
      
      // Add envelope to make it sound more natural
      const envelope = Math.exp(-t * 0.5) * (1 - Math.exp(-t * 10));
      
      data[i] = (fundamental + harmonic2 + harmonic3) * envelope * 0.3;
    }
    
    return buffer;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Test audio playback with effects
  const playTestAudio = async () => {
    if (isTestPlaying) {
      stopTestAudio();
      return;
    }

    try {
      const audioContext = getAudioContext();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      let audioBuffer;

      // Try to load MP3 first, fallback to generated tone
      try {
        console.log('Fetching test.mp3...');
        const response = await fetch('/test.mp3');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
        }
        
        console.log('Audio file fetched, size:', response.headers.get('content-length'));
        const arrayBuffer = await response.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Audio file is empty');
        }
        
        console.log('Decoding audio data...');
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('Audio decoded successfully, duration:', audioBuffer.duration, 'seconds');
        
      } catch (mp3Error) {
        console.log('MP3 loading failed, generating test tone:', (mp3Error as Error).message);
        // Generate a test tone instead
        audioBuffer = generateTestTone(audioContext, 200, 3); // Lower frequency for voice-like sound
        console.log('Generated test tone, duration:', audioBuffer.duration, 'seconds');
      }
      
      // Create source node
      const sourceNode = audioContext.createBufferSource();
      testSourceNodeRef.current = sourceNode;
      sourceNode.buffer = audioBuffer;
      
      // Set playback rate for pitch shifting (deeper voice)
      sourceNode.playbackRate.setValueAtTime(1.0, audioContext.currentTime); // Original pitch
      
      // Create professional audio processing chain
      const eqChain = createEQChain(audioContext);
      const compressor = createCompressor(audioContext);
      
      // Create reverb with pre-delay
      const convolver = audioContext.createConvolver();
      convolver.buffer = createReverbImpulse(audioContext, 1.5, 4, 0.04); // Longer, lush reverb
      
      // Create reverb EQ (heavily filtered as recommended)
      const reverbEQ = audioContext.createBiquadFilter();
      reverbEQ.type = 'bandpass';
      reverbEQ.frequency.setValueAtTime(1000, audioContext.currentTime);
      reverbEQ.Q.setValueAtTime(0.5, audioContext.currentTime);
      
      // Create gain nodes for mixing
      const dryGain = audioContext.createGain();
      const wetGain = audioContext.createGain();
      const outputGain = audioContext.createGain();
      
      // Professional mix levels
      dryGain.gain.setValueAtTime(0.75, audioContext.currentTime); // Dry signal
      wetGain.gain.setValueAtTime(0.4, audioContext.currentTime); // Reverb signal (automated in real scenario)
      outputGain.gain.setValueAtTime(0.85, audioContext.currentTime); // Overall volume
      
      // Connect the professional audio graph:
      // Source -> EQ Chain -> Compressor -> Split to Dry/Wet
      sourceNode.connect(eqChain.input);
      eqChain.output.connect(compressor);
      
      // Dry path: Compressor -> Dry Gain -> Output
      compressor.connect(dryGain);
      dryGain.connect(outputGain);
      
      // Wet path: Compressor -> Reverb -> Reverb EQ -> Wet Gain -> Output
      compressor.connect(convolver);
      convolver.connect(reverbEQ);
      reverbEQ.connect(wetGain);
      wetGain.connect(outputGain);
      
      // Final output
      outputGain.connect(audioContext.destination);
      
      sourceNode.onended = () => {
        console.log('Test audio playback ended');
        setIsTestPlaying(false);
        testSourceNodeRef.current = null;
      };

      setIsTestPlaying(true);
      console.log('Starting professional audio playback...');
      sourceNode.start(0);
      
    } catch (error) {
      console.error('Test audio playback error:', error);
      setIsTestPlaying(false);
      alert('Audio playback failed. Please check console for details.');
    }
  };

  // Stop test audio
  const stopTestAudio = () => {
    if (testSourceNodeRef.current) {
      try {
        testSourceNodeRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
      testSourceNodeRef.current = null;
    }
    setIsTestPlaying(false);
  };

  // Convert base64 to audio and play with professional processing
  const playAudio = async (base64Audio: string, format: string = 'mp3') => {
    // Stop any currently playing audio
    stopAudio();
    stopTestAudio();

    try {
      const audioContext = getAudioContext();
      
      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(byteArray.buffer);
      
      // Create source node
      const sourceNode = audioContext.createBufferSource();
      sourceNodeRef.current = sourceNode;
      sourceNode.buffer = audioBuffer;
      
      // Set playback rate for pitch shifting (deeper voice)
      sourceNode.playbackRate.setValueAtTime(1.0, audioContext.currentTime); // Original pitch
      
      // Create professional audio processing chain
      const eqChain = createEQChain(audioContext);
      const compressor = createCompressor(audioContext);
      
      // Create reverb with pre-delay
      const convolver = audioContext.createConvolver();
      convolver.buffer = createReverbImpulse(audioContext, 1.2, 3.5, 0.035); // Ethereal reverb
      
      // Create reverb EQ (heavily filtered as recommended)
      const reverbEQ = audioContext.createBiquadFilter();
      reverbEQ.type = 'bandpass';
      reverbEQ.frequency.setValueAtTime(800, audioContext.currentTime);
      reverbEQ.Q.setValueAtTime(0.6, audioContext.currentTime);
      
      // Create gain nodes for mixing
      const dryGain = audioContext.createGain();
      const wetGain = audioContext.createGain();
      const outputGain = audioContext.createGain();
      
      // Professional mix levels for AI voice
      dryGain.gain.setValueAtTime(0.8, audioContext.currentTime); // Dry signal
      wetGain.gain.setValueAtTime(0.35, audioContext.currentTime); // Subtle reverb for clarity
      outputGain.gain.setValueAtTime(0.9, audioContext.currentTime); // Overall volume
      
      // Connect the professional audio graph:
      // Source -> EQ Chain -> Compressor -> Split to Dry/Wet
      sourceNode.connect(eqChain.input);
      eqChain.output.connect(compressor);
      
      // Dry path: Compressor -> Dry Gain -> Output
      compressor.connect(dryGain);
      dryGain.connect(outputGain);
      
      // Wet path: Compressor -> Reverb -> Reverb EQ -> Wet Gain -> Output
      compressor.connect(convolver);
      convolver.connect(reverbEQ);
      reverbEQ.connect(wetGain);
      wetGain.connect(outputGain);
      
      // Final output
      outputGain.connect(audioContext.destination);
      
      sourceNode.onended = () => {
        setIsVoicePlaying(false);
        sourceNodeRef.current = null;
      };

      setIsVoicePlaying(true);
      sourceNode.start(0);
      
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsVoicePlaying(false);
      
      // Fallback to regular audio playback if Web Audio API fails
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: `audio/${format}` });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsVoicePlaying(false);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        console.error('Fallback audio playback error');
        URL.revokeObjectURL(audioUrl);
        setIsVoicePlaying(false);
        currentAudioRef.current = null;
      };

      setIsVoicePlaying(true);
      audio.play().catch(console.error);
    }
  };

  // Stop any playing audio
  const stopAudio = () => {
    // Stop Web Audio API source
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
      sourceNodeRef.current = null;
    }
    
    // Stop regular audio element
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      URL.revokeObjectURL(currentAudioRef.current.src);
      currentAudioRef.current = null;
    }
    
    setIsVoicePlaying(false);
  };

  // Reset chat function
  const resetChat = () => {
    // Clear messages
    setMessages([]);
    
    // Clear chat ID from state and localStorage
    setCurrentChatId(null);
    localStorage.removeItem(CHAT_ID_STORAGE_KEY);
    
    // Stop any playing audio
    stopAudio();
    stopTestAudio();
    
    // Clear input
    setInput('');
    
    // Reset loading states
    setIsLoading(false);
    setIsLoadingPreviousMessages(false);
    
    // Reset the flag so new sessions can load
    hasLoadedPreviousMessages.current = false;
    
    console.log('Chat session reset');
  };

  const submitMessage = async (inputMessage: string) => {
    if (!inputMessage.trim() || isLoading || !isSignedIn) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Add loading AI message
    const loadingMessage: Message = {
      id: `ai-${Date.now()}`,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };
    setMessages(prev => [...prev, loadingMessage]);
    
    setIsLoading(true);
    stopAudio(); // Stop any currently playing audio
    
    try {
      const data: QueryResponse = await api.post('/query', {
        query: inputMessage,
        enable_voice: true,
        ...(currentChatId && { chat_id: currentChatId })
      });
      
      
      setMessages(prev => prev.map(msg => {
        if (msg.isLoading && msg.type === 'ai') {
          return {
            ...msg,
            content: data.text_response,
            isLoading: false,
            hasAudio: !!data.audio_base64,
            chatId: data.chat_id
          };
        }
        return msg;
      }));

      // Update current chat ID (this will also save to localStorage via useEffect)
      if (data.chat_id) {
        setCurrentChatId(data.chat_id);
      }

      // Play audio if available
      if (data.audio_base64) {
        playAudio(data.audio_base64, data.audio_format || 'mp3');
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(msg => {
        if (msg.isLoading && msg.type === 'ai') {
          return {
            ...msg,
            content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
            isLoading: false
          };
        }
        return msg;
      }));
    } finally {
      setIsLoading(false);
    }
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
      stopAudio();
      stopTestAudio();
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getPlaceholder = () => {
    if (!isSignedIn) return "Please sign in to chat...";
    if (isLoadingPreviousMessages) return "Loading previous messages...";
    if (isLoading) return "AI is thinking...";
    return "Type your message...";
  };

  return (
    <div className="fixed right-6 top-6 bottom-6 w-96 flex flex-col">
      {/* Glass container */}
      <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with Voice Indicator and Reset Button */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg">Voice Assistant</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={resetChat}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors bg-white/20 hover:bg-white/30 text-white flex items-center gap-1"
                title="Reset Chat"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
              <button
                onClick={playTestAudio}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isTestPlaying 
                    ? 'bg-red-500/80 hover:bg-red-600/80 text-white' 
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                {isTestPlaying ? 'Stop Test' : 'Test Audio'}
              </button>
            </div>
          </div>
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoadingPreviousMessages && (
            <div className="text-center text-white/60 mt-8">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <p className="text-sm">Loading previous messages...</p>
              </div>
            </div>
          )}
          
          {!isLoadingPreviousMessages && messages.length === 0 && (
            <div className="text-center text-white/60 mt-8">
              <p className="text-sm">
                {isSignedIn ? "Start a conversation with voice responses..." : "Please sign in to chat"}
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                </div>
              )}
              
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-blue-500/80 backdrop-blur-sm text-white'
                    : 'bg-white/20 backdrop-blur-sm text-white border border-white/10'
                }`}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-white/60 text-xs ml-2">Thinking...</span>
                  </div>
                ) : (
                  <div className="text-sm">
                    {message.type === 'user' ? (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : (
                      <div className="relative">
                        <ReactMarkdown
                          components={{
                            p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({children}) => <ul className="mb-2 ml-4 space-y-1 list-disc list-outside">{children}</ul>,
                            ol: ({children}) => <ol className="mb-2 ml-4 space-y-1 list-decimal list-outside">{children}</ol>,
                            li: ({children}) => <li className="ml-2">{children}</li>,
                            h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                            h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                            h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                            code: ({children}) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs">{children}</code>,
                            pre: ({children}) => <pre className="bg-white/10 p-2 rounded mb-2 overflow-x-auto text-xs">{children}</pre>,
                            blockquote: ({children}) => <blockquote className="border-l-4 border-white/30 pl-3 italic mb-2">{children}</blockquote>,
                            a: ({href, children}) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-300 hover:text-blue-200 underline"
                              >
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input container */}
        <div className="px-6 py-4 border-t border-white/10">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/40 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 border border-white/10 resize-none"
              disabled={!isSignedIn || isLoading || isLoadingPreviousMessages}
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              type="submit"
              disabled={!isSignedIn || isLoading || isLoadingPreviousMessages || !input.trim()}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
});

GlassChatInterface.displayName = 'GlassChatInterface';

export default GlassChatInterface; 