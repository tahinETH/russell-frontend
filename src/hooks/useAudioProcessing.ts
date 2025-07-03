import { useRef, useState, useCallback } from 'react';

interface AudioQueue {
  push: (chunk: ArrayBuffer) => void;
  clear: () => void;
}

const createSimpleAudioQueue = (audioContext: AudioContext): AudioQueue => {
  const queue: ArrayBuffer[] = [];
  let isPlaying = false;

  const playNext = async () => {
    if (queue.length === 0 || isPlaying) return;

    isPlaying = true;
    const chunk = queue.shift()!;

    try {
      const audioBuffer = await audioContext.decodeAudioData(chunk);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Minimal processing for now - just basic gain for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.8, audioContext.currentTime);
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      source.onended = () => {
        isPlaying = false;
        playNext(); // Automatically continue - NO GAPS!
      };

      source.start(0);
    } catch (error) {
      console.error('Error playing chunk:', error);
      isPlaying = false;
      playNext(); // Continue with next chunk even if this one failed
    }
  };

  return {
    push: (chunk: ArrayBuffer) => {
      queue.push(chunk);
      if (!isPlaying) playNext();
    },
    clear: () => {
      queue.length = 0;
      isPlaying = false;
    }
  };
};

export const useAudioProcessing = () => {
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const testSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize audio context and queue
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('Created new audio context, state:', audioContextRef.current.state);
      
      // Create the simple audio queue
      audioQueueRef.current = createSimpleAudioQueue(audioContextRef.current);
    }
    return audioContextRef.current;
  }, []);

  // Create reverb impulse response with pre-delay (kept for future use)
  const createReverbImpulse = useCallback((audioContext: AudioContext, duration: number = 1.2, decay: number = 3, preDelay: number = 0.03) => {
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
  }, []);

  // Create professional EQ chain (kept for future use)
  const createEQChain = useCallback((audioContext: AudioContext) => {
    // De-essing filter (notch around 6kHz)
    const deEsser = audioContext.createBiquadFilter();
    deEsser.type = 'peaking';
    deEsser.frequency.setValueAtTime(6000, audioContext.currentTime);
    deEsser.Q.setValueAtTime(3, audioContext.currentTime);
    deEsser.gain.setValueAtTime(-4, audioContext.currentTime);

    // Warmth boost (200Hz)
    const warmthBoost = audioContext.createBiquadFilter();
    warmthBoost.type = 'peaking';
    warmthBoost.frequency.setValueAtTime(200, audioContext.currentTime);
    warmthBoost.Q.setValueAtTime(1.5, audioContext.currentTime);
    warmthBoost.gain.setValueAtTime(3, audioContext.currentTime);

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
  }, []);

  // Simulate compression with dynamic range control (kept for future use)
  const createCompressor = useCallback((audioContext: AudioContext) => {
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioContext.currentTime);
    compressor.knee.setValueAtTime(8, audioContext.currentTime);
    compressor.ratio.setValueAtTime(3, audioContext.currentTime);
    compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
    compressor.release.setValueAtTime(0.1, audioContext.currentTime);
    return compressor;
  }, []);

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    console.log('stopAudio called - clearing queue and stopping playback');
    
    // Clear the simple audio queue
    if (audioQueueRef.current) {
      audioQueueRef.current.clear();
    }
    
    setIsVoicePlaying(false);
  }, []);

  // Stop test audio
  const stopTestAudio = useCallback(() => {
    if (testSourceNodeRef.current) {
      try {
        testSourceNodeRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
      testSourceNodeRef.current = null;
    }
    setIsTestPlaying(false);
  }, []);

  // Convert base64 to ArrayBuffer
  const base64ToArrayBuffer = useCallback((base64: string): ArrayBuffer => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return byteArray.buffer;
  }, []);

  // Add audio chunk to queue (simplified)
  const queueAudioChunk = useCallback((base64Audio: string, format: string = 'mp3') => {
    console.log('Queueing audio chunk:', { format, audioLength: base64Audio?.length });
    
    try {
      const audioContext = getAudioContext();
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Convert base64 to ArrayBuffer
      const arrayBuffer = base64ToArrayBuffer(base64Audio);
      
      // Add to simple queue
      if (audioQueueRef.current) {
        audioQueueRef.current.push(arrayBuffer);
        setIsVoicePlaying(true);
      }
    } catch (error) {
      console.error('Error queueing audio chunk:', error);
    }
  }, [getAudioContext, base64ToArrayBuffer]);

  // Play audio function - now just queues the chunk
  const playAudio = useCallback(async (base64Audio: string, format: string = 'mp3') => {
    queueAudioChunk(base64Audio, format);
  }, [queueAudioChunk]);

  // Start voice streaming - clear queue and prepare for new chunks
  const startVoiceStreaming = useCallback(() => {
    console.log('Starting voice streaming - clearing queue');
    if (audioQueueRef.current) {
      audioQueueRef.current.clear();
    }
    setIsVoicePlaying(false);
  }, []);

  // End voice streaming - let current queue finish
  const endVoiceStreaming = useCallback(() => {
    console.log('Ending voice streaming - queue will finish naturally');
    // Don't clear queue, let it finish naturally
    // Set a timeout to update the playing state when queue is likely empty
    setTimeout(() => {
      setIsVoicePlaying(false);
    }, 1000);
  }, []);

  // Set buffer delay (kept for API compatibility, but not used in simple queue)
  const setBufferDelay = useCallback((delayMs: number) => {
    console.log(`Buffer delay setting ignored in simple queue mode: ${delayMs}ms`);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    stopAudio();
    stopTestAudio();
    // Don't close audio context immediately as it can't be reopened
    // Let the browser handle cleanup when the page unloads
  }, [stopAudio, stopTestAudio]);
  
  return {
    isVoicePlaying,
    isTestPlaying,
    getAudioContext,
    createReverbImpulse,
    createEQChain,
    createCompressor,
    playAudio,
    queueAudioChunk,
    startVoiceStreaming,
    endVoiceStreaming,
    setBufferDelay,
    stopAudio,
    stopTestAudio,
    cleanup,
    setIsVoicePlaying,
    setIsTestPlaying,
    // Legacy refs for compatibility
    currentAudioRef: { current: null },
    audioContextRef,
    sourceNodeRef: { current: null },
    testSourceNodeRef
  };
}; 