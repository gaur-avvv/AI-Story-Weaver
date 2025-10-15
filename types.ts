// FIX: Removed incorrect circular import. The StorySegment interface is defined within this file.

export interface StorySegment {
  id: string;
  paragraph: string;
  imageUrl?: string;
  audioUrl?: string;
  isLoadingImage?: boolean;
  isLoadingAudio?: boolean;
}

export interface Settings {
  storyLength: 'short' | 'medium' | 'long';
  genre: 'fantasy' | 'sci-fi' | 'mystery' | 'adventure' | 'funny';
  imageStyle: 'whimsical' | 'cartoon' | 'realistic' | 'watercolor';
  generateAudio: boolean;
}
