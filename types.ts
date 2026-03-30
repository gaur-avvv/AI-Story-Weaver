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
  storyLength: 'very_short' | 'short' | 'medium' | 'long' | 'very_long';
  genre: 'fantasy' | 'sci-fi' | 'mystery' | 'adventure' | 'funny' | 'fairy_tale' | 'educational' | 'bedtime' | 'fable' | 'superhero';
  imageStyle: 'whimsical' | 'cartoon' | 'realistic' | 'watercolor' | '3d_render' | 'pixel_art' | 'anime' | 'oil_painting' | 'sketch' | 'pencil_sketch' | 'claymation' | 'mosaic';
  generateAudio: boolean;
  pdfMargin: number;
  // Audio Generation
  audioProvider: 'gemini' | 'openai' | 'pollinations';
  audioModel: string;
  voice: string;

  // Text Generation
  textProvider: 'gemini' | 'groq' | 'openrouter' | 'siliconflow' | 'pollinations' | 'others';
  textModel: string;

  // Image Generation
  imageProvider: 'gemini' | 'pollinations' | 'siliconflow';
  imageModel: string;

  // Content Settings
  targetAudience: 'children' | 'teen' | 'adult';

  // API Keys
  groqApiKey?: string;
  openRouterApiKey?: string;
  siliconFlowApiKey?: string;
  openaiApiKey?: string;
  pollinationsApiKey?: string;
  othersApiKey?: string;
}
