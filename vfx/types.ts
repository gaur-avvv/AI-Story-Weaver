export type VfxGenre = 
  | 'horror' 
  | 'sci-fi' 
  | 'romance' 
  | 'mystery' 
  | 'fantasy' 
  | 'thriller' 
  | 'comedy' 
  | 'historical' 
  | 'western' 
  | 'action';

export type VfxTension = 'low' | 'medium' | 'high' | 'climax';

export type VfxWeather = 'clear' | 'rainy' | 'snowy' | 'foggy' | 'stormy' | 'windy';

export type VfxTimeOfDay = 'dawn' | 'day' | 'dusk' | 'night' | 'midnight';

export type VfxLocation = 
  | 'default' 
  | 'forest' 
  | 'city' 
  | 'space' 
  | 'underwater' 
  | 'desert' 
  | 'haunted_house' 
  | 'office';

export type VfxEmotion = 
  | 'calm' 
  | 'happy' 
  | 'sad' 
  | 'angry' 
  | 'scared' 
  | 'in_love' 
  | 'confused' 
  | 'determined';

export type VfxProgression = 'exposition' | 'rising' | 'climax' | 'falling' | 'denouement';

export type VfxRelationship = 'none' | 'romance' | 'enmity' | 'friendship' | 'rivalry' | 'family';

export type VfxPacing = 'slow' | 'medium' | 'fast';

export type VfxSupernatural = 'none' | 'magic' | 'cyberpunk' | 'divine' | 'cosmic';

export type VfxMoralAlignment = 'good' | 'neutral' | 'evil';

export type VfxTwist = 'none' | 'reveal' | 'betrayal' | 'mystery' | 'sacrifice';

export type SentimentTone = 
  | 'triumphant'
  | 'ominous'
  | 'serene'
  | 'melancholic'
  | 'fiery_action'
  | 'mystical'
  | 'whimsical'
  | 'suspenseful'
  | 'romantic'
  | 'neutral';

export interface MoodPalette {
  name: string;
  bgFrom: string;
  bgVia: string;
  bgTo: string;
  accent: string;
  overlayTint: string;
  auraGlow: string;
  vignetteStyle: string;
}

export interface StorySentimentAnalysis {
  tone: SentimentTone;
  label: string;
  score: number; // -1 (very dark/negative) to +1 (very uplifting/positive)
  tensionScore: number; // 0 to 1
  energyScore: number; // 0 (calm) to 1 (explosive)
  dominantKeywords: string[];
  suggestedWeather?: VfxWeather;
  suggestedTimeOfDay?: VfxTimeOfDay;
  suggestedParticles?: ('ember' | 'petal' | 'leaf' | 'cosmic' | 'rain' | 'snow')[];
  palette: MoodPalette;
}

export interface VfxState {
  genre: VfxGenre;
  tension: VfxTension;
  weather: VfxWeather;
  timeOfDay: VfxTimeOfDay;
  location: VfxLocation;
  emotion: VfxEmotion;
  progression: VfxProgression;
  relationship: VfxRelationship;
  pacing: VfxPacing;
  supernatural: VfxSupernatural;
  moralAlignment: VfxMoralAlignment;
  activeTwist: VfxTwist;
  
  // Real-time Sentiment & Environmental Mood
  sentiment: StorySentimentAnalysis;
  
  // Cinematic Scene Effect Toggles
  showFireEmbers: boolean;
  showFlowerPetals: boolean;
  showLushPlants: boolean;
  showHorizonHills: boolean;
  showRiverWater: boolean;
  showCosmicDust: boolean;

  // System Toggles & Controls
  isAutoAnalyzeEnabled: boolean;
  isAudioAtmosphereEnabled: boolean;
  shakeTrigger: number; // Increment to trigger screen shake
  lightningTrigger: number; // Increment to trigger lightning flash
}

export interface GenreThemeConfig {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgGradient: string;
  fontFamily: string;
  cardStyle: string;
  buttonStyle: string;
  cursorStyle: string;
  borderStyle: string;
  auraGlow: string;
}
