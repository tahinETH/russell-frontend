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

  // Initialize audio and load preferences
  useEffect(() => {
    // Load preferences from localStorage
    const savedVolume = localStorage.getItem('bg-music-volume');
    const savedMuted = localStorage.getItem('bg-music-muted');
    const savedPlaying = localStorage.getItem('bg-music-playing');
    
    let initialVolume = 30;
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
    audio.volume = initialMuted ? 0 : initialVolume / 100;
    audioRef.current = audio;

    // Try to start playing immediately if enough is buffered
    const attemptAutoplay = async () => {
      if (!audioRef.current) return;
      
      try {
        // Set audio to muted initially to bypass autoplay restrictions
        audioRef.current.muted = true;
        await audioRef.current.play();
        
        // Unmute after successful play (unless user has muted)
        if (!initialMuted) {
          audioRef.current.muted = false;
        }
        
        setIsPlaying(true);
        localStorage.setItem('bg-music-playing', 'true');
      } catch (error) {
        console.log('Autoplay blocked - trying on user interaction');
        setIsPlaying(false);
        
        // Try to play on first user interaction
        const playOnInteraction = async () => {
          try {
            if (audioRef.current) {
              await audioRef.current.play();
              setIsPlaying(true);
              localStorage.setItem('bg-music-playing', 'true');
              // Remove the listener after successful play
              document.removeEventListener('click', playOnInteraction);
              document.removeEventListener('keydown', playOnInteraction);
            }
          } catch (err) {
            console.error('Failed to play audio:', err);
          }
        };
        
        // Add listeners for user interaction
        document.addEventListener('click', playOnInteraction, { once: true });
        document.addEventListener('keydown', playOnInteraction, { once: true });
      }
    };

    // Set up event listeners
    audio.addEventListener('loadeddata', () => {
      attemptAutoplay();
    });

    audio.addEventListener('canplaythrough', () => {
      setIsInitialized(true);
      // Try again when fully loaded
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

    // Try immediate autoplay
    if (savedPlaying !== 'false') {
      attemptAutoplay();
    }

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update volume when slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
    }
  }, [volume, isMuted]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        localStorage.setItem('bg-music-playing', 'false');
      } else {
        await audioRef.current.play();
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