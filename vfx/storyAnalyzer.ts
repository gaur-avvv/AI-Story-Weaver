import { 
  VfxState, 
  VfxTension, 
  VfxWeather, 
  VfxTimeOfDay, 
  VfxLocation, 
  VfxEmotion, 
  VfxSupernatural, 
  VfxTwist,
  StorySentimentAnalysis,
  SentimentTone,
  MoodPalette 
} from './types';

export const DEFAULT_SENTIMENT_PALETTES: Record<SentimentTone, MoodPalette> = {
  triumphant: {
    name: 'Triumphant Radiance',
    bgFrom: 'from-slate-950',
    bgVia: 'via-amber-950/40',
    bgTo: 'to-yellow-950/50',
    accent: '#f59e0b',
    overlayTint: 'rgba(245, 158, 11, 0.12)',
    auraGlow: 'rgba(251, 191, 36, 0.35)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 40%, rgba(120, 53, 15, 0.5) 100%)',
  },
  ominous: {
    name: 'Ominous Dread',
    bgFrom: 'from-slate-950',
    bgVia: 'via-red-950/60',
    bgTo: 'to-black',
    accent: '#dc2626',
    overlayTint: 'rgba(220, 38, 38, 0.18)',
    auraGlow: 'rgba(239, 68, 68, 0.35)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 30%, rgba(69, 10, 10, 0.8) 100%)',
  },
  serene: {
    name: 'Serene Twilight',
    bgFrom: 'from-slate-950',
    bgVia: 'via-emerald-950/30',
    bgTo: 'to-teal-950/40',
    accent: '#10b981',
    overlayTint: 'rgba(16, 185, 129, 0.08)',
    auraGlow: 'rgba(52, 211, 153, 0.25)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 50%, rgba(6, 78, 59, 0.4) 100%)',
  },
  melancholic: {
    name: 'Melancholic Mist',
    bgFrom: 'from-slate-950',
    bgVia: 'via-slate-900/60',
    bgTo: 'to-blue-950/50',
    accent: '#64748b',
    overlayTint: 'rgba(100, 116, 139, 0.14)',
    auraGlow: 'rgba(148, 163, 184, 0.22)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 40%, rgba(30, 41, 59, 0.6) 100%)',
  },
  fiery_action: {
    name: 'Infernal Action',
    bgFrom: 'from-slate-950',
    bgVia: 'via-orange-950/50',
    bgTo: 'to-red-950/60',
    accent: '#ea580c',
    overlayTint: 'rgba(234, 88, 12, 0.16)',
    auraGlow: 'rgba(249, 115, 22, 0.4)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 35%, rgba(124, 45, 18, 0.7) 100%)',
  },
  mystical: {
    name: 'Arcane Starlight',
    bgFrom: 'from-slate-950',
    bgVia: 'via-purple-950/50',
    bgTo: 'to-indigo-950/60',
    accent: '#a855f7',
    overlayTint: 'rgba(168, 85, 247, 0.14)',
    auraGlow: 'rgba(192, 132, 252, 0.35)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 40%, rgba(88, 28, 135, 0.55) 100%)',
  },
  whimsical: {
    name: 'Whimsical Wonder',
    bgFrom: 'from-slate-950',
    bgVia: 'via-amber-950/30',
    bgTo: 'to-pink-950/40',
    accent: '#ec4899',
    overlayTint: 'rgba(236, 72, 153, 0.1)',
    auraGlow: 'rgba(244, 114, 182, 0.3)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 45%, rgba(131, 24, 67, 0.45) 100%)',
  },
  suspenseful: {
    name: 'Shadow Mystery',
    bgFrom: 'from-slate-950',
    bgVia: 'via-zinc-900/60',
    bgTo: 'to-amber-950/30',
    accent: '#d97706',
    overlayTint: 'rgba(217, 119, 6, 0.12)',
    auraGlow: 'rgba(245, 158, 11, 0.25)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 35%, rgba(24, 24, 27, 0.75) 100%)',
  },
  romantic: {
    name: 'Starlight Romance',
    bgFrom: 'from-slate-950',
    bgVia: 'via-rose-950/40',
    bgTo: 'to-pink-950/50',
    accent: '#f43f5e',
    overlayTint: 'rgba(244, 63, 94, 0.12)',
    auraGlow: 'rgba(251, 113, 133, 0.32)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 45%, rgba(136, 19, 55, 0.5) 100%)',
  },
  neutral: {
    name: 'Deep Canvas',
    bgFrom: 'from-slate-950',
    bgVia: 'via-purple-950/30',
    bgTo: 'to-slate-900',
    accent: '#8b5cf6',
    overlayTint: 'rgba(139, 92, 246, 0.06)',
    auraGlow: 'rgba(168, 85, 247, 0.2)',
    vignetteStyle: 'radial-gradient(ellipse at center, transparent 50%, rgba(2, 6, 23, 0.7) 100%)',
  }
};

