
import React, { useEffect, useRef } from 'react';
import type { StorySegment } from '../types';
import { ParagraphCard } from './ParagraphCard';

interface StoryDisplayProps {
  segments: StorySegment[];
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ segments }) => {
  const endOfStoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfStoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments]);

  return (
    <div className="w-full flex-grow overflow-y-auto p-4 md:p-8">
      <div className="space-y-8">
        {segments.map((segment) => (
          <ParagraphCard key={segment.id} segment={segment} />
        ))}
        <div ref={endOfStoryRef} />
      </div>
    </div>
  );
};
