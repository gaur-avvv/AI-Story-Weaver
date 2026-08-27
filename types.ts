// FIX: Removed incorrect circular import. The StorySegment interface is defined within this file.

export interface VoiceStyleConfig {
  mood?: 'whisper' | 'excitement' | 'dread' | 'tender' | 'clinical' | 'playful' | 'triumph' | 'mysterious' | 'calm' | 'urgent' | string;
  tone?: string;
  genre?: string;
  targetAudience?: string;
  pacing?: 'slow_deliberate' | 'fast_urgent' | 'conversational' | 'bouncy_animated' | 'velvety_calm' | string;
  pitchModifier?: string;
  whisper?: boolean;
  pace?: string;
  intensity?: string;
}

export interface StorySegment {
  id: string;
  paragraph: string;
  imageUrl?: string;
  audioUrl?: string;
  isLoadingImage?: boolean;
  isLoadingAudio?: boolean;
  isRetryingImage?: boolean;
  isRetryingAudio?: boolean;
  choices?: string[];
  selectedChoice?: string;
  chapterTitle?: string;
  chapterNumber?: number;
  tone?: string;
  sentiment?: string;
  voiceStyle?: string;
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

export type StoryGenre = 
  | 'fantasy' 
  | 'dark_fantasy'
  | 'sci-fi' 
  | 'cyberpunk'
  | 'space_opera'
  | 'steampunk'
  | 'mystery' 
  | 'crime'
  | 'thriller' 
  | 'horror' 
  | 'cosmic_horror'
  | 'adventure' 
  | 'superhero' 
  | 'fairy_tale' 
  | 'fable' 
  | 'mythological'
  | 'time_travel'
  | 'post_apocalyptic'
  | 'urban_fantasy'
  | 'romance' 
  | 'historical' 
  | 'western'
  | 'drama'
  | 'funny' 
  | 'bedtime' 
  | 'educational';

export type StoryImageStyle = 
  | 'whimsical' 
  | 'cartoon' 
  | 'realistic' 
  | 'watercolor' 
  | '3d_render' 
  | 'pixel_art' 
  | 'anime' 
  | 'studio_ghibli'
  | 'oil_painting' 
  | 'dark_fantasy_oil'
  | 'cyberpunk_neon'
  | 'synthwave_80s'
  | 'ukiyo_e'
  | 'stained_glass'
  | 'paper_cutout'
  | 'gothic_etching'
  | 'pop_art_comic'
  | 'cinematic_photo'
  | 'concept_art'
  | 'noir'
  | 'sketch' 
  | 'pencil_sketch' 
  | 'claymation' 
  | 'mosaic' 
  | 'disney_animation' 
  | 'pixar_3d' 
  | 'vintage_disney';

export type ImageAspectRatio = '16:9' | '1:1' | '4:3' | '3:2' | '9:16' | '21:9';

export type StoryAudience = 
  | 'early_reader' 
  | 'children' 
  | 'middle_grade' 
  | 'teen' 
  | 'young_adult' 
  | 'adult' 
  | 'mature_dark';

export type StoryTone = 
  | 'balanced' 
  | 'archaic_lyrical' 
  | 'clinical_cyber' 
  | 'gritty_noir' 
  | 'visceral_gothic' 
  | 'whimsical_playful' 
  | 'suspenseful_urgent' 
  | 'tender_romantic' 
  | 'philosophical_cerebral' 
  | 'humorous_witty' 
  | 'soothing_gentle';

export interface Settings {
  storyLength: 'very_short' | 'short' | 'medium' | 'long' | 'very_long';
  genre: StoryGenre;
  imageStyle: StoryImageStyle;
  storyTone?: StoryTone;
  generateAudio: boolean;
  pdfMargin: number;
  pdfTheme?: 'midnight' | 'classic_ivory' | 'emerald_parchment' | 'royal_slate' | 'cyberpunk' | 'sunset_crimson';
  // Audio Generation
  audioProvider: 'gemini' | 'openai' | 'pollinations';
  audioModel: string;
  voice: string;

  // Text Generation
  textProvider: 
    | 'gemini' 
    | 'puter' 
    | 'pollinations'
    | 'openai' 
    | 'anthropic'
    | 'deepseek'
    | 'xai'
    | 'mistral'
    | 'minimax'
    | 'kimi'
    | 'alibaba'
    | 'z_ai'
    | 'zai'
    | 'cohere'
    | 'inception'
    | 'azure_openai'
    | 'aws_bedrock'
    | 'groq' 
    | 'cerebras' 
    | 'nvidia' 
    | 'together'
    | 'openrouter' 
    | 'huggingface' 
    | 'fireworks'
    | 'cloudflare' 
    | 'siliconflow' 
    | 'requesty' 
    | 'llamacpp'
    | 'ollama'
    | 'lmstudio'
    | 'jan'
    | 'vllm'
    | 'sglang'
    | 'localai'
    | 'gpt4all'
    | 'local_openai_proxy'
    | 'webgpu'
    | 'others'
    | (string & {});
  textModel: string;

  // Image Generation
  imageProvider: 'gemini' | 'puter' | 'pollinations' | 'zai' | 'siliconflow' | 'huggingface' | 'cloudflare' | 'openai' | (string & {});
  imageModel: string;
  imageAspectRatio?: ImageAspectRatio;

  // Cloud Storage Preference
  storageProvider?: 'hybrid' | 'puter' | 'local';

  // Content & Layout Settings
  targetAudience: StoryAudience;
  fontFamilyPreference?: 'serif' | 'sans' | 'mono' | 'cinzel' | 'merriweather' | 'lora' | 'outfit' | 'inter' | 'fantasy' | 'handwriting';
  fontSize?: number;
  justifyText?: boolean;
  autoPlayNarration?: boolean;

  // API Keys & Configs
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  deepseekApiKey?: string;
  xaiApiKey?: string;
  mistralApiKey?: string;
  minimaxApiKey?: string;
  kimiApiKey?: string;
  alibabaApiKey?: string;
  zaiApiKey?: string;
  cohereApiKey?: string;
  inceptionApiKey?: string;
  azureOpenaiApiKey?: string;
  azureOpenaiEndpoint?: string;
  awsBedrockApiKey?: string;
  groqApiKey?: string;
  cerebrasApiKey?: string;
  nvidiaApiKey?: string;
  togetherApiKey?: string;
  openRouterApiKey?: string;
  huggingfaceApiKey?: string;
  fireworksApiKey?: string;
  cloudflareApiKey?: string;
  cloudflareAccountId?: string;
  siliconFlowApiKey?: string;
  requestyApiKey?: string;
  pollinationsApiKey?: string;
  localEndpoint?: string;
  othersApiKey?: string;
  customBaseUrl?: string;
  extendedApiKeys?: Record<string, string>;
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