export function analyzeStorySentiment(text: string): StorySentimentAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      tone: 'neutral',
      label: 'Atmospheric Storyscape',
      score: 0,
      tensionScore: 0.2,
      energyScore: 0.3,
      dominantKeywords: [],
      palette: DEFAULT_SENTIMENT_PALETTES.neutral,
    };
  }

  const lower = text.toLowerCase();
  const matchedKeywords: string[] = [];

  // Keywords scoring categories
  const ominousWords = ['terror', 'horror', 'danger', 'deadly', 'shadows', 'monster', 'haunted', 'darkness', 'screamed', 'crept', 'evil', 'curse', 'blood', 'abyss', 'dread', 'doom', 'sinister', 'nightmare'];
  const triumphantWords = ['victory', 'triumphant', 'glorious', 'hero', 'cheered', 'won', 'shining', 'splendid', 'celebration', 'crowned', 'legendary', 'conquered', 'illumination', 'champion', 'joyful'];
  const sereneWords = ['peaceful', 'gentle', 'calm', 'quiet', 'tranquil', 'whisper', 'softly', 'breeze', 'stream', 'meadow', 'rested', 'harmony', 'serenity', 'dreaming', 'starlight'];
  const melancholicWords = ['sorrow', 'cried', 'wept', 'grief', 'alone', 'heartbroken', 'faded', 'lost', 'tears', 'mourned', 'lonely', 'ruins', 'hopeless', 'despair', 'silence'];
  const actionWords = ['exploded', 'strike', 'battle', 'blade', 'clash', 'gunshot', 'charging', 'shattered', 'fire', 'flames', 'inferno', 'combustion', 'speeding', 'chased', 'fury'];
  const mysticalWords = ['magic', 'enchanted', 'arcane', 'spell', 'rune', 'wizard', 'celestial', 'cosmic', 'portal', 'sorcery', 'glowing', 'miracle', 'prophecy', 'astral'];
  const romanticWords = ['love', 'passion', 'kiss', 'beloved', 'embraced', 'tender', 'heart', 'affection', 'fondly', 'cherished', 'devotion'];
  const whimsicalWords = ['playful', 'magical', 'chuckle', 'giggled', 'curious', 'wonder', 'fairy', 'whimsical', 'sparkle', 'delight', 'bizarre', 'bouncing'];
  const suspenseWords = ['mysterious', 'unsolved', 'clue', 'puzzle', 'strange', 'hidden', 'secret', 'investigation', 'stealth', 'eerie', 'suspect'];

  let ominousScore = 0;
  let triumphantScore = 0;
  let sereneScore = 0;
  let melancholicScore = 0;
  let actionScore = 0;
  let mysticalScore = 0;
  let romanticScore = 0;
  let whimsicalScore = 0;
  let suspenseScore = 0;

  ominousWords.forEach(w => { if (lower.includes(w)) { ominousScore += 1.5; matchedKeywords.push(w); } });
  triumphantWords.forEach(w => { if (lower.includes(w)) { triumphantScore += 1.4; matchedKeywords.push(w); } });
  sereneWords.forEach(w => { if (lower.includes(w)) { sereneScore += 1.2; matchedKeywords.push(w); } });
  melancholicWords.forEach(w => { if (lower.includes(w)) { melancholicScore += 1.3; matchedKeywords.push(w); } });
  actionWords.forEach(w => { if (lower.includes(w)) { actionScore += 1.5; matchedKeywords.push(w); } });
  mysticalWords.forEach(w => { if (lower.includes(w)) { mysticalScore += 1.3; matchedKeywords.push(w); } });
  romanticWords.forEach(w => { if (lower.includes(w)) { romanticScore += 1.4; matchedKeywords.push(w); } });
  whimsicalWords.forEach(w => { if (lower.includes(w)) { whimsicalScore += 1.2; matchedKeywords.push(w); } });
  suspenseWords.forEach(w => { if (lower.includes(w)) { suspenseScore += 1.2; matchedKeywords.push(w); } });

  // Punctuation factors
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  if (exclamationCount > 1) { actionScore += 1.0; triumphantScore += 0.5; }
  if (questionCount > 1) { suspenseScore += 1.0; }

  // Determine top sentiment
  const scoreMap: { tone: SentimentTone; label: string; scoreVal: number }[] = [
    { tone: 'fiery_action', label: 'Action & Fury', scoreVal: actionScore },
    { tone: 'ominous', label: 'Ominous Dread', scoreVal: ominousScore },
    { tone: 'triumphant', label: 'Triumphant Glory', scoreVal: triumphantScore },
    { tone: 'mystical', label: 'Arcane Wonder', scoreVal: mysticalScore },
    { tone: 'romantic', label: 'Romantic Heart', scoreVal: romanticScore },
    { tone: 'serene', label: 'Serene Tranquility', scoreVal: sereneScore },
    { tone: 'melancholic', label: 'Melancholic Sorrow', scoreVal: melancholicScore },
    { tone: 'whimsical', label: 'Whimsical Enchantment', scoreVal: whimsicalScore },
    { tone: 'suspenseful', label: 'Deep Suspense', scoreVal: suspenseScore },
  ];

  scoreMap.sort((a, b) => b.scoreVal - a.scoreVal);
  const best = scoreMap[0];

  const tone: SentimentTone = best.scoreVal >= 1.0 ? best.tone : 'neutral';
  const label: string = best.scoreVal >= 1.0 ? best.label : 'Atmospheric Storyscape';

  const valence = ((triumphantScore + sereneScore + romanticScore + whimsicalScore) - (ominousScore + melancholicScore + actionScore * 0.5)) / Math.max(1, (triumphantScore + sereneScore + romanticScore + ominousScore + melancholicScore + actionScore));
  const normalizedValence = Math.max(-1, Math.min(1, valence || 0));

  const tension = Math.min(1, (ominousScore * 0.25 + actionScore * 0.3 + suspenseScore * 0.2 + exclamationCount * 0.15));
  const energy = Math.min(1, (actionScore * 0.3 + triumphantScore * 0.25 + exclamationCount * 0.2 + 0.2));

  const palette = DEFAULT_SENTIMENT_PALETTES[tone] || DEFAULT_SENTIMENT_PALETTES.neutral;

  return {
    tone,
    label,
    score: Number(normalizedValence.toFixed(2)),
    tensionScore: Number(tension.toFixed(2)),
    energyScore: Number(energy.toFixed(2)),
    dominantKeywords: Array.from(new Set(matchedKeywords)).slice(0, 5),
    palette,
  };
}

