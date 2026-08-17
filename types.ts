// FIX: Removed incorrect circular import. The StorySegment interface is defined within this file.

export interface StorySegment {
  id: string;
  paragraph: string;
  imageUrl?: string;
  audioUrl?: string;
  isLoadingImage?: boolean;
  isLoadingAudio?: boolean;
  choices?: string[];
  selectedChoice?: string;
  chapterTitle?: string;
  chapterNumber?: number;
}

export interface StoryChapter {
  id: string;
  chapterNumber: number;
  title: string;
  startIndex: number;
  segmentCount: number;
}

export interface SavedStory {
  id: string;
  title: string;
  timestamp: number;
  segments: StorySegment[];
  chapters?: StoryChapter[];
  cloudSynced?: boolean;
  puterPath?: string;
}

export interface Settings {
  storyLength: 'very_short' | 'short' | 'medium' | 'long' | 'very_long';
  genre: 'fantasy' | 'sci-fi' | 'mystery' | 'adventure' | 'funny' | 'fairy_tale' | 'educational' | 'bedtime' | 'fable' | 'superhero' | 'thriller' | 'romance' | 'horror' | 'historical' | 'crime' | 'drama';
  imageStyle: 'whimsical' | 'cartoon' | 'realistic' | 'watercolor' | '3d_render' | 'pixel_art' | 'anime' | 'oil_painting' | 'sketch' | 'pencil_sketch' | 'claymation' | 'mosaic' | 'disney_animation' | 'pixar_3d' | 'vintage_disney';
  generateAudio: boolean;
  pdfMargin: number;
  pdfTheme?: 'midnight' | 'classic_ivory' | 'emerald_parchment' | 'cyberpunk';
  // Audio Generation
  audioProvider: 'gemini' | 'openai' | 'pollinations';
  audioModel: string;
  voice: string;

  // Text Generation
  textProvider: 
    | 'puter' 
    | 'gemini' 
    | 'inception'
    | 'zai' 
    | 'groq' 
    | 'cerebras' 
    | 'mistral' 
    | 'cohere' 
    | 'nvidia' 
    | 'openrouter' 
    | 'requesty' 
    | 'huggingface' 
    | 'cloudflare' 
    | 'pollinations' 
    | 'siliconflow' 
    | 'openai' 
    | 'others';
  textModel: string;

  // Image Generation
  imageProvider: 'gemini' | 'puter' | 'pollinations' | 'zai' | 'siliconflow' | 'huggingface' | 'openai';
  imageModel: string;

  // Cloud Storage Preference
  storageProvider?: 'hybrid' | 'puter' | 'local';

  // Content Settings
  targetAudience: 'children' | 'teen' | 'adult';
  fontFamilyPreference?: 'serif' | 'sans' | 'mono';

  // API Keys & Configs
  inceptionApiKey?: string;
  groqApiKey?: string;
  openRouterApiKey?: string;
  siliconFlowApiKey?: string;
  openaiApiKey?: string;
  pollinationsApiKey?: string;
  zaiApiKey?: string;
  cerebrasApiKey?: string;
  mistralApiKey?: string;
  cohereApiKey?: string;
  nvidiaApiKey?: string;
  requestyApiKey?: string;
  huggingfaceApiKey?: string;
  cloudflareApiKey?: string;
  cloudflareAccountId?: string;
  othersApiKey?: string;
  customBaseUrl?: string;
}

export type EntityType = 'character' | 'location' | 'item' | 'faction' | 'event';

export interface EntityTriple {
  source: string;
  sourceType?: EntityType;
  relationship: string;
  target: string;
  targetType?: EntityType;
}

export interface GraphOccurrence {
  segmentIndex: number;
  snippet: string;
  timestamp?: number;
}

export interface EmotionalTrendEntry {
  segmentIndex: number;
  sentiment: string;
  mood?: string;
  timestamp?: number;
}

export interface GraphNode {
  id: string;
  name: string;
  type: EntityType;
  mentionCount: number;
  occurrences: GraphOccurrence[];
  isNew?: boolean;
  emotionalTrend?: EmotionalTrendEntry[];
  currentEmotion?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  segmentIndex: number;
}

export interface PlotTwistOption {
  title: string;
  category: 'revelation' | 'supernatural' | 'betrayal' | 'dramatic_shift' | 'mystery' | 'action';
  description: string;
  promptAction: string;
}

