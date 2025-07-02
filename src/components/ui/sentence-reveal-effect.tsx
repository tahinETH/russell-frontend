"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export const SentenceRevealEffect = ({
  text,
  className,
  wordsPerMinute = 250, // Average speaking rate (150 words per minute is natural pace)
  extraPauseTime = 300, // Extra pause after sentence completes (in ms)
  resetKey, // Use resetKey instead of key to avoid React warning
}: {
  text: string;
  className?: string;
  wordsPerMinute?: number;
  extraPauseTime?: number;
  resetKey?: string | number;
}) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isActive, setIsActive] = useState(false);
  
  // Split text by line breaks to get sentences
  const sentences = text
    .split('\n')
    .filter(s => s.trim().length > 0)
    .map(s => s.trim());
  
  // Reset animation when text changes
  useEffect(() => {
    if (text && text.trim().length > 0) {
      setCurrentSentenceIndex(0);
      setIsVisible(true);
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [text, resetKey]);
  
  // Calculate timing based on word count
  const calculateTimings = (sentence: string) => {
    const words = sentence.split(' ').filter(w => w.length > 0);
    const wordCount = words.length;
    
    // Calculate total time to speak the sentence (in seconds)
    const speakingTimeSeconds = (wordCount / wordsPerMinute) * 60;
    
    // Calculate delay between each word to fill the speaking time
    // We subtract a bit to account for the word animation duration (0.5s)
    const wordDelay = Math.max(0.05, (speakingTimeSeconds - 0.5) / wordCount);
    
    // Total duration the sentence should be visible (speaking time + extra pause)
    const sentenceDuration = (speakingTimeSeconds * 1000) + extraPauseTime;
    
    return { wordDelay, sentenceDuration, wordCount };
  };
  
  const currentSentence = sentences[currentSentenceIndex] || '';
  const { wordDelay, sentenceDuration } = calculateTimings(currentSentence);
  
  useEffect(() => {
    if (!isActive || currentSentenceIndex >= sentences.length) {
      if (currentSentenceIndex >= sentences.length) {
        // All sentences shown, hide after a delay
        const hideTimer = setTimeout(() => {
          setIsActive(false);
        }, 2000);
        return () => clearTimeout(hideTimer);
      }
      return;
    }
    
    // Show current sentence
    setIsVisible(true);
    
    // Hide and move to next sentence after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      
      // Move to next sentence after fade out
      setTimeout(() => {
        setCurrentSentenceIndex(prev => prev + 1);
      }, 500); // Wait for fade out animation
    }, sentenceDuration);
    
    return () => clearTimeout(timer);
  }, [currentSentenceIndex, sentences.length, sentenceDuration, isActive]);
  
  if (!isActive || currentSentenceIndex >= sentences.length) {
    return null; // Not active or all sentences shown
  }
  
  const words = currentSentence.split(' ');
  
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key={`${resetKey}-${currentSentenceIndex}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden px-6 py-4"
          >
            <div className="flex flex-wrap gap-1">
              {words.map((word, idx) => (
                <motion.span
                  key={`${resetKey}-${currentSentenceIndex}-${idx}`}
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.5,
                    delay: idx * wordDelay,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="text-white text-xl font-light font-raleway"
                >
                  {word}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 