import { useRef, useState, useCallback } from 'react';

export const useAudioProcessing = () => {
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const testSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🎵 Created new audio context, state:', audioContextRef.current.state);
    }
    return audioContextRef.current;
  }, []);

  // Convert base64 to ArrayBuffer
  const base64ToArrayBuffer = useCallback((base64: string): ArrayBuffer => {
    const startTime = performance.now();
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const endTime = performance.now();
    
    console.log('🎵 base64 conversion:', {
      inputLength: base64.length,
      outputSize: byteArray.buffer.byteLength,
      conversionTime: endTime - startTime
    });
    
    return byteArray.buffer;
  }, []);

  // Play complete audio file
  const playAudio = useCallback(async (base64Audio: string, format: string = 'mp3') => {
    const startTime = performance.now();
    console.log('🎵 playAudio called:', { 
      format, 
      audioLength: base64Audio?.length,
      timestamp: startTime
    });
    
    try {
      // Stop any currently playing audio
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch (e) {
          // Source might already be stopped
        }
        currentSourceRef.current = null;
      }

      const audioContext = getAudioContext();
      
      console.log('🎵 audio context state:', {
        state: audioContext.state,
        currentTime: audioContext.currentTime,
        sampleRate: audioContext.sampleRate
      });
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        console.log('🎵 resuming suspended audio context');
        await audioContext.resume();
      }
      
      // Convert base64 to ArrayBuffer
      const arrayBuffer = base64ToArrayBuffer(base64Audio);
      
      // Decode the complete audio file
      const decodeStartTime = performance.now();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const decodeEndTime = performance.now();
      
      console.log('🎵 decode complete:', {
        decodeTime: decodeEndTime - decodeStartTime,
        bufferDuration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels
      });

      // Create source and play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      currentSourceRef.current = source;
      
      // 🎵 PROFESSIONAL AUDIO EFFECTS CHAIN 🎵
      
      // Create EQ chain for professional sound
      const eqChain = createEQChain(audioContext);
      
      // Create compressor for dynamic range control
      const compressor = createCompressor(audioContext);
      
      // Create reverb impulse and convolver
      const reverbImpulse = createReverbImpulse(audioContext);
      const convolver = audioContext.createConvolver();
      convolver.buffer = reverbImpulse;
      
      // Create dry/wet gain nodes for reverb mixing
      const dryGain = audioContext.createGain();
      const wetGain = audioContext.createGain();
      const outputGain = audioContext.createGain();
      
      // Set reverb mix (30% wet, 70% dry)
      dryGain.gain.setValueAtTime(0.7, audioContext.currentTime);
      wetGain.gain.setValueAtTime(0.3, audioContext.currentTime);
      outputGain.gain.setValueAtTime(0.8, audioContext.currentTime); // Overall volume
      
      // Connect the professional audio chain:
      // Source → EQ → Compressor → Split(Dry/Wet) → Reverb → Mix → Output
      source.connect(eqChain.input);
      eqChain.output.connect(compressor);
      
      // Split signal for dry/wet reverb processing
      compressor.connect(dryGain);
      compressor.connect(convolver);
      convolver.connect(wetGain);
      
      // Mix dry and wet signals
      dryGain.connect(outputGain);
      wetGain.connect(outputGain);
      
      // Final output
      outputGain.connect(audioContext.destination);
      
      console.log('🎵 ✨ Professional audio effects applied:', {
        eq: 'De-essing + Warmth + High/Low cuts',
        compression: 'Dynamic range control',
        reverb: 'Lush spatial processing',
        mix: '70% dry, 30% wet'
      });
      
      source.onended = () => {
        const endTime = performance.now();
        console.log('🎵 audio playback ended:', {
          totalPlayTime: endTime - startTime,
          duration: audioBuffer.duration
        });
        
        currentSourceRef.current = null;
        setIsVoicePlaying(false);
      };

      const playStartTime = performance.now();
      source.start(0);
      setIsVoicePlaying(true);
      
      console.log('🎵 playback started:', {
        startLatency: playStartTime - startTime,
        audioContextTime: audioContext.currentTime,
        audioContextState: audioContext.state,
        duration: audioBuffer.duration
      });
      
    } catch (error) {
      console.error('🎵 Error playing audio:', error);
      setIsVoicePlaying(false);
    }
  }, [getAudioContext, base64ToArrayBuffer]);

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    console.log('🎵 🛑 stopAudio called');
    
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
      currentSourceRef.current = null;
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

  // Simplified streaming functions for API compatibility
  const startVoiceStreaming = useCallback(() => {
    console.log('🎵 🎬 Starting voice streaming (full audio mode)');
    // Stop any currently playing audio
    stopAudio();
  }, [stopAudio]);

  const endVoiceStreaming = useCallback(() => {
    console.log('🎵 🎬 Ending voice streaming (full audio mode)');
    // Audio will end naturally when playback completes
  }, []);

  // Legacy function for API compatibility
  const queueAudioChunk = useCallback((base64Audio: string, format: string = 'mp3') => {
    console.log('🎵 queueAudioChunk called - redirecting to playAudio (full audio mode)');
    playAudio(base64Audio, format);
  }, [playAudio]);

  // Legacy function for API compatibility
  const setBufferDelay = useCallback((delayMs: number) => {
    console.log(`🎵 Buffer delay setting ignored in full audio mode: ${delayMs}ms`);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    stopAudio();
    stopTestAudio();
    // Don't close audio context immediately as it can't be reopened
    // Let the browser handle cleanup when the page unloads
  }, [stopAudio, stopTestAudio]);

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