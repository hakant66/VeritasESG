/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, Loader2, Play } from 'lucide-react';
import { ttsService } from '../../services/tts';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';

interface SpeechButtonProps {
  text: string;
  className?: string;
  size?: number;
}

export const SpeechButton: React.FC<SpeechButtonProps> = ({ text, className, size = 16 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { lang } = useTranslation();

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading || isPlaying) return;

    try {
      setIsLoading(true);
      // Map app language to full language name for Gemini if needed, 
      // but "Read this in tr clearly" usually works for Gemini.
      await ttsService.playText(text, lang as string);
      setIsPlaying(true);
      
      // We don't have a direct "stop" mechanism in the service yet that tracks the source,
      // but for this simple implementation we'll just show it's playing for a bit or until ended.
      // The service uses source.onended, but doesn't expose it. 
      // For now, let's just reset after a reasonable time or keep it simple.
    } catch (error) {
      console.error('Speech Playback failed:', error);
    } finally {
      setIsLoading(false);
      // Reset isPlaying eventually if we want, or just leave it for now.
      setTimeout(() => setIsPlaying(false), 2000); 
    }
  };

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className={cn(
        "p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-600 disabled:opacity-50",
        className
      )}
      title="Listen to question"
    >
      {isLoading ? (
        <Loader2 size={size} className="animate-spin" />
      ) : isPlaying ? (
        <Volume2 size={size} className="text-blue-600" />
      ) : (
        <Volume2 size={size} />
      )}
    </button>
  );
};