export function analyzeStoryParagraph(text: string): Partial<VfxState> {
  if (!text) return {};

  const lower = text.toLowerCase();
  const result: Partial<VfxState> = {};

  // Sentiment Analysis
  const sentiment = analyzeStorySentiment(text);
  result.sentiment = sentiment;

  // --- 1. Tension Detection ---
  const exclamationCount = (text.match(/!/g) || []).length;
  const highTensionWords = ['exploded', 'screamed', 'blood', 'terror', 'chased', 'attacked', 'monster', 'run', 'trap', 'deadly', 'shattered', 'blade', 'gunshot', 'panicked', 'collapse'];
  const climaxWords = ['final confrontation', 'everything ended', 'ultimate battle', 'destiny', 'doomsday', 'all or nothing', 'cataclysm', 'annihilation'];
  const lowTensionWords = ['peaceful', 'quiet', 'sunlight', 'slept', 'smiled', 'gentle', 'morning', 'relaxed', 'whispered', 'calm', 'breeze'];

  if (climaxWords.some(w => lower.includes(w)) || (exclamationCount >= 3 && highTensionWords.some(w => lower.includes(w)))) {
    result.tension = 'climax';
  } else if (exclamationCount >= 2 || highTensionWords.some(w => lower.includes(w))) {
    result.tension = 'high';
  } else if (lowTensionWords.some(w => lower.includes(w))) {
    result.tension = 'low';
  } else {
    result.tension = 'medium';
  }

  // --- 2. Weather Detection ---
  if (lower.includes('rain') || lower.includes('downpour') || lower.includes('drizzle') || lower.includes('droplet')) {
    result.weather = lower.includes('thunder') || lower.includes('storm') || lower.includes('lightning') ? 'stormy' : 'rainy';
  } else if (lower.includes('snow') || lower.includes('blizzard') || lower.includes('frost') || lower.includes('ice') || lower.includes('flurry')) {
    result.weather = 'snowy';
  } else if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze') || lower.includes('obscured')) {
    result.weather = 'foggy';
  } else if (lower.includes('wind') || lower.includes('gale') || lower.includes('breeze') || lower.includes('gust')) {
    result.weather = 'windy';
  } else if (lower.includes('sunny') || lower.includes('clear sky') || lower.includes('sunshine')) {
    result.weather = 'clear';
  }

  // --- 3. Time of Day Detection ---
  if (lower.includes('midnight') || lower.includes('witching hour') || lower.includes('dead of night')) {
    result.timeOfDay = 'midnight';
  } else if (lower.includes('night') || lower.includes('stars') || lower.includes('moonlight') || lower.includes('darkness fell')) {
    result.timeOfDay = 'night';
  } else if (lower.includes('dawn') || lower.includes('sunrise') || lower.includes('morning light') || lower.includes('daybreak')) {
    result.timeOfDay = 'dawn';
  } else if (lower.includes('dusk') || lower.includes('sunset') || lower.includes('twilight') || lower.includes('golden hour')) {
    result.timeOfDay = 'dusk';
  } else if (lower.includes('noon') || lower.includes('daylight') || lower.includes('bright sun')) {
    result.timeOfDay = 'day';
  }

  // --- 4. Location Detection ---
  if (lower.includes('forest') || lower.includes('woods') || lower.includes('jungle') || lower.includes('trees') || lower.includes('canopy')) {
    result.location = 'forest';
  } else if (lower.includes('space') || lower.includes('orbit') || lower.includes('galaxy') || lower.includes('spaceship') || lower.includes('starship') || lower.includes('asteroid')) {
    result.location = 'space';
  } else if (lower.includes('underwater') || lower.includes('ocean floor') || lower.includes('submarine') || lower.includes('deep sea') || lower.includes('coral')) {
    result.location = 'underwater';
  } else if (lower.includes('desert') || lower.includes('dune') || lower.includes('oasis') || lower.includes('sandstorm')) {
    result.location = 'desert';
  } else if (lower.includes('haunted') || lower.includes('manor') || lower.includes('mansion') || lower.includes('graveyard') || lower.includes('crypt') || lower.includes('attic')) {
    result.location = 'haunted_house';
  } else if (lower.includes('office') || lower.includes('cubicle') || lower.includes('skyscraper') || lower.includes('bureaucracy')) {
    result.location = 'office';
  } else if (lower.includes('city') || lower.includes('alley') || lower.includes('street') || lower.includes('downtown')) {
    result.location = 'city';
  }

  // --- 5. Emotion Detection ---
  if (lower.includes('happy') || lower.includes('cheered') || lower.includes('laughed') || lower.includes('joy') || lower.includes('delight')) {
    result.emotion = 'happy';
  } else if (lower.includes('scared') || lower.includes('terrified') || lower.includes('horror') || lower.includes('trembled') || lower.includes('fear')) {
    result.emotion = 'scared';
  } else if (lower.includes('furious') || lower.includes('angry') || lower.includes('rage') || lower.includes('screamed in anger')) {
    result.emotion = 'angry';
  } else if (lower.includes('cried') || lower.includes('wept') || lower.includes('grief') || lower.includes('sadness') || lower.includes('heartbroken')) {
    result.emotion = 'sad';
  } else if (lower.includes('love') || lower.includes('kiss') || lower.includes('embraced') || lower.includes('passion') || lower.includes('blushed')) {
    result.emotion = 'in_love';
  } else if (lower.includes('confused') || lower.includes('puzzled') || lower.includes('baffled') || lower.includes('perplexed')) {
    result.emotion = 'confused';
  } else if (lower.includes('determined') || lower.includes('resolute') || lower.includes('vowed') || lower.includes('unwavering')) {
    result.emotion = 'determined';
  } else if (lower.includes('calm') || lower.includes('peace') || lower.includes('tranquil')) {
    result.emotion = 'calm';
  }

  // --- 6. Supernatural & Technology Detection ---
  if (lower.includes('magic') || lower.includes('spell') || lower.includes('rune') || lower.includes('potion') || lower.includes('enchanted') || lower.includes('wizard')) {
    result.supernatural = 'magic';
  } else if (lower.includes('cyber') || lower.includes('hologram') || lower.includes('implant') || lower.includes('matrix') || lower.includes('ai system') || lower.includes('mainframe')) {
    result.supernatural = 'cyberpunk';
  } else if (lower.includes('divine') || lower.includes('angel') || lower.includes('god') || lower.includes('holy light') || lower.includes('sacred')) {
    result.supernatural = 'divine';
  } else if (lower.includes('cosmic') || lower.includes('nebula') || lower.includes('starlight') || lower.includes('celestial') || lower.includes('dimension')) {
    result.supernatural = 'cosmic';
  }

  // --- 7. Story Twists Detection ---
  if (lower.includes('betrayed') || lower.includes('traitor') || lower.includes('turned against')) {
    result.activeTwist = 'betrayal';
  } else if (lower.includes('truth was revealed') || lower.includes('suddenly realized') || lower.includes('secret unveiled')) {
    result.activeTwist = 'reveal';
  } else if (lower.includes('sacrificed') || lower.includes('gave up everything')) {
    result.activeTwist = 'sacrifice';
  } else if (lower.includes('enigma') || lower.includes('mysterious voice')) {
    result.activeTwist = 'mystery';
  }

  // --- 8. Situation & Contextual Scene Effects Detection ---
  const fireKeywords = ['fire', 'flame', 'ember', 'camp', 'hearth', 'burn', 'forge', 'inferno', 'ash', 'explosion', 'battle', 'torch', 'sparks', 'blaze'];
  const flowerKeywords = ['flower', 'petal', 'blossom', 'spring', 'garden', 'sakura', 'rose', 'meadow', 'bouquet', 'flora', 'pollen', 'bloom'];
  const plantKeywords = ['forest', 'jungle', 'vine', 'leaves', 'plant', 'canopy', 'nature', 'ancient trees', 'woods', 'moss', 'bough', 'foliage'];
  const hillKeywords = ['mountain', 'hill', 'valley', 'horizon', 'landscape', 'peak', 'summit', 'ridge', 'overlook', 'plateau', 'cliff'];
  const riverKeywords = ['river', 'lake', 'stream', 'water', 'ocean', 'sea', 'shore', 'reflection', 'current', 'tide', 'waterfall', 'fountain', 'creek', 'brook', 'wave'];
  const cosmicKeywords = ['star', 'cosmic', 'space', 'galaxy', 'stardust', 'nebula', 'celestial', 'portal', 'constellation', 'supernova', 'void', 'cosmos'];

  if (fireKeywords.some(w => lower.includes(w)) || sentiment.tone === 'fiery_action') result.showFireEmbers = true;
  if (flowerKeywords.some(w => lower.includes(w)) || sentiment.tone === 'romantic' || sentiment.tone === 'whimsical') result.showFlowerPetals = true;
  if (plantKeywords.some(w => lower.includes(w))) result.showLushPlants = true;
  if (hillKeywords.some(w => lower.includes(w))) result.showHorizonHills = true;
  if (riverKeywords.some(w => lower.includes(w))) result.showRiverWater = true;
  if (cosmicKeywords.some(w => lower.includes(w)) || sentiment.tone === 'mystical') result.showCosmicDust = true;

  return result;
}
