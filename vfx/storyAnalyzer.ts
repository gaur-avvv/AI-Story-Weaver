import { VfxState, VfxTension, VfxWeather, VfxTimeOfDay, VfxLocation, VfxEmotion, VfxSupernatural, VfxTwist } from './types';

export function analyzeStoryParagraph(text: string): Partial<VfxState> {
  if (!text) return {};

  const lower = text.toLowerCase();
  const result: Partial<VfxState> = {};

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

  if (fireKeywords.some(w => lower.includes(w))) result.showFireEmbers = true;
  if (flowerKeywords.some(w => lower.includes(w))) result.showFlowerPetals = true;
  if (plantKeywords.some(w => lower.includes(w))) result.showLushPlants = true;
  if (hillKeywords.some(w => lower.includes(w))) result.showHorizonHills = true;
  if (riverKeywords.some(w => lower.includes(w))) result.showRiverWater = true;
  if (cosmicKeywords.some(w => lower.includes(w))) result.showCosmicDust = true;

  return result;
}
