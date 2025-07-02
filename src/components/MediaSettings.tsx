"use client"

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function MediaSettings() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([30]); // Default 30% volume
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState([30]);
  const [isInitialized, setIsInitialized] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  // Fade in function
  const fadeIn = (targetVolume: number, duration: number = 5000) => {
    if (!audioRef.current) return;
    
    // Clear any existing fade
    if (fadeIntervalRef.current) {
      cancelAnimationFrame(fadeIntervalRef.current);
    }
    
    const startTime = performance.now();
    const startVolume = 0;
    const volumeDiff = targetVolume - startVolume;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easeInOutCubic for smooth fade
      const easeInOutCubic = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const currentVolume = startVolume + (volumeDiff * easeInOutCubic);
      
      // Clamp volume between 0 and 1 to avoid floating-point precision issues
      const clampedVolume = Math.max(0, Math.min(1, currentVolume));
      
      if (audioRef.current && !audioRef.current.muted) {
        audioRef.current.volume = clampedVolume;
      }
      
      if (progress < 1) {
        fadeIntervalRef.current = requestAnimationFrame(animate);
      }
    };
    
    fadeIntervalRef.current = requestAnimationFrame(animate);
  };

  // Initialize audio and load preferences
  useEffect(() => {
    // Load preferences from localStorage
    const savedVolume = localStorage.getItem('bg-music-volume');
    const savedMuted = localStorage.getItem('bg-music-muted');
    const savedPlaying = localStorage.getItem('bg-music-playing');
    
    let initialVolume = 25;
    let initialMuted = false;
    
    if (savedVolume) {
      initialVolume = parseInt(savedVolume);
      setVolume([initialVolume]);
      setPreviousVolume([initialVolume]);
    }
    
    if (savedMuted === 'true') {
      initialMuted = true;
      setIsMuted(true);
    }

    // Initialize audio
    const audio = new Audio('/bg.mp3');
    audio.loop = true;
    audio.preload = 'auto';
    audioRef.current = audio;

    // Improved autoplay strategy
    const attemptAutoplay = async () => {
      if (!audioRef.current) return;
      
      try {
        // Start muted to bypass autoplay restrictions
        audioRef.current.muted = true;
        audioRef.current.volume = 1; // Set to full volume while muted
        
        await audioRef.current.play();
        console.log('Audio started (muted)');
        
        // Small delay to ensure playback has started
        setTimeout(() => {
          if (audioRef.current && !initialMuted) {
            audioRef.current.muted = false;
            audioRef.current.volume = 0; // Start at 0 for fade in
            console.log('Audio unmuted, starting fade in');
            
            // Start fade in effect
            fadeIn(initialVolume / 100, 5000);
          }
        }, 100);
        
        setIsPlaying(true);
        localStorage.setItem('bg-music-playing', 'true');
        
      } catch (error) {
        console.log('Autoplay blocked, will try on user interaction:', error);
        setIsPlaying(false);
        
        // Set up one-time user interaction handlers
        const playOnInteraction = async (event: Event) => {
          console.log('User interaction detected, starting audio');
          try {
            if (audioRef.current) {
              audioRef.current.muted = true;
              await audioRef.current.play();
              
              // Unmute after successful play
              setTimeout(() => {
                if (audioRef.current && !isMuted) {
                  audioRef.current.muted = false;
                  audioRef.current.volume = 0; // Start at 0 for fade in
                  
                  // Start fade in effect
                  fadeIn(volume[0] / 100, 5000);
                }
              }, 100);
              
              setIsPlaying(true);
              localStorage.setItem('bg-music-playing', 'true');
              
              // Clean up listeners
              document.removeEventListener('click', playOnInteraction);
              document.removeEventListener('keydown', playOnInteraction);
              document.removeEventListener('touchstart', playOnInteraction);
            }
          } catch (err) {
            console.error('Failed to play audio on interaction:', err);
          }
        };
        
        // Add multiple interaction listeners
        document.addEventListener('click', playOnInteraction, { once: true });
        document.addEventListener('keydown', playOnInteraction, { once: true });
        document.addEventListener('touchstart', playOnInteraction, { once: true });
      }
    };

    // Start autoplay attempt immediately
    if (savedPlaying !== 'false') {
      attemptAutoplay();
    }

    // Also try when audio is ready
    audio.addEventListener('canplaythrough', () => {
      setIsInitialized(true);
      if (!isPlaying && savedPlaying !== 'false') {
        attemptAutoplay();
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
    });

    // Cleanup on unmount
    return () => {
      if (fadeIntervalRef.current) {
        cancelAnimationFrame(fadeIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update volume when slider changes
  useEffect(() => {
    if (audioRef.current && !audioRef.current.muted) {
      // Cancel any ongoing fade when user manually changes volume
      if (fadeIntervalRef.current) {
        cancelAnimationFrame(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
    }
  }, [volume, isMuted]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        // Cancel any ongoing fade
        if (fadeIntervalRef.current) {
          cancelAnimationFrame(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        
        audioRef.current.pause();
        setIsPlaying(false);
        localStorage.setItem('bg-music-playing', 'false');
      } else {
        await audioRef.current.play();
        
        // Apply fade-in when resuming
        if (!isMuted) {
          audioRef.current.volume = 0;
          fadeIn(volume[0] / 100, 2000); // Shorter fade for resume
        }
        
        setIsPlaying(true);
        localStorage.setItem('bg-music-playing', 'true');
      }
    } catch (error) {
      console.error('Error toggling audio playback:', error);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(previousVolume);
      localStorage.setItem('bg-music-muted', 'false');
    } else {
      setPreviousVolume(volume);
      setIsMuted(true);
      localStorage.setItem('bg-music-muted', 'true');
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    localStorage.setItem('bg-music-volume', newVolume[0].toString());
    
    if (newVolume[0] === 0) {
      setIsMuted(true);
      localStorage.setItem('bg-music-muted', 'true');
    } else if (isMuted) {
      setIsMuted(false);
      localStorage.setItem('bg-music-muted', 'false');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white cursor-pointer transition-colors shadow-lg"
        >
          <Music className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0 bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-2xl rounded-2xl overflow-hidden"
        side="top"
        align="end"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Background Music</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              className="h-8 w-8 p-0 hover:bg-white/20 rounded-lg transition-colors"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Controls */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-8 w-8 p-0 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              {isMuted || volume[0] === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1 px-2">
              <Slider
                value={volume}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-full [&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-white/50 [&_[data-slot=slider-thumb]]:shadow-lg"
              />
            </div>
            <span className="text-xs text-white/70 w-10 text-right flex-shrink-0">
              {Math.round(volume[0])}%
            </span>
          </div>
          
          {/* Status indicator */}
          <div className="mt-3 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
              <span>
                {!isInitialized ? 'Loading...' : isPlaying ? 'Playing' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 