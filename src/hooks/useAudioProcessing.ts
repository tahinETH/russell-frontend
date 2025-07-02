import { useRef, useState, useCallback } from 'react';

export const useAudioProcessing = () => {
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const testSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioStartTimeRef = useRef<number>(0);

  // Initialize audio context
  const getAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('Created new audio context, state:', audioContextRef.current.state);
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
  };

  // Simulate compression with dynamic range control
  const createCompressor = (audioContext: AudioContext) => {
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioContext.currentTime);
    compressor.knee.setValueAtTime(8, audioContext.currentTime);
    compressor.ratio.setValueAtTime(3, audioContext.currentTime);
    compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
    compressor.release.setValueAtTime(0.1, audioContext.currentTime);
    return compressor;
  };

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    // Stop Web Audio API source
    if (sourceNodeRef.current) {
      console.log('stopAudio called, stopping source node');
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        console.log('Error stopping source node:', e);
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

  // Convert base64 to audio and play with professional processing
  const playAudio = useCallback(async (base64Audio: string, format: string = 'mp3') => {
    const callTime = Date.now();
    console.log('playAudio called at', callTime, 'with:', { format, audioLength: base64Audio?.length });
    
    // Stop any currently playing audio
    stopAudio();
    stopTestAudio();

    try {
      const audioContext = getAudioContext();
      
      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        console.log('Resuming suspended audio context...');
        await audioContext.resume();
      }
      
      console.log('Audio context state:', audioContext.state);

      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      console.log('Audio byte array length:', byteArray.length);
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(byteArray.buffer);
      console.log('Audio buffer decoded:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
      // Check if audio buffer is valid
      if (audioBuffer.duration === 0) {
        console.error('Audio buffer duration is 0 - invalid audio data');
        return;
      }
      
      // Create source node
      const sourceNode = audioContext.createBufferSource();
      sourceNodeRef.current = sourceNode;
      sourceNode.buffer = audioBuffer;
      
      // Set playback rate for pitch shifting (deeper voice)
      sourceNode.playbackRate.setValueAtTime(1.0, audioContext.currentTime);
      
      // Create professional audio processing chain
      const eqChain = createEQChain(audioContext);
      const compressor = createCompressor(audioContext);
      
      // Create reverb with pre-delay
      const convolver = audioContext.createConvolver();
      convolver.buffer = createReverbImpulse(audioContext, 1.5, 4, 0.04);
      
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
      dryGain.gain.setValueAtTime(0.75, audioContext.currentTime);
      wetGain.gain.setValueAtTime(0.4, audioContext.currentTime);
      outputGain.gain.setValueAtTime(0.85, audioContext.currentTime);
      
      // Connect the professional audio graph
      sourceNode.connect(eqChain.input);
      eqChain.output.connect(compressor);
      
      // Dry path
      compressor.connect(dryGain);
      dryGain.connect(outputGain);
      
      // Wet path
      compressor.connect(convolver);
      convolver.connect(reverbEQ);
      reverbEQ.connect(wetGain);
      wetGain.connect(outputGain);
      
      // Final output
      outputGain.connect(audioContext.destination);
      
      // Set up event handlers before starting
      sourceNode.onended = () => {
        const endTime = Date.now();
        const playDuration = audioStartTimeRef.current ? endTime - audioStartTimeRef.current : 0;
        console.log('Audio playback ended naturally at', endTime, 'after', playDuration, 'ms');
        console.log('Expected duration was', audioBuffer.duration * 1000, 'ms');
        setIsVoicePlaying(false);
        sourceNodeRef.current = null;
      };
      


      // Ensure audio context is truly running before starting playback
      if (audioContext.state !== 'running') {
        console.log('Audio context not running, resuming...');
        await audioContext.resume();
      }
      
      console.log('Audio context state before start:', audioContext.state);
      console.log('Starting audio playback...');
      setIsVoicePlaying(true);
      
      // Start immediately to avoid race conditions
      try {
        // Log the source node state before starting
        console.log('Source node before start:', {
          buffer: sourceNode.buffer,
          bufferDuration: sourceNode.buffer?.duration,
          playbackRate: sourceNode.playbackRate.value,
          loop: sourceNode.loop,
          context: sourceNode.context === audioContext
        });
        
        sourceNode.start(0);
        audioStartTimeRef.current = Date.now();
        console.log('Audio source started successfully at', audioStartTimeRef.current);
        console.log('Audio context state after start:', audioContext.state);
        
        // Check if audio is actually playing after a short delay
        setTimeout(() => {
          console.log('Audio check after 100ms:', {
            contextState: audioContext.state,
            currentTime: audioContext.currentTime,
            isPlaying: isVoicePlaying,
            sourceNodeStillExists: sourceNodeRef.current === sourceNode
          });
        }, 100);
      } catch (error) {
        console.error('Error starting audio source:', error);
        setIsVoicePlaying(false);
        sourceNodeRef.current = null;
      }
      
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsVoicePlaying(false);
      
      console.log('Attempting fallback audio playback...');
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
      console.log('Starting fallback audio playback...');
      audio.play().catch((playError) => {
        console.error('Fallback audio play error:', playError);
        setIsVoicePlaying(false);
      });
    }
  }, [stopAudio, stopTestAudio, getAudioContext, createEQChain, createCompressor, createReverbImpulse]);

  // Cleanup function
  const cleanup = () => {
    stopAudio();
    stopTestAudio();
    // Don't close audio context immediately as it can't be reopened
    // Let the browser handle cleanup when the page unloads
  };
  
  return {
    isVoicePlaying,
    isTestPlaying,
    getAudioContext,
    createReverbImpulse,
    createEQChain,
    createCompressor,
    playAudio,
    stopAudio,
    stopTestAudio,
    cleanup,
    setIsVoicePlaying,
    setIsTestPlaying,
    currentAudioRef,
    audioContextRef,
    sourceNodeRef,
    testSourceNodeRef
  };
}; 