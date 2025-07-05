"use client"

import { useState, useEffect } from 'react';
import { Settings, Image as ImageIcon, Mic, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';

interface ChatSettingsProps {
  onImageGenerationToggle?: (enabled: boolean) => void;
  onVoiceToggle?: (enabled: boolean) => void;
  onExpertiseChange?: (level: number) => void;
}

export default function ChatSettings({ 
  onImageGenerationToggle,
  onVoiceToggle,
  onExpertiseChange
}: ChatSettingsProps) {
  const [imageEnabled, setImageEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [expertiseLevel, setExpertiseLevel] = useState(3);

  // Load preferences from localStorage
  useEffect(() => {
    const savedImageEnabled = localStorage.getItem('chat-image-enabled');
    const savedVoiceEnabled = localStorage.getItem('chat-voice-enabled');
    const savedExpertiseLevel = localStorage.getItem('chat-expertise-level');
    
    if (savedImageEnabled !== null) {
      const enabled = savedImageEnabled === 'true';
      setImageEnabled(enabled);
    }
    
    if (savedVoiceEnabled !== null) {
      const enabled = savedVoiceEnabled === 'true';
      setVoiceEnabled(enabled);
    }
    
    if (savedExpertiseLevel !== null) {
      const level = parseInt(savedExpertiseLevel, 10);
      if (level >= 1 && level <= 5) {
        setExpertiseLevel(level);
      }
    }
  }, []);

  const handleImageToggle = () => {
    const newValue = !imageEnabled;
    setImageEnabled(newValue);
    localStorage.setItem('chat-image-enabled', newValue.toString());
    onImageGenerationToggle?.(newValue);
  };

  const handleVoiceToggle = () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    localStorage.setItem('chat-voice-enabled', newValue.toString());
    onVoiceToggle?.(newValue);
  };

  const handleExpertiseChange = (values: number[]) => {
    const newLevel = values[0];
    setExpertiseLevel(newLevel);
    localStorage.setItem('chat-expertise-level', newLevel.toString());
    onExpertiseChange?.(newLevel);
  };

  const getExpertiseLabel = (level: number) => {
    const labels = ['', 'ELI5', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
    return labels[level] || 'Intermediate';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl rounded-xl overflow-hidden"
        side="bottom"
        align="end"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Chat Settings</h3>
        </div>
        
        {/* Settings */}
        <div className="p-2">
          {/* Image Generation Toggle */}
          <button
            onClick={handleImageToggle}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="h-4 w-4 text-slate-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">Image Generation</p>
                <p className="text-xs text-slate-500">Generate images with responses</p>
              </div>
            </div>
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              imageEnabled ? 'bg-blue-600' : 'bg-slate-300'
            }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                imageEnabled ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
          </button>

          <Separator className="my-1" />

          {/* Voice Toggle */}
          <button
            onClick={handleVoiceToggle}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Mic className="h-4 w-4 text-slate-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">Voice Responses</p>
                <p className="text-xs text-slate-500">Enable voice for AI responses</p>
              </div>
            </div>
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              voiceEnabled ? 'bg-blue-600' : 'bg-slate-300'
            }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                voiceEnabled ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
          </button>

          <Separator className="my-1" />

          {/* Expertise Level Slider */}
          <div className="px-3 py-3">
            <div className="flex items-center gap-3 mb-3">
              <GraduationCap className="h-4 w-4 text-slate-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">Expertise Level</p>
                <p className="text-xs text-slate-500">How detailed should responses be?</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">ELI5</span>
                <span className="text-xs font-medium text-slate-700">{getExpertiseLabel(expertiseLevel)}</span>
                <span className="text-xs text-slate-500">Expert</span>
              </div>
              <Slider
                value={[expertiseLevel]}
                onValueChange={handleExpertiseChange}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 