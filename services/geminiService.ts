import { GoogleGenAI, Type, Modality } from '@google/genai';
import OpenAI from 'openai';
import { globalStoryGraph } from './storyGraphState';
import { StorySegment } from '../types';

// Helper to retry external API calls with exponential backoff and jitter
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000,
  backoffFactor = 2
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isMissingKey = err?.message?.includes('API key is not configured') || err?.message?.includes('missing');
      if (attempt >= maxRetries || isMissingKey) {
        throw err;
      }
      console.warn(`[API Retry] Attempt ${attempt}/${maxRetries} failed: ${err?.message || err}. Retrying in ${delay}ms...`);
      const jitter = Math.floor(Math.random() * 200);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      delay *= backoffFactor;
    }
  }
}

// Helper to safely extract and parse JSON from any AI output (handling markdown fences, reasoning tags, etc.)
export function extractJson<T = any>(rawText: string): T {
  if (!rawText) throw new Error("Empty AI response received.");
  
  let cleaned = rawText.trim();
  // Strip DeepSeek / Qwen reasoning <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Strip markdown code fences (```json ... ``` or ``` ...)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Extract from the first '{' to the last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch {}
    try {
      const sanitized = jsonSubstring
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F]+/g, " ");
      return JSON.parse(sanitized);
    } catch {}
  }

  // Extract from the first '[' to the last ']' for array responses
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonSubstring = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch {}
  }

  throw new Error(`Failed to parse valid JSON from AI response: ${cleaned.slice(0, 150)}...`);
}

// Call Puter AI Chat (100% Free, no API key required)
async function callPuterAiChat(prompt: string, systemPrompt: string, model: string = 'openai/gpt-5.4-nano'): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).puter?.ai) {
    throw new Error("Puter.js AI is not initialized. Please ensure your internet connection is active.");
  }
  const puter = (window as any).puter;
  const fullPrompt = `${systemPrompt}\n\nUser Request:\n${prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object matching the requested schema. Do not enclose in markdown explanation outside the JSON.`;
  
  const response = await puter.ai.chat(fullPrompt, { model });
  if (typeof response === 'string') return response;
  if (Array.isArray(response?.message?.content)) {
    return response.message.content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('');
  }
  if (typeof response?.message?.content === 'string') return response.message.content;
  if (response?.text) return response.text;
  if (response?.content) return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  if (response?.toString && typeof response.toString === 'function' && response.toString() !== '[object Object]') {
    return response.toString();
  }
  return JSON.stringify(response);
}

// Helper to get the correct AI client instance
const getAiClient = (apiKey?: string | null): GoogleGenAI => {
  // The app is designed to allow a user-provided API key, which takes precedence.
  // If not provided, it attempts to fall back to the environment variable.
  const keyToUse = apiKey || process.env.API_KEY || (process.env as any)?.GEMINI_API_KEY || (import.meta as any)?.env?.VITE_GEMINI_API_KEY || (import.meta as any)?.env?.GEMINI_API_KEY;
  if (!keyToUse) {
    throw new Error("API key is not configured. Please provide your Gemini API key in the settings.");
  }
  return new GoogleGenAI({ apiKey: keyToUse });
};

export function getOpenAIProviderConfig(
  provider: string,
  options?: { apiKey?: string; customBaseUrl?: string; cloudflareAccountId?: string; localEndpoint?: string; azureOpenaiEndpoint?: string }
): { baseURL: string; effectiveApiKey: string } {
  let baseURL = '';
  switch (provider) {
    case 'openai':
      baseURL = 'https://api.openai.com/v1';
      break;
    case 'anthropic':
      baseURL = options?.customBaseUrl || 'https://api.anthropic.com/v1';
      break;
    case 'deepseek':
      baseURL = 'https://api.deepseek.com/v1';
      break;
    case 'xai':
      baseURL = 'https://api.x.ai/v1';
      break;
    case 'mistral':
      baseURL = 'https://api.mistral.ai/v1';
      break;
    case 'minimax':
      baseURL = 'https://api.minimax.chat/v1';
      break;
    case 'kimi':
      baseURL = 'https://api.moonshot.cn/v1';
      break;
    case 'alibaba':
      baseURL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
      break;
    case 'together':
      baseURL = 'https://api.together.xyz/v1';
      break;
    case 'openrouter':
      baseURL = 'https://openrouter.ai/api/v1';
      break;
    case 'huggingface':
      baseURL = 'https://router.huggingface.co/novita/v1';
      break;
    case 'fireworks':
      baseURL = 'https://api.fireworks.ai/inference/v1';
      break;
    case 'zai':
    case 'z_ai':
    case 'zhipuai':
      baseURL = 'https://api.z.ai/api/paas/v4';
      break;
    case 'cohere':
      baseURL = 'https://api.cohere.com/compatibility/v1';
      break;
    case 'cerebras':
      baseURL = 'https://api.cerebras.ai/v1';
      break;
    case 'groq':
      baseURL = 'https://api.groq.com/openai/v1';
      break;
    case 'inception':
      baseURL = 'https://api.inceptionlabs.ai/v1';
      break;
    case 'nvidia':
      baseURL = 'https://integrate.api.nvidia.com/v1';
      break;
    case 'requesty':
      baseURL = 'https://router.requesty.ai/v1';
      break;
    case 'siliconflow':
      baseURL = 'https://api.siliconflow.cn/v1';
      break;
    case 'cloudflare': {
      const accountId = options?.cloudflareAccountId || 'your-account-id';
      baseURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
      break;
    }
    case 'azure_openai':
      baseURL = options?.azureOpenaiEndpoint || options?.customBaseUrl || 'https://api.openai.com/v1';
      break;
    case 'aws_bedrock':
      baseURL = options?.customBaseUrl || 'https://bedrock-runtime.us-east-1.amazonaws.com';
      break;
    case 'llamacpp':
      baseURL = options?.localEndpoint || options?.customBaseUrl || 'http://localhost:8080/v1';
      break;
    case 'ollama':
      baseURL = options?.localEndpoint || options?.customBaseUrl || 'http://localhost:11434/v1';
      break;
    case 'lmstudio':
      baseURL = options?.localEndpoint || options?.customBaseUrl || 'http://localhost:1234/v1';
      break;
    case 'jan':
      baseURL = options?.localEndpoint || options?.customBaseUrl || 'http://localhost:1337/v1';
      break;
    case 'vllm':
      baseURL = options?.localEndpoint || options?.customBaseUrl || 'http://localhost:8000/v1';
      break;
    case 'sglang':
      baseURL = options?.localEndpoint || options?.customBaseUrl || 'http://localhost:30000/v1';
      break;
    case 'localai':
      baseURL = options?.localEndpoint || options?.customBaseUrl || 'http://localhost:8080/v1';
      break;
    case 'gpt4all':
      baseURL = options?.localEndpoint || options?.customBaseUrl || 'http://localhost:4891/v1';
      break;
    case 'local_openai_proxy':
      baseURL = options?.localEndpoint || options?.customBaseUrl || 'http://localhost:5000/v1';
      break;
    case 'pollinations':
      baseURL = 'https://gen.pollinations.ai/v1';
      break;
    case 'webgpu':
      baseURL = 'http://localhost:0/webgpu';
      break;
    case 'others':
    default:
      baseURL = options?.customBaseUrl?.trim() || options?.localEndpoint?.trim() || 'https://api.openai.com/v1';
      break;
  }

  const rawKey = options?.apiKey ? options.apiKey.replace(/^Bearer\s+/i, '').trim() : '';
  const isLocalOrFree = [
    'pollinations', 'llamacpp', 'ollama', 'lmstudio', 'jan', 'vllm', 'sglang', 'localai', 'gpt4all', 'local_openai_proxy', 'webgpu'
  ].includes(provider);
  const effectiveApiKey = rawKey || (isLocalOrFree ? 'local-or-anonymous' : '');
  return { baseURL, effectiveApiKey };
}

const getOpenAIClient = (apiKey: string, baseURL: string): OpenAI => {
  return new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });
};


const storySchema = {
// ... (keep existing storySchema)
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'The title of the story.',
    },
    paragraphs: {
      type: Type.ARRAY,
      description: 'The paragraphs of the story.',
      items: { type: Type.STRING },
    },
  },
  required: ['title', 'paragraphs'],
};

export const getGenreNarrativeDirective = (genre?: string): string => {
  switch (genre?.toLowerCase()) {
    case 'fantasy':
      return `GENRE DIRECTIVE - HIGH FANTASY & MYTHIC WONDER:
- Worldbuilding: Integrate magical lore, ancient relics, glowing auras, enchanted flora/fauna, and mythical kingdoms.
- Narrative Atmosphere: Majestic, wondrous, and heroic with epic stakes and supernatural mystery.
- Sensory Nuance: Crackling arcane energy, ancient parchment scent, shimmering starlight, echoes of celestial chants.
- Dynamic Choices: Offer distinct paths (e.g., daring magical intervention, ancient diplomatic negotiation, stealthy arcane exploration).`;
    case 'dark_fantasy':
      return `GENRE DIRECTIVE - DARK FANTASY & GRIMDARK:
- Worldbuilding: Forsaken kingdoms, blood-soaked runes, cursed lineages, morally grey factions, and decaying arcane monoliths.
- Narrative Atmosphere: Grim, atmospheric, perilous, and visceral.
- Sensory Nuance: Iron tang of blood, cold freezing rain, guttering torches, whispering shadows in ancient stone.
- Dynamic Choices: Make a costly blood sacrifice, forge a pact with a shadowy entity, rely on brutal martial instinct.`;
    case 'sci-fi':
      return `GENRE DIRECTIVE - SPECULATIVE SCIENCE FICTION:
- Worldbuilding: Cybernetic architecture, quantum anomalies, futuristic starcraft, synthetic intelligence, neon telemetry, and deep-space vistas.
- Narrative Atmosphere: Cerebral, suspenseful, forward-looking, existential exploration.
- Sensory Nuance: Whirring servo-drives, cold metallic surfaces, glowing holographic HUDs, zero-G vertigo.
- Dynamic Choices: Hack complex security protocols, calibrate experimental quantum drives, initiate contact with unknown entities.`;
    case 'cyberpunk':
      return `GENRE DIRECTIVE - CYBERPUNK & DYSTOPIAN HIGH-TECH:
- Worldbuilding: Megacorporation monoliths, neon-drenched rainy alleys, underground netrunner dens, black-market cyberware, synth-smog skies.
- Narrative Atmosphere: Gritty, electric, rebellious, high-tech and low-life.
- Sensory Nuance: Sizzle of faulty neon tubes, ozone smell of overclocked neural jacks, rain on synthetic leather, bass rumble of flying hovers.
- Dynamic Choices: Jack directly into the corporate subnet, overclock sub-dermal reflex boosters, call in a shady underworld favor.`;
    case 'space_opera':
      return `GENRE DIRECTIVE - INTERSTELLAR SPACE OPERA:
- Worldbuilding: Galactic empires, ancient stellar dreadnoughts, alien embassies, hyperspace gates, asteroid belt outposts.
- Narrative Atmosphere: Vast, sweeping, epic, galactic-scale intrigue.
- Sensory Nuance: Silent hum of ion thrusters, dazzling nebular colors, starlight refracting on blast shields, grand bridge alarms.
- Dynamic Choices: Command a tactical warp maneuver, appeal to the Intergalactic Council, engage pirate boarding craft.`;
    case 'steampunk':
      return `GENRE DIRECTIVE - STEAMPUNK & CLOCKWORK ADVENTURE:
- Worldbuilding: Brass airships, Victorian skylines, whirring clockwork automatons, steam-powered locomotives, copper goggles.
- Narrative Atmosphere: Whimsical yet gritty ingenuity, exploratory romanticism, industrial revolution marvels.
- Sensory Nuance: Hiss of pressurized steam, rhythmic ticking of brass gears, pungent coal smoke, polished mahogany.
- Dynamic Choices: Over-pressurize the steam turbine, pick a complex mechanical lock with clockwork tools, challenge an eccentric inventor.`;
    case 'mystery':
    case 'crime':
      return `GENRE DIRECTIVE - ATMOSPHERIC MYSTERY / NOIR DETECTIVE:
- Worldbuilding: Rain-slicked cobblestones, dimly lit offices, cryptic cyphers, hidden agendas, and unexpected motives.
- Narrative Atmosphere: Tense, analytical, deductive, moody, with psychological intrigue.
- Sensory Nuance: Scent of wet asphalt and espresso, ticking pocket watches, flickering neon streetlights, hurried footsteps behind.
- Dynamic Choices: Interrogate an evasive witness, dust for hidden physical evidence, follow a mysterious shadow into the fog.`;
    case 'horror':
      return `GENRE DIRECTIVE - GOTHIC & PSYCHOLOGICAL HORROR:
- Worldbuilding: Claustrophobic corridors, unearthly whispers, uncanny shifting shadows, cursed relics, and cosmic dread.
- Narrative Atmosphere: Visceral suspense, creeping tension, heart-pounding psychological dread.
- Sensory Nuance: Freezing sudden drafts, distant creaking floorboards, scratch behind wallpaper, frantic ragged breaths.
- Dynamic Choices: Inspect the ominous locked door, fortify the fading candlelight, flee into the mist-covered labyrinth.`;
    case 'cosmic_horror':
      return `GENRE DIRECTIVE - LOVECRAFTIAN & COSMIC HORROR:
- Worldbuilding: Non-Euclidean monoliths, sunken abyssal ruins, forbidden grimoires, incomprehensible alien deities, stars falling out of alignment.
- Narrative Atmosphere: Unfathomable dread, philosophical insignificance, madness at the brink of truth.
- Sensory Nuance: Scent of ancient sea-brine, eerie vibrating low-frequency hums, impossible geometric angles, chilling eldritch whispers.
- Dynamic Choices: Decipher the maddening celestial cypher, shield your mind with ancient wards, escape before the abyss notices.`;
    case 'thriller':
      return `GENRE DIRECTIVE - HIGH-OCTANE SUSPENSE THRILLER:
- Worldbuilding: Relentless countdowns, high-stakes surveillance, dangerous conspiracies, urban rooftops, and razor-edge escapes.
- Narrative Atmosphere: Fast-paced, adrenaline-fueled, breathless urgency.
- Sensory Nuance: Thumping heartbeat, screeching tires, flashing sirens in rearview mirrors, cold adrenaline rush.
- Dynamic Choices: Pull off a high-risk stunt, trigger an emergency counter-measure, slip through an underground conduit.`;
    case 'romance':
      return `GENRE DIRECTIVE - POETIC ROMANCE & EMOTIONAL DEPTH:
- Worldbuilding: Intimate sanctuaries, golden hour twilight, candlelit rooms, picturesque European cafes, shared memories.
- Narrative Atmosphere: Heartfelt, tender, emotionally vulnerable, deeply romantic.
- Sensory Nuance: Lingering gazes, warmth of a gentle touch, soft laughter in the breeze, sweet aroma of blooming jasmine.
- Dynamic Choices: Confess a long-hidden vulnerability, extend an empathetic olive branch, take a passionate leap of faith.`;
    case 'adventure':
    case 'superhero':
      return `GENRE DIRECTIVE - HEROIC ADVENTURE & EPIC SAGA:
- Worldbuilding: Uncharted jungle ruins, roaring waterfalls, soaring skyscraper summits, ancient booby traps, superheroic showdowns.
- Narrative Atmosphere: Exhilarating, bold, courageous, dynamic.
- Sensory Nuance: Wind howling past, sparkling golden artifacts, crackling sonic booms, adrenaline surge.
- Dynamic Choices: Leap across a crumbling chasm, unleash a tactical power surge, outsmart the adversary with quick wit.`;
    case 'fairy_tale':
    case 'fable':
      return `GENRE DIRECTIVE - FAIRY TALE & FOLKLORIC CHARM:
- Worldbuilding: Talking animals, enchanted gingerbread cottages, benevolent sprites, glistening crystal ponds, magical forests.
- Narrative Atmosphere: Lyrical, enchanting, charming, with timeless moral warmth.
- Sensory Nuance: Twinkling fairy dust, fresh honey aroma, soft morning dew, melodious birdsong.
- Dynamic Choices: Share a crust of bread with a woodland creature, cast a wish into the wishing well, follow the glowing butterflies.`;
    case 'mythological':
      return `GENRE DIRECTIVE - ANCIENT MYTHOLOGY & LEGENDS:
- Worldbuilding: Mount Olympus summits, Norse Yggdrasil realms, divine ambrosia, sacred temples, mythical monsters and heroic trials.
- Narrative Atmosphere: Timeless grandeur, epic destiny, fate vs. hubris, divine awe.
- Sensory Nuance: Scent of burning frankincense and laurel, crackling lightning bolts, golden chariot dust, thunderous godly voices.
- Dynamic Choices: Invoke a divine patron deity, accept a perilous heroic trial, confront the mythical beast with sacred artifacts.`;
    case 'time_travel':
      return `GENRE DIRECTIVE - TIME TRAVEL & TEMPORAL ANOMALIES:
- Worldbuilding: Chrono-displacement pods, shifting timelines, ticking pocket watches, paradox rifts, glimpses of forgotten centuries.
- Narrative Atmosphere: Mind-bending, intellectually thrilling, urgent, fascinatingly complex.
- Sensory Nuance: Echoing clock chimes, reverse-falling dust motes, strange temporal deja-vu, shimmering chrono-waves.
- Dynamic Choices: Jump 100 years into the future, alter a critical historical anchor event, stabilize the fracturing timeline.`;
    case 'post_apocalyptic':
      return `GENRE DIRECTIVE - POST-APOCALYPTIC SURVIVAL & WASTELAND:
- Worldbuilding: Overgrown ruined metropolises, scavenged scrap technology, dust storms, nomadic convoys, safe-haven settlements.
- Narrative Atmosphere: Raw, gritty, resourceful, resolute survival hope against all odds.
- Sensory Nuance: Gritty sand in the teeth, howling dry desert wind, sputter of a makeshift engine, pure freshwater discovery.
- Dynamic Choices: Barter vital fuel with a nomadic convoy, scout a dangerous radioactive ruin, fortify the settlement perimeter.`;
    case 'urban_fantasy':
      return `GENRE DIRECTIVE - URBAN FANTASY & HIDDEN MAGIC:
- Worldbuilding: Hidden magical speakeasies beneath subway tracks, modern-day sorcerers in leather jackets, gargoyles perched on skyscrapers.
- Narrative Atmosphere: Stylish, fast-paced, mystical intrigue embedded in contemporary city life.
- Sensory Nuance: Neon reflections in rain puddles, scent of spellcraft sulfur mixing with street food, vibrating magical ley lines.
- Dynamic Choices: Cast a cloaked enchantment in the subway, consult a rogue alchemist in Chinatown, track an elusive fey fugitive.`;
    case 'western':
      return `GENRE DIRECTIVE - WILD WEST & FRONTIER GRIT:
- Worldbuilding: Dusty frontier boomtowns, sun-bleached canyons, creaking saloon swing doors, steam locomotives, tumbleweed plains.
- Narrative Atmosphere: High-noon tension, rugged independence, moral showdowns, expansive frontier horizons.
- Sensory Nuance: Scent of gunpowder and dry leather, spurs clinking on wooden boardwalks, blazing midday desert heat.
- Dynamic Choices: Call out the outlaw in a dramatic quick-draw standoff, ride hard through the canyon pass, negotiate at the saloon.`;
    case 'historical':
      return `GENRE DIRECTIVE - HISTORICAL FICTION & HERITAGE:
- Worldbuilding: Renaissance courts, ancient silk road caravans, cobblestone alleyways, royal palaces, authentic period details.
- Narrative Atmosphere: Immersive, authentic, richly textured, and culturally resonant.
- Sensory Nuance: Candle wax drips, rustle of heavy brocade velvet, horse hooves on stone, quill scratching on parchment.
- Dynamic Choices: Deliver a sealed royal dispatch, navigate courtly espionage, lead an expedition through historic trade routes.`;
    case 'drama':
      return `GENRE DIRECTIVE - HUMAN DRAMA & CHARACTER DEPTH:
- Worldbuilding: Lived-in authentic settings, family homes, bustling workplaces, emotional crossroads, meaningful relationships.
- Narrative Atmosphere: Poignant, profound, emotionally captivating, empathetic.
- Sensory Nuance: Subtle facial micro-expressions, shared silence between old friends, poignant rainfall against window glass.
- Dynamic Choices: Confront a painful unresolved past, make an empathetic personal sacrifice, forge a new beginning.`;
    case 'comedy':
    case 'funny':
      return `GENRE DIRECTIVE - COMEDIC & WITTY:
- Worldbuilding: Zany situations, eccentric personalities, hilarious misunderstandings, slapstick inventions, witty banter.
- Narrative Atmosphere: Lighthearted, upbeat, laugh-out-loud, vibrant.
- Sensory Nuance: Absurd sound effects, comical scrambles, bubbling potions, cartoonish expressions.
- Dynamic Choices: Attempt an outrageous bluff, activate a ridiculous gadget, deliver a sarcastic one-liner.`;
    case 'bedtime':
      return `GENRE DIRECTIVE - SOOTHING BEDTIME JOURNEY:
- Worldbuilding: Pillow-soft clouds, gentle crescent moon, tranquil lullaby rivers, starry night blankets.
- Narrative Atmosphere: Velvety, peaceful, reassuring, calming, rhythmic.
- Sensory Nuance: Deep slow breaths, soft velvet warmth, soothing twilight hum, twinkling sleepy stars.
- Dynamic Choices: Drift smoothly across a starry river, nestle into a cozy cloud hammock, whisper goodnight to the forest.`;
    default:
      return `GENRE DIRECTIVE - IMMERSIVE NARRATIVE STORY:
- Worldbuilding: Rich atmospheric texture, authentic internal logic, compelling stakes, memorable characters.
- Narrative Atmosphere: Engaging, dynamic, emotionally captivating.
- Sensory Nuance: Multi-sensory sights, sounds, textures, and aromas.
- Dynamic Choices: Provide 3 distinct narrative paths representing courage, intellect, and empathy.`;
  }
};

export const getTargetAudienceDirective = (audience?: string): string => {
  switch (audience?.toLowerCase()) {
    case 'early_reader':
      return `TARGET AUDIENCE DIRECTIVE: EARLY READERS & TODDLERS (Ages 2-5)
- Vocabulary: Ultra-simple, soothing, highly rhythmic, repetitive sound words (e.g. tap-tap, sparkle-twinkle, zoom-zoom).
- Themes: Gentle curiosity, bedtime safety, friendly animals, bright colors, comforting reassurance.
- Pacing: Very gentle and cheerful. Zero fear, zero peril, 100% warm love and delight.`;
    case 'children':
      return `TARGET AUDIENCE DIRECTIVE: CHILDREN (Ages 6-9)
- Vocabulary: Accessible, colorful, imaginative, rhythmic, with playful similes and lively sounds.
- Themes: Kindness, curiosity, friendship, bravery, wonder, and mutual help.
- Pacing: Upbeat, reassuring, and clear. Avoid graphic violence, gore, or trauma. Conflicts are solved with heart and cleverness.`;
    case 'middle_grade':
      return `TARGET AUDIENCE DIRECTIVE: MIDDLE GRADE (Ages 10-12)
- Vocabulary: Adventurous, smart, engaging, full of fun banter, mysteries, and vivid world exploration.
- Themes: Teamwork, friendship loyalty, school/secret discoveries, growing confidence, solving puzzling challenges.
- Pacing: Fast-paced, high adventure, thrilling discoveries without mature adult themes.`;
    case 'teen':
    case 'young_adult':
      return `TARGET AUDIENCE DIRECTIVE: YOUNG ADULT & TEENS (Ages 13-18)
- Vocabulary: Dynamic, witty, emotionally authentic, fast-paced, and relatable.
- Themes: Identity, belonging, independence, moral dilemmas, loyalties, romance, and courage.
- Pacing: Snappy dialogue, sharp dramatic turns, and personal stakes where every decision has meaningful weight.`;
    case 'adult':
      return `TARGET AUDIENCE DIRECTIVE: ADULT LITERARY & DRAMATIC
- Vocabulary: Sophisticated, literary, evocative, nuanced, and psychologically rich.
- Themes: Complex moral ambiguities, deep character motives, existential depth, and layered relationships.
- Pacing: Deliberate dramatic tension, poetic sensory realism, rich subtext, and authentic consequences.`;
    case 'mature_dark':
      return `TARGET AUDIENCE DIRECTIVE: MATURE DARK FICTION (Ages 18+)
- Vocabulary: Uncompromising, visceral, psychologically intricate, atmospheric, and razor-sharp.
- Themes: High-stakes psychological tension, dark existential dread, complex moral survival, raw emotional truth.
- Pacing: Unflinching, suspenseful, deep atmospheric immersion.`;
    default:
      return `TARGET AUDIENCE DIRECTIVE: UNIVERSAL FAMILY
- Engaging, accessible, beautifully balanced prose with universal emotional resonance.`;
  }
};

export const getToneVocabularyDirective = (tone?: string, genre?: string, sceneContext?: string): string => {
  const normalizedTone = (tone || '').toLowerCase();
  const normalizedGenre = (genre || '').toLowerCase();

  let activeTone = normalizedTone;
  if (!activeTone || activeTone === 'balanced') {
    if (normalizedGenre.includes('cyberpunk') || normalizedGenre.includes('sci-fi') || normalizedGenre.includes('space')) {
      activeTone = 'sci_fi_clean';
    } else if (normalizedGenre.includes('fantasy') || normalizedGenre.includes('historical') || normalizedGenre.includes('mytholog') || normalizedGenre.includes('steampunk')) {
      activeTone = 'fantasy_accessible';
    } else if (normalizedGenre.includes('mystery') || normalizedGenre.includes('crime') || normalizedGenre.includes('western')) {
      activeTone = 'mystery_detective';
    } else if (normalizedGenre.includes('horror') || normalizedGenre.includes('dark_fantasy') || normalizedGenre.includes('cosmic')) {
      activeTone = 'spooky_suspense';
    } else if (normalizedGenre.includes('fairy') || normalizedGenre.includes('fable') || normalizedGenre.includes('funny') || normalizedGenre.includes('comedy')) {
      activeTone = 'playful_fun';
    } else if (normalizedGenre.includes('thriller') || normalizedGenre.includes('adventure') || normalizedGenre.includes('superhero') || normalizedGenre.includes('time_travel') || normalizedGenre.includes('post_apocalyptic')) {
      activeTone = 'exciting_action';
    } else if (normalizedGenre.includes('romance') || normalizedGenre.includes('drama')) {
      activeTone = 'warm_heartfelt';
    } else if (normalizedGenre.includes('bedtime') || normalizedGenre.includes('early_reader')) {
      activeTone = 'cozy_gentle';
    } else {
      activeTone = 'balanced';
    }
  }

  return `LANGUAGE & VOCABULARY MANDATE (SIMPLE & ACCESSIBLE):
- Everyday Words: Use clear, simple, and natural words that people use in everyday life so that anyone can easily read and understand the story.
- Strictly Ban Hard Jargon: Do NOT use difficult, obscure, high-level, pretentious, or archaic vocabulary (e.g. do NOT use words like "phosphorescent", "encroaching", "concussive", "precipice", "ineffable", "eldritch", "non-Euclidean", "tapestry of consciousness").
- Natural Sentence Flow: Keep sentences smooth, lively, and easy to read aloud.
- Emotional Punch with Simple Words: Express excitement, danger, wonder, humor, and heart through clear actions, expressive dialogue, and relatable sensory details.`;
};

const getLengthDescription = (length: 'very_short' | 'short' | 'medium' | 'long' | 'very_long'): string => {
  switch (length) {
    case 'very_short':
      return 'between 1 and 2';
    case 'short':
      return 'between 3 and 4';
    case 'medium':
      return 'between 5 and 6';
    case 'long':
      return 'between 7 and 8';
    case 'very_long':
      return 'between 9 and 12';
    default:
      return 'between 5 and 6';
  }
};

export function buildSceneImagePrompt(
  paragraph: string,
  imageStyle: string = 'whimsical',
  genre?: string,
  targetAudience?: string,
  aspectRatio: string = '16:9'
): string {
  // Clean quotes, dialogues, and formatting to distill the core visual scene
  const cleanedScene = paragraph
    .replace(/["“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const styleVisuals = getImageStylePrompt(imageStyle);
  const genreVisuals = getGenreThemeVisuals(genre);
  const audienceVisuals = getAudienceVisuals(targetAudience);

  return `Masterpiece digital storybook illustration with ultra-sharp focus and crystal clear fine details.
SCENE CONTEXT & STORY ACTION: "${cleanedScene.slice(0, 420)}"
VISUAL SUBJECTS & NARRATIVE FOCUS: Faithfully depict the exact characters, specific actions, creatures, emotional expressions, garments, and environmental surroundings described directly in the paragraph above.
ART STYLE: ${styleVisuals}. Strictly preserve this chosen artistic medium and visual grammar across all elements.
GENRE & MOOD: ${genreVisuals} (${(genre || 'fantasy').toUpperCase()}).
TARGET AUDIENCE: ${audienceVisuals}.
COMPOSITION & FRAMING: Framed in ${aspectRatio} aspect ratio composition, top-aligned subject framing with comfortable headroom (character faces and upper bodies clearly visible and never cropped), dynamic foreground, atmospheric midground, and richly detailed background depth.
QUALITY & FIDELITY: 8k resolution, razor-sharp outlines, pristine micro-textures, raytraced volumetric lighting, vibrant harmonious colors, professional studio concept art standard.
NEGATIVE PROMPT / CONSTRAINTS: blurry, out of focus, low resolution, noisy, muddy colors, deformed anatomy, extra limbs, cropped heads, distorted faces, text, words, letters, subtitles, watermarks, signatures, logos, frames, split screens.`;
}


export const generateStory = async (
  prompt: string,
  language: string,
  apiKey: string | null, // This is the Gemini API Key
  genre: string,
  length: 'very_short' | 'short' | 'medium' | 'long' | 'very_long',
  model: string = 'gemini-2.5-flash',
  provider: string = 'gemini',
  otherApiKey?: string, // For non-Gemini providers
  targetAudience: string = 'children',
  options?: { customBaseUrl?: string; cloudflareAccountId?: string; tone?: string }
): Promise<{ title: string; paragraphs: string[]; tone?: string }> => {
  
  const lengthDescription = getLengthDescription(length);
  const genreDirective = getGenreNarrativeDirective(genre);
  const audienceDirective = getTargetAudienceDirective(targetAudience);
  const toneDirective = getToneVocabularyDirective(options?.tone, genre, prompt);

  const systemInstruction = `You are a master literary storyteller. Write a captivating, immersive story strictly aligned with the specified genre aesthetics, tone vocabulary, and target audience sensibilities.
Language: ${language}

${genreDirective}

${audienceDirective}

${toneDirective}

Story Structure & Depth:
- Formulate a creative, memorable story title.
- Deliver exactly ${lengthDescription} distinct, connected narrative paragraphs that build a complete, satisfying story arc.
- Infuse the prose with dynamic sensory details, authentic character expressions, and situational pacing tailored to the vocabulary guidelines.

Output Format:
Return ONLY a valid JSON object matching this schema:
{
  "title": "Story Title",
  "paragraphs": ["Paragraph 1...", "Paragraph 2...", ...]
}`;

  return withRetry(async () => {
    if (provider === 'gemini') {
      try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
          model: model,
          contents: `The story should be about: "${prompt}"`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: storySchema,
            temperature: 1.05,
          },
        });
        const responseText = response.text;
        if (!responseText) {
          throw new Error("The AI model returned an empty response.");
        }
        return extractJson(responseText);
      } catch (geminiErr: any) {
        console.warn("Gemini story generation failed, falling back to zero-key Puter/Pollinations tier:", geminiErr);
        // Seamless fallback to free tier if Gemini quota exceeded or key missing
        try {
          const raw = await callPuterAiChat(`The story should be about: "${prompt}"`, systemInstruction, 'openai/gpt-5.4-nano');
          return extractJson(raw);
        } catch {
          const { baseURL } = getOpenAIProviderConfig('pollinations');
          const openai = getOpenAIClient('dummy', baseURL);
          const completion = await openai.chat.completions.create({
            model: 'openai',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: `The story should be about: "${prompt}". Return ONLY valid JSON.` }
            ],
            temperature: 1.05,
            response_format: { type: 'json_object' },
          });
          const content = completion.choices[0]?.message?.content;
          if (content) return extractJson(content);
          throw geminiErr;
        }
      }
    } else if (provider === 'puter') {
      // Puter.js 100% Free AI
      const raw = await callPuterAiChat(`The story should be about: "${prompt}"`, systemInstruction, model || 'openai/gpt-5.4-nano');
      return extractJson(raw);
    } else {
      // OpenAI Compatible Providers (Groq, OpenRouter, Z.AI, Cerebras, Mistral, Cohere, NVIDIA, Requesty, Hugging Face, Cloudflare, SiliconFlow, Pollinations, OpenAI, Others)
      if (!otherApiKey && provider !== 'pollinations') {
        // Fall back to zero-cost Puter / Pollinations free engine automatically
        try {
          const raw = await callPuterAiChat(`The story should be about: "${prompt}"`, systemInstruction, 'openai/gpt-5.4-nano');
          return extractJson(raw);
        } catch {
          const { baseURL } = getOpenAIProviderConfig('pollinations');
          const openai = getOpenAIClient('dummy', baseURL);
          const completion = await openai.chat.completions.create({
            model: 'openai',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: `The story should be about: "${prompt}". Return ONLY valid JSON.` }
            ],
            temperature: 1.05,
            response_format: { type: 'json_object' },
          });
          const content = completion.choices[0]?.message?.content;
          if (content) return extractJson(content);
          throw new Error(`API Key for ${provider} is missing. Please provide it in Settings.`);
        }
      }

      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
        apiKey: otherApiKey,
        customBaseUrl: options?.customBaseUrl,
        cloudflareAccountId: options?.cloudflareAccountId,
      });

      const openai = getOpenAIClient(effectiveApiKey, baseURL);

      try {
        const completion = await openai.chat.completions.create({
          model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `The story should be about: "${prompt}". Return ONLY valid JSON.` }
          ],
          temperature: 1.05,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content returned from AI');
        
        return extractJson(content);
      } catch (error: any) {
        console.warn(`${provider} generation failed, attempting free tier fallback:`, error);
        try {
          const raw = await callPuterAiChat(`The story should be about: "${prompt}"`, systemInstruction, 'openai/gpt-5.4-nano');
          return extractJson(raw);
        } catch {
          throw new Error(`${provider} generation failed: ${error.message}`);
        }
      }
    }
  });
};

const segmentSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    paragraph: { type: "string" },
    choices: {
      type: "array",
      items: { type: "string" }
    },
    tone: { type: "string", description: "The specific literary tone and vocabulary style used in this segment." },
    sentiment: { type: "string", description: "The primary emotional sentiment of the scene (e.g. suspense, triumph, wonder, dread, tender, exciting, playful, serene)." }
  },
  required: ["paragraph"]
};

export const generateStorySegment = async (
  prompt: string,
  previousParagraphs: string[],
  language: string,
  apiKey: string | null,
  genre: string,
  model: string = 'gemini-2.5-flash',
  provider: string = 'gemini',
  otherApiKey?: string,
  targetAudience: string = 'children',
  isLastSegment: boolean = false,
  isFirstSegment: boolean = false,
  graphContext?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string; tone?: string } | string,
  explicitTone?: string
): Promise<{ title?: string; paragraph: string; choices?: string[]; tone?: string; sentiment?: string }> => {
  const optionsObj = typeof options === 'object' && options !== null ? options : {};
  const effectiveTone = explicitTone || optionsObj.tone || (typeof options === 'string' ? options : undefined);

  const genreDirective = getGenreNarrativeDirective(genre);
  const audienceDirective = getTargetAudienceDirective(targetAudience);
  const toneDirective = getToneVocabularyDirective(effectiveTone, genre, prompt + ' ' + (previousParagraphs.slice(-1)[0] || ''));

  const effectiveGraphContext = graphContext || globalStoryGraph.getLoreContextForPrompt();
  const lorePrompt = effectiveGraphContext ? `\nKnowledge Graph & Character Emotional Trends Context (Maintain strict continuity with these entities, relationship connections, and character emotional arcs):\n${effectiveGraphContext}\n` : '';
  const inconsistencyAudit = globalStoryGraph.getInconsistencyAudit();
  const inconsistencyPrompt = inconsistencyAudit 
    ? `\nPotential Plot Inconsistencies & Continuity Audit (Query from Global Story Graph - DO NOT contradict these established facts):\n${inconsistencyAudit}\n`
    : '';

  const systemInstruction = `You are a master interactive storyteller writing a dynamic, emotionally resonant story.
Language: ${language}

${genreDirective}

${audienceDirective}

${toneDirective}
${lorePrompt}
${inconsistencyPrompt}

Instructions:
${isFirstSegment ? 'This is the start of the story. You must provide an evocative, memorable "title" for the story.' : 'This is a continuation of the story. Do NOT provide a title.'}
- Write exactly ONE new, high-immersion narrative paragraph that dramatically advances the scene based on the user\'s prompt or choice.
- Strictly adapt your vocabulary, phrasing, and syntax according to the Tonal & Vocabulary Directive above (e.g., formal/archaic for fantasy/lore, clinical/sharp for cyberpunk/sci-fi, gritty/noir for mystery, visceral/gothic for horror).
- Infuse the scene with vivid sensory atmosphere, authentic dialogue/reactions, and character emotional stakes.
${isLastSegment ? '- This is the final paragraph. Bring the story to a satisfying, emotionally resonant conclusion. Do NOT provide choices.' : '- Provide exactly THREE distinct, proactive narrative choices for what happens next in the "choices" array. Each choice MUST represent a distinct strategic mindset (e.g. one bold/risky action, one clever/observant move, one empathetic/diplomatic choice).'}

Output Format:
Return ONLY a valid JSON object:
{
  ${isFirstSegment ? '"title": "Story Title",' : ''}
  "paragraph": "The new narrative paragraph...",
  ${!isLastSegment ? '"choices": ["Choice 1 (Bold action)...", "Choice 2 (Clever deduction)...", "Choice 3 (Empathetic/Cautious)..."],' : ''}
  "tone": "archaic_lyrical | clinical_cyber | gritty_noir | visceral_gothic | whimsical_playful | suspenseful_urgent | tender_romantic | etc",
  "sentiment": "suspense | triumph | dread | tender | clinical | playful | calm | excitement"
}`;

  const historyContext = previousParagraphs.length > 0 
    ? `\n\nPrevious story so far:\n${previousParagraphs.join('\n\n')}\n\nContinue the story based on the user's choice: `
    : `\n\nThe story should be about: `;

  const fullPrompt = `${historyContext}"${prompt}"`;

  return withRetry(async () => {
    if (provider === 'gemini') {
      try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
          model: model,
          contents: fullPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: segmentSchema as any,
            temperature: 1.05,
          },
        });
        const responseText = response.text;
        if (!responseText) {
          throw new Error("The AI model returned an empty response.");
        }
        return extractJson(responseText);
      } catch (geminiErr: any) {
        console.warn("[Auto-Recovery] Gemini segment generation encountered rate-limit or quota error, cascading to free zero-key tier:", geminiErr?.message || geminiErr);
        
        // Tier 2: In-browser free Puter.js chat
        try {
          const raw = await callPuterAiChat(fullPrompt, systemInstruction, 'openai/gpt-5.4-nano');
          if (raw) return extractJson(raw);
        } catch (puterErr) {
          console.warn("[Auto-Recovery] Puter AI fallback failed, trying Pollinations tier:", puterErr);
        }

        // Tier 3: Zero-cost Pollinations OpenAI-compatible chat endpoint
        try {
          const { baseURL } = getOpenAIProviderConfig('pollinations');
          const openai = getOpenAIClient('dummy', baseURL);
          const completion = await openai.chat.completions.create({
            model: 'openai',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: `${fullPrompt}. Return ONLY valid JSON matching the schema with "paragraph" and optional "title", "choices", "tone", "sentiment".` }
            ],
            temperature: 1.05,
            response_format: { type: 'json_object' },
          });
          const content = completion.choices[0]?.message?.content;
          if (content) return extractJson(content);
        } catch (pollinationsErr) {
          console.warn("[Auto-Recovery] Pollinations AI fallback failed:", pollinationsErr);
        }

        // If even free tiers fail, throw a friendly explanation
        throw geminiErr;
      }
    } else if (provider === 'puter') {
      const raw = await callPuterAiChat(fullPrompt, systemInstruction, model || 'openai/gpt-5.4-nano');
      return extractJson(raw);
    } else {
      // OpenAI Compatible Providers
      if (!otherApiKey && provider !== 'pollinations') {
        try {
          const raw = await callPuterAiChat(fullPrompt, systemInstruction, 'openai/gpt-5.4-nano');
          return extractJson(raw);
        } catch {
          throw new Error(`API Key for ${provider} is missing. Please provide it in Settings.`);
        }
      }

      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
        apiKey: otherApiKey,
        customBaseUrl: optionsObj.customBaseUrl,
        cloudflareAccountId: optionsObj.cloudflareAccountId,
      });

      const openai = getOpenAIClient(effectiveApiKey, baseURL);

      try {
        const completion = await openai.chat.completions.create({
          model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `${fullPrompt}. Return ONLY valid JSON matching the requested structure.` }
          ],
          temperature: 1.05,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content returned from AI');
        
        return extractJson(content);
      } catch (error: any) {
        console.warn(`${provider} segment generation failed, falling back to zero-key tier:`, error);
        try {
          const raw = await callPuterAiChat(fullPrompt, systemInstruction, 'openai/gpt-5.4-nano');
          return extractJson(raw);
        } catch {
          throw new Error(`${provider} generation failed: ${error.message}`);
        }
      }
    }
  });
};

const chapterResponseSchema = {
  type: "object",
  properties: {
    chapterTitle: { 
      type: "string", 
      description: "The title or subtitle of this chapter (e.g. 'Chapter 2: The Lost Temple')." 
    },
    paragraphs: {
      type: "array",
      items: { type: "string" },
      description: "The sequence of paragraphs advancing the chapter according to the requested length."
    },
    choices: {
      type: "array",
      items: { type: "string" },
      description: "Three exciting narrative choices for what can happen next."
    },
    tone: { type: "string" }
  },
  required: ["chapterTitle", "paragraphs"]
};

export const generateNextChapter = async (
  previousParagraphs: string[],
  storyTitle: string,
  chapterNumber: number,
  language: string,
  apiKey: string | null,
  genre: string,
  length: 'very_short' | 'short' | 'medium' | 'long' | 'very_long',
  model: string = 'gemini-2.5-flash',
  provider: string = 'gemini',
  otherApiKey?: string,
  targetAudience: string = 'children',
  userGuidance?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string; tone?: string }
): Promise<{ chapterTitle: string; paragraphs: string[]; choices?: string[]; tone?: string }> => {
  const lengthDescription = getLengthDescription(length);
  
  const genreDirective = getGenreNarrativeDirective(genre);
  const audienceDirective = getTargetAudienceDirective(targetAudience);
  const toneDirective = getToneVocabularyDirective(options?.tone, genre, userGuidance || storyTitle);

  const loreContext = globalStoryGraph.getLoreContextForPrompt();
  const lorePrompt = loreContext ? `\nKnowledge Graph Lore Context:\n${loreContext}\n` : '';
  const inconsistencyAudit = globalStoryGraph.getInconsistencyAudit();
  const inconsistencyPrompt = inconsistencyAudit 
    ? `\nPotential Plot Inconsistencies & Continuity Audit (Query from Global Story Graph - DO NOT contradict these facts):\n${inconsistencyAudit}\n`
    : '';

  const systemInstruction = `You are a master storyteller writing the next chapter of an epic story titled "${storyTitle}".
Language: ${language}

${genreDirective}

${audienceDirective}

${toneDirective}
${lorePrompt}
${inconsistencyPrompt}

Instructions:
- Write Chapter ${chapterNumber} of the story.
- Generate an imaginative, evocative chapter title (e.g. "Chapter ${chapterNumber}: <Compelling Subtitle>").
- Provide exactly ${lengthDescription} connected, vivid narrative paragraphs that continue the plot seamlessly from previous events with rich sensory atmosphere and emotional depth.
- Provide exactly THREE proactive, strategic narrative choices for future branches in the "choices" field (e.g., one bold confrontation, one tactical/stealth maneuver, one diplomatic/investigative action).

Output Format:
Return a JSON object with:
- "chapterTitle": String
- "paragraphs": Array of strings (each string is one paragraph)
- "choices": Array of 3 strings (interactive options)`;

  const historyContext = `Previous story events so far:\n${previousParagraphs.slice(-6).join('\n\n')}`;
  const guidance = userGuidance ? `\n\nDirect user guidance for this chapter: "${userGuidance}"` : '';
  const fullPrompt = `${historyContext}${guidance}\n\nWrite Chapter ${chapterNumber} now.`;

  return withRetry(async () => {
    if (provider === 'gemini') {
      try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
          model: model,
          contents: fullPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: chapterResponseSchema as any,
            temperature: 1.05,
          },
        });
        const responseText = response.text;
        if (!responseText) throw new Error("The AI model returned an empty response.");
        return extractJson(responseText);
      } catch (geminiErr: any) {
        console.warn("[Auto-Recovery] Gemini chapter generation failed or exceeded quota, trying free fallbacks:", geminiErr?.message || geminiErr);
        try {
          const raw = await callPuterAiChat(fullPrompt, systemInstruction, 'openai/gpt-5.4-nano');
          if (raw) return extractJson(raw);
        } catch (puterErr) {
          console.warn("[Auto-Recovery] Puter chapter fallback failed, trying Pollinations:", puterErr);
        }

        try {
          const { baseURL } = getOpenAIProviderConfig('pollinations');
          const openai = getOpenAIClient('dummy', baseURL);
          const completion = await openai.chat.completions.create({
            model: 'openai',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: `${fullPrompt}. Return valid JSON with "chapterTitle", "paragraphs" (array of strings), and "choices" (array of strings).` }
            ],
            temperature: 1.05,
            response_format: { type: 'json_object' },
          });
          const content = completion.choices[0]?.message?.content;
          if (content) return extractJson(content);
        } catch {}

        throw geminiErr;
      }
    } else if (provider === 'puter') {
      const raw = await callPuterAiChat(fullPrompt, systemInstruction, model || 'openai/gpt-5.4-nano');
      return extractJson(raw);
    } else {
      if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing. Please provide it in Settings.`);
      }

      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
        apiKey: otherApiKey,
        customBaseUrl: options?.customBaseUrl,
        cloudflareAccountId: options?.cloudflareAccountId,
      });

      const openai = getOpenAIClient(effectiveApiKey, baseURL);
      const completion = await openai.chat.completions.create({
        model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `${fullPrompt}. Return valid JSON.` }
        ],
        temperature: 1.05,
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('No content returned from AI');
      return extractJson(content);
    }
  });
};

const plotTwistsSchema = {
  type: Type.OBJECT,
  properties: {
    twists: {
      type: Type.ARRAY,
      description: "Three distinct recommended plot twists for the story.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          promptAction: { type: Type.STRING }
        },
        required: ["title", "category", "description", "promptAction"]
      }
    }
  },
  required: ["twists"]
};

export const generatePlotTwists = async (
  previousParagraphs: string[],
  storyTitle: string,
  genre: string,
  targetAudience: string = 'children',
  apiKey: string | null = null,
  provider: string = 'gemini',
  otherApiKey?: string,
  model: string = 'gemini-2.5-flash',
  graphContext?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<import('../types').PlotTwistOption[]> => {
  const systemInstruction = `You are a creative narrative strategist and master plot architect.
Analyze the story "${storyTitle}" (Genre: ${genre}, Audience: ${targetAudience}).
${graphContext ? `Knowledge Graph Context:\n${graphContext}\n` : ''}

Your goal: Recommend THREE distinct, highly engaging next plot twists that completely transform or elevate the story trajectory in unexpected ways.

Categories to select from (pick 3 distinct categories):
- "revelation" (a shocking secret or truth unveiled)
- "supernatural" (an unexplainable phenomenon or magic anomaly)
- "betrayal" (a trusted ally turns or has hidden motives)
- "dramatic_shift" (an urgent environmental or situational disaster)
- "mystery" (a cryptic artifact, puzzle, or unknown entity appears)
- "action" (sudden confrontation or high-stakes race against time)

Format: Return a JSON object with a "twists" array of 3 objects, each containing:
- "title": Catchy 2-4 word twist title
- "category": One of the categories above
- "description": 1 sentence explaining the dramatic twist
- "promptAction": The exact prompt text to send to continue the story with this twist.`;

  const recentText = previousParagraphs.slice(-4).join('\n\n');
  const fullPrompt = `Story Context:\n${recentText}\n\nGenerate 3 recommended next plot twists now.`;

  return withRetry(async () => {
    if (provider === 'gemini') {
      try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
          model,
          contents: fullPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: plotTwistsSchema,
          },
        });
        const parsed = extractJson(response.text || '');
        return parsed.twists || [];
      } catch (geminiErr) {
        console.warn("[Auto-Recovery] Gemini plot twists failed, trying Puter fallback:", geminiErr);
        try {
          const raw = await callPuterAiChat(fullPrompt, systemInstruction, 'openai/gpt-5.4-nano');
          const parsed = extractJson(raw);
          if (parsed.twists && Array.isArray(parsed.twists)) return parsed.twists;
        } catch {}

        try {
          const { baseURL } = getOpenAIProviderConfig('pollinations');
          const openai = getOpenAIClient('dummy', baseURL);
          const completion = await openai.chat.completions.create({
            model: 'openai',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: `${fullPrompt}. Return valid JSON with "twists" array.` }
            ],
            response_format: { type: 'json_object' },
          });
          const content = completion.choices[0]?.message?.content;
          if (content) {
            const parsed = extractJson(content);
            if (parsed.twists && Array.isArray(parsed.twists)) return parsed.twists;
          }
        } catch {}

        return [
          {
            title: "A Sudden Revelation",
            category: "revelation",
            description: "A mysterious secret comes to light, altering the path forward.",
            promptAction: "An unexpected truth is revealed that changes everything."
          },
          {
            title: "An Unknown Ally",
            category: "mystery",
            description: "A cryptic figure emerges with critical guidance.",
            promptAction: "A mysterious traveler appears offering crucial assistance."
          },
          {
            title: "A Sudden Peril",
            category: "dramatic_shift",
            description: "The environment shifts dangerously, forcing quick action.",
            promptAction: "An unforeseen obstacle suddenly blocks the way forward."
          }
        ];
      }
    } else if (provider === 'puter') {
      const raw = await callPuterAiChat(fullPrompt, systemInstruction, model || 'openai/gpt-5.4-nano');
      const parsed = extractJson(raw);
      return parsed.twists || [];
    } else {
      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
        apiKey: otherApiKey,
        customBaseUrl: options?.customBaseUrl,
        cloudflareAccountId: options?.cloudflareAccountId,
      });
      const openai = getOpenAIClient(effectiveApiKey, baseURL);
      const completion = await openai.chat.completions.create({
        model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `${fullPrompt}. Return valid JSON.` }
        ],
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('No content returned from AI');
      const parsed = extractJson(content);
      return parsed.twists || [];
    }
  });
};

export const getImageStylePrompt = (imageStyle: string): string => {
  switch (imageStyle) {
    case 'whimsical':
      return 'whimsical storybook illustration, soft pastel colors, dreamy atmosphere, detailed line work, magical, charming, hand-drawn aesthetic';
    case 'realistic':
      return 'photorealistic, cinematic lighting, 8k resolution, highly detailed, sharp focus, depth of field, professional photography';
    case 'cartoon':
      return 'vibrant cartoon style, bold outlines, bright flat colors, expressive characters, 2d animation style, fun and energetic';
    case 'watercolor':
      return 'watercolor painting, soft bleeding edges, artistic, textured paper, gentle strokes, dreamy, ethereal';
    case 'oil_painting':
      return 'classic oil painting, rich textures, visible brushstrokes, dramatic lighting, fine art style, masterpiece';
    case 'dark_fantasy_oil':
      return 'dark fantasy oil painting, grim atmospheric depth, moody chiaroscuro lighting, textured canvas, epic gothic majesty';
    case 'anime':
      return 'anime style, vibrant colors, cel shaded, detailed character design, modern animated series visual standard';
    case 'studio_ghibli':
      return 'Studio Ghibli inspired anime art, hand-painted scenic backgrounds, lush skies, vibrant pastoral colors, heartfelt nostalgic magic';
    case 'pixel_art':
      return 'pixel art, 16-bit retro game style, vibrant colors, clean sprites, nostalgic, detailed pixel work';
    case '3d_render':
    case 'pixar_3d':
      return 'pixar 3d animation style, cute, soft global illumination, clay and subsurface material scattering, high fidelity CGI movie render';
    case 'cyberpunk_neon':
    case 'cyberpunk':
      return 'cyberpunk style, neon synthwave lights, futuristic megalopolis, high tech, dark atmospheric rain reflections, glowing conduits';
    case 'synthwave_80s':
      return '80s retro synthwave outrun aesthetic, neon grid, sunset magenta and cyan hues, vintage chrome, retrofuturistic';
    case 'ukiyo_e':
      return 'Japanese Ukiyo-e woodblock print style, elegant fluid linework, muted organic pigments, traditional washi paper texture';
    case 'stained_glass':
      return 'gothic stained glass window artwork, radiant glowing jewel tones, intricate leaded outlines, luminous sacred light';
    case 'paper_cutout':
      return 'layered paper cutout art, 3D papercraft depth, tactile drop shadows, clean geometric silhouettes, delightful craft aesthetic';
    case 'gothic_etching':
      return 'vintage gothic book etching and engraving, detailed crosshatching, antique paper grain, mysterious dark fairytale aesthetic';
    case 'pop_art_comic':
      return 'vintage comic book pop art, Ben-Day dots, bold ink lines, dynamic dramatic angles, retro graphic novel look';
    case 'cinematic_photo':
      return '35mm cinematic film still, anamorphic lens flare, Kodak Portra film grain, dramatic shallow depth of field, emotional cinematic grading';
    case 'concept_art':
      return 'AAA video game concept art, dynamic epic scale, digital matte painting, volumetric atmospheric haze, breathtaking vista';
    case 'noir':
      return 'film noir style, black and white, high contrast chiaroscuro, dramatic cast shadows, moody venetian blind silhouettes';
    case 'vintage':
      return 'vintage mid-century illustration, 1950s storybook retro color palette, textured, nostalgic, classic print feel';
    case 'abstract':
      return 'abstract surrealist art, geometric shapes, bold colors, dreamlike interpretive composition, modern gallery aesthetic';
    case 'disney_animation':
      return 'classic golden age Disney 2D animation style, hand-drawn, expressive characters, vibrant colors, magical atmosphere, nostalgic cell animation';
    case 'vintage_disney':
      return 'vintage 1930s rubber-hose animation, sepia and monochrome film grain, whimsical bouncy cartoon characters';
    case 'sketch':
      return 'expressive charcoal and ink sketch, loose dynamic lines, artistic concept art, raw textural depth';
    case 'pencil_sketch':
      return 'detailed pencil sketch, graphite, fine shading, realistic pencil strokes, monochromatic craftsmanship';
    case 'claymation':
      return 'claymation stop-motion style, plasticine figures with tactile clay fingerprints, miniature handmade sets, charming quirkiness';
    case 'mosaic':
      return 'ancient Byzantine mosaic art style, shimmering tesserae tiles, rich gold leaf accents, historic artisan craft';
    default:
      return 'digital art, high quality, detailed, vibrant colors, professional illustration';
  }
};

export const getGenreThemeVisuals = (genre?: string): string => {
  switch (genre?.toLowerCase()) {
    case 'fantasy':
      return 'Epic High Fantasy aesthetic: mystical glowing aura, grand castles, magical ancient relics, enchanted landscapes, mythical creatures, rich celestial lighting.';
    case 'dark_fantasy':
      return 'Dark Fantasy & Grimdark aesthetic: towering gothic citadels, blood-moon lighting, cursed spectral mists, brooding armor, dark arcane runes.';
    case 'sci-fi':
      return 'Futuristic Science Fiction aesthetic: hyper-detailed cosmic starscapes, cybernetic architecture, neon energy conduits, quantum holograms, sleek spaceships.';
    case 'cyberpunk':
      return 'Dystopian Cyberpunk aesthetic: rain-slicked mega-city alleys, towering neon holograms, glowing neural cyberware, synthwave chromatic aberrations.';
    case 'space_opera':
      return 'Galactic Space Opera aesthetic: grand star fleets, swirling vibrant nebulae, planetary rings, colossal stellar citadels, epic interstellar horizons.';
    case 'steampunk':
      return 'Victorian Steampunk aesthetic: gleaming brass clockwork, soaring copper airships, hissing steam pressure valves, ornate cogwheel architecture.';
    case 'mystery':
      return 'Atmospheric Mystery Noir aesthetic: dramatic chiaroscuro shadows, foggy cobblestone streets, glowing lantern, enigmatic silhouettes, intriguing clues.';
    case 'crime':
      return 'Gritty Detective Underworld aesthetic: rainy neon metropolis, shadowy trench coat figure, dramatic streetlights, smoky interrogation atmosphere.';
    case 'adventure':
      return 'Thrilling Grand Adventure aesthetic: sweeping scenic vistas, ancient hidden ruins, golden hour expedition lighting, daring exploratory grandeur.';
    case 'fairy_tale':
      return 'Classic Fairytale Wonder aesthetic: lush enchanted forest, glowing fairy dust, whimsical storybook castles, magical talking creatures, radiant soft pastel hues.';
    case 'horror':
      return 'Gothic Chilling Horror aesthetic: dark brooding atmosphere, mist-shrouded ruins, eerie moonlight, haunting shadows, suspenseful dread.';
    case 'cosmic_horror':
      return 'Lovecraftian Cosmic Horror aesthetic: non-Euclidean abyssal monoliths, celestial star alignments, eerie bio-luminescence, unfathomable eldritch wonder.';
    case 'thriller':
      return 'High-Tension Cinematic Thriller aesthetic: high contrast, dramatic urban reflections, suspenseful composition, gripping emotional atmosphere.';
    case 'romance':
      return 'Poetic Romance aesthetic: golden hour warmth, blooming botanical elegance, soft dreamlike bokeh, tender emotional resonance.';
    case 'superhero':
      return 'Dynamic Superhero Comic Art aesthetic: bold dramatic lighting flares, heroic soaring stance, vibrant power surges, energetic graphic punch.';
    case 'mythological':
      return 'Ancient Mythological Realm aesthetic: marble temples atop Mount Olympus, roaring celestial thunder, divine golden halos, legendary sacred beasts.';
    case 'time_travel':
      return 'Chrono Paradox aesthetic: warping temporal portals, shifting centuries, floating antique clock gears, shimmering tachyon waves.';
    case 'post_apocalyptic':
      return 'Post-Apocalyptic Wasteland aesthetic: overgrown rusted metropolis, sun-bleached desert dunes, scavenged survival gear, resolute human hope.';
    case 'urban_fantasy':
      return 'Modern Urban Fantasy aesthetic: neon spellcraft sigils glowing in rain-washed alleyways, modern cloaked sorcerers, enchanted city nightscapes.';
    case 'western':
      return 'Wild West Frontier aesthetic: red rock canyons, dusty desert showdowns, sunlit saloon porches, galloping horses under dramatic western skies.';
    case 'historical':
      return 'Grand Historical Period aesthetic: authentic heritage architecture, classical oil painting lighting, rich textured fabrics, museum-grade atmospheric depth.';
    case 'educational':
      return 'Engaging Educational Storybook aesthetic: clear vibrant illustration, friendly expressive characters, curious exploration, lively discoveries.';
    case 'bedtime':
      return 'Gentle Bedtime Dreamland aesthetic: soothing starry night sky, cozy crescent moon, soft twilight glow, calming peaceful pastel ambiance.';
    case 'funny':
      return 'Playful Comedic Cartoon aesthetic: lively expressive characters, funny dynamic situations, vibrant cheerful colors, whimsical charm.';
    case 'fable':
      return 'Timeless Moral Fable aesthetic: beautifully illustrated woodland characters, rich textured folk art style, ancient storybook elegance.';
    case 'drama':
      return 'Poignant Human Drama aesthetic: deep emotional depth, cinematic golden hour lighting, authentic character focus, evocative narrative tone.';
    default:
      return 'Immersive narrative storybook aesthetic: rich atmosphere, striking composition, vibrant lighting, captivating emotional resonance.';
  }
};

export const getAudienceVisuals = (audience?: string): string => {
  switch (audience?.toLowerCase()) {
    case 'early_reader':
      return 'Toddlers & Early Readers: vibrant, cuddly, friendly, ultra-bright, soothing, charming, playful and heartwarming.';
    case 'children':
      return 'Children & Kids Storybook: warm, friendly, magical, uplifting, delightful, charming, bright, age-appropriate, wondrous and inviting.';
    case 'middle_grade':
      return 'Middle Grade Adventure: vibrant, energetic, curious, thrilling, full of mystery, camaraderie, and wonder.';
    case 'teen':
    case 'young_adult':
      return 'Young Adult (YA) Fiction: dynamic, modern, stylish, bold, emotionally captivating, sleek character appeal, adventurous.';
    case 'adult':
      return 'Adult Literary Fiction: sophisticated, nuanced, atmospheric, cinematic, profound visual depth, striking symbolic elegance.';
    case 'mature_dark':
      return 'Mature Dark Fiction: dramatic, moody, intense chiaroscuro, evocative psychological atmosphere, gripping mature visual depth.';
    default:
      return 'Universal Family Edition: captivating, beautifully balanced, enchanting for all ages.';
  }
};

export const generateImage = async (
  prompt: string,
  apiKey: string | null,
  imageStyle: string,
  model: string = 'gemini-3.1-flash-lite-image',
  provider: string = 'gemini',
  otherApiKey?: string,
  options?: { 
    customBaseUrl?: string; 
    cloudflareAccountId?: string; 
    genre?: string; 
    targetAudience?: string; 
    storyTitle?: string;
    aspectRatio?: string;
  }
): Promise<string> => {
  const targetRatio = options?.aspectRatio || '16:9';
  
  const fullPrompt = buildSceneImagePrompt(
    prompt,
    imageStyle,
    options?.genre,
    options?.targetAudience,
    targetRatio
  );

  // Gemini & Imagen aspect ratio mapping: "1:1" | "3:4" | "4:3" | "9:16" | "16:9"
  const geminiRatioMap: Record<string, '1:1' | '3:4' | '4:3' | '9:16' | '16:9'> = {
    '16:9': '16:9',
    '1:1': '1:1',
    '4:3': '4:3',
    '3:2': '4:3',
    '9:16': '9:16',
    '21:9': '16:9',
  };
  const geminiRatio = geminiRatioMap[targetRatio] || '16:9';

  // Pollinations pixel dimensions mapping
  const pollinationsDimensions: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1280, height: 720 },
    '1:1': { width: 1024, height: 1024 },
    '4:3': { width: 1024, height: 768 },
    '3:2': { width: 1080, height: 720 },
    '9:16': { width: 720, height: 1280 },
    '21:9': { width: 1344, height: 576 },
  };
  const { width: pWidth, height: pHeight } = pollinationsDimensions[targetRatio] || { width: 1280, height: 720 };

  // OpenAI size mapping
  const openaiSize = targetRatio === '9:16' ? "1024x1792" : targetRatio === '1:1' ? "1024x1024" : "1792x1024";

  // Define resilient tier strategies
  const tryGemini = async (mdl: string): Promise<string | null> => {
    try {
      const ai = getAiClient(apiKey);
      const isImagen = mdl.startsWith('imagen');

      if (isImagen) {
        try {
          const response = await ai.models.generateImages({
            model: mdl,
            prompt: fullPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: geminiRatio,
            },
          });
          if (response.generatedImages?.[0]?.image?.imageBytes) {
            return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
          }
        } catch (imgErr) {
          console.warn(`[Auto-Retry Image] Imagen model ${mdl} failed, falling back to gemini image models:`, imgErr);
        }
      }

      const effectiveModel = !isImagen && mdl ? mdl : 'gemini-2.5-flash-image';
      const response = await ai.models.generateContent({
        model: effectiveModel,
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: geminiRatio,
            imageSize: "1K"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
      return null;
    } catch (e) {
      console.warn(`[Auto-Retry Image] Gemini model ${mdl} attempt failed:`, e);
      return null;
    }
  };

  const tryPuter = async (mdl: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && (window as any).puter?.ai?.txt2img) {
      try {
        const img = await (window as any).puter.ai.txt2img(fullPrompt, { model: mdl });
        if (img?.src) return img.src;
        if (typeof img === 'string') return img;
      } catch (err) {
        console.warn(`[Auto-Retry Image] Puter txt2img model ${mdl} failed:`, err);
      }
    }
    return null;
  };

  const tryOpenAiCompatible = async (prov: string, mdl: string, key?: string): Promise<string | null> => {
    if (!key && prov !== 'cloudflare') return null;
    try {
      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(prov, {
        apiKey: key,
        customBaseUrl: options?.customBaseUrl,
        cloudflareAccountId: options?.cloudflareAccountId,
      });
      const openai = getOpenAIClient(effectiveApiKey, baseURL);
      const response = await openai.images.generate({
        model: mdl,
        prompt: fullPrompt,
        n: 1,
        size: openaiSize as any,
      });
      const imageUrl = response.data[0]?.url || (response.data[0] as any)?.b64_json ? `data:image/png;base64,${(response.data[0] as any).b64_json}` : '';
      if (imageUrl) return imageUrl;
    } catch (err) {
      console.warn(`[Auto-Retry Image] ${prov} model ${mdl} failed:`, err);
    }
    return null;
  };

  const getPollinationsUrl = (mdl: string = 'nanobanana-2-lite'): string => {
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const rawKey = otherApiKey ? otherApiKey.replace(/^Bearer\s+/i, '').trim() : '';
    const keyParam = rawKey ? `&key=${encodeURIComponent(rawKey)}` : '';
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${pWidth}&height=${pHeight}&seed=${seed}&model=${mdl}&nologo=true${keyParam}`;
  };

  // Step 1: Attempt the user's primary selected provider & model
  if (provider === 'gemini') {
    const res = await tryGemini(model);
    if (res) return res;
    // Auto-retry with secondary Gemini model if first one was Imagen or Flash
    if (model.startsWith('imagen')) {
      const resFallback = await tryGemini('gemini-2.5-flash-image');
      if (resFallback) return resFallback;
    }
  } else if (provider === 'puter') {
    const res = await tryPuter(model && model !== 'puter-txt2img' ? model : 'nanobanana-2-lite');
    if (res) return res;
  } else if (['zai', 'openai', 'siliconflow', 'huggingface', 'cloudflare'].includes(provider)) {
    const res = await tryOpenAiCompatible(provider, model, otherApiKey);
    if (res) return res;
  }

  // Step 2: Auto-retry with Puter.js in-browser free image engine (if available)
  try {
    const puterRes = await tryPuter('nanobanana-2-lite');
    if (puterRes) return puterRes;
  } catch {}

  // Step 3: Zero-downtime auto-fallback to high-fidelity Pollinations Nano Banana engine
  return getPollinationsUrl(model && !model.startsWith('gemini') ? model : 'nanobanana-2-lite');
};

export interface CoverImageOptions {
  title: string;
  genre?: string;
  targetAudience?: string;
  imageStyle?: string;
  storyPrompt?: string;
  apiKey?: string | null;
  model?: string;
  provider?: string;
  otherApiKey?: string;
  options?: { customBaseUrl?: string; cloudflareAccountId?: string };
}

export const generateCoverImage = async (
  promptOrOptions: string | CoverImageOptions,
  apiKey?: string | null,
  imageStyle: string = 'whimsical',
  model: string = 'gemini-3.1-flash-lite-image',
  provider: string = 'gemini',
  otherApiKey?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string },
  genre?: string,
  targetAudience?: string,
  storyTitle?: string
): Promise<string> => {
  let finalTitle = '';
  let finalGenre = 'fantasy';
  let finalAudience = 'children';
  let finalStyle = imageStyle;
  let finalPrompt = '';
  let finalApiKey = apiKey ?? null;
  let finalModel = model;
  let finalProvider = provider;
  let finalOtherApiKey = otherApiKey;
  let finalOptions = options;

  if (typeof promptOrOptions === 'object' && promptOrOptions !== null) {
    finalTitle = promptOrOptions.title || 'Untitled Story';
    finalGenre = promptOrOptions.genre || 'fantasy';
    finalAudience = promptOrOptions.targetAudience || 'children';
    finalStyle = promptOrOptions.imageStyle || 'whimsical';
    finalPrompt = promptOrOptions.storyPrompt || '';
    finalApiKey = promptOrOptions.apiKey !== undefined ? promptOrOptions.apiKey : (apiKey ?? null);
    finalModel = promptOrOptions.model || model;
    finalProvider = promptOrOptions.provider || provider;
    finalOtherApiKey = promptOrOptions.otherApiKey || otherApiKey;
    finalOptions = promptOrOptions.options || options;
  } else if (typeof promptOrOptions === 'string') {
    finalPrompt = promptOrOptions || '';
    finalTitle = storyTitle || 'Story Chronicle';
    finalGenre = genre || 'fantasy';
    finalAudience = targetAudience || 'children';
  }

  const styleVisuals = getImageStylePrompt(finalStyle);
  const genreVisuals = getGenreThemeVisuals(finalGenre);
  const audienceVisuals = getAudienceVisuals(finalAudience);

  // Construct cover prompt explicitly featuring Story Title, Genre Theme, and Target Audience
  const fullCoverPrompt = `A breathtaking, publication-quality illustrated ebook cover art.
BOOK TITLE: "${finalTitle}" (MANDATORY: Prominently feature and render the story title text "${finalTitle}" in majestic, artistic, highly legible book cover typography on the artwork).
GENRE THEME (${finalGenre.toUpperCase()}): ${genreVisuals}
TARGET AUDIENCE (${finalAudience.toUpperCase()}): ${audienceVisuals}
ART STYLE: ${styleVisuals}
STORY PREMISE: ${finalPrompt || `An unforgettable ${finalGenre} journey`}
COMPOSITION & LIGHTING: Masterpiece front book cover illustration, vertical portrait orientation (3:4 ratio), striking central hero focal subject, rich atmospheric background, dynamic cinematic lighting, perfectly framed for a published best-selling storybook cover.`;

  // Use provider-specific generation with cover prompt
  if (finalProvider === 'gemini') {
    const keyToUse = finalApiKey || process.env.API_KEY || (typeof window !== 'undefined' ? (window as any).GEMINI_API_KEY : '');
    if (keyToUse) {
      try {
        const ai = new GoogleGenAI({ apiKey: keyToUse });
        
        // 1. Try generateImages with Imagen
        try {
          const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: fullCoverPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '3:4',
            },
          });

          if (response.generatedImages?.[0]?.image?.imageBytes) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
          }
        } catch (imgErr) {
          console.warn("Imagen generation for cover failed, attempting Gemini multimodal image generation:", imgErr);
        }

        // 2. Try generateContent with gemini-2.5-flash-image
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [{ text: fullCoverPrompt }]
            },
            config: {
              imageConfig: {
                aspectRatio: "3:4",
                imageSize: "1K"
              }
            }
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        } catch (genContentErr) {
          console.warn("Gemini content image generation for cover failed:", genContentErr);
        }
      } catch (e) {
        console.warn("Gemini cover image generation encountered error, falling back cleanly:", e);
      }
    }
  } else if (finalProvider === 'puter') {
    if (typeof window !== 'undefined' && (window as any).puter?.ai?.txt2img) {
      try {
        const imageElement = await (window as any).puter.ai.txt2img(fullCoverPrompt, {
          model: finalModel || 'nanobanana-2-lite',
          width: 768,
          height: 1024,
        });
        if (imageElement?.src) return imageElement.src;
        if (typeof imageElement === 'string') return imageElement;
      } catch (err) {
        console.warn("Puter AI cover txt2img error:", err);
      }
    }
  } else if (finalProvider === 'openai') {
    if (finalOtherApiKey) {
      try {
        const baseUrl = finalOptions?.customBaseUrl || 'https://api.openai.com/v1';
        const res = await fetch(`${baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${finalOtherApiKey}`
          },
          body: JSON.stringify({
            model: finalModel || 'dall-e-3',
            prompt: fullCoverPrompt,
            n: 1,
            size: '1024x1792',
            response_format: 'b64_json'
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.[0]?.b64_json) {
            return `data:image/png;base64,${data.data[0].b64_json}`;
          }
          if (data.data?.[0]?.url) {
            return data.data[0].url;
          }
        }
      } catch (err) {
        console.warn("OpenAI cover image generation error:", err);
      }
    }
  } else if (finalProvider === 'zai' || finalProvider === 'siliconflow' || finalProvider === 'huggingface' || finalProvider === 'cloudflare') {
    if (finalOtherApiKey || finalProvider === 'cloudflare') {
      try {
        const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(finalProvider, {
          apiKey: finalOtherApiKey,
          customBaseUrl: finalOptions?.customBaseUrl,
          cloudflareAccountId: finalOptions?.cloudflareAccountId,
        });
        const openai = getOpenAIClient(effectiveApiKey, baseURL);
        const response = await openai.images.generate({
          model: finalModel || 'cogview-3-flash',
          prompt: fullCoverPrompt,
          n: 1,
          size: "1024x1024",
        });
        const imgUrl = response.data[0]?.url || (response.data[0] as any)?.b64_json ? `data:image/png;base64,${(response.data[0] as any).b64_json}` : '';
        if (imgUrl) return imgUrl;
      } catch (err) {
        console.warn(`${finalProvider} cover generation error, using fallback:`, err);
      }
    }
  }

  // Reliable, high-speed Pollinations Nano Banana 2 / Flux fallback with vertical book-cover dimensions
  const encodedPrompt = encodeURIComponent(fullCoverPrompt);
  const seed = Math.floor(Math.random() * 1000000);
  const coverModel = finalModel && !finalModel.startsWith('gemini') ? finalModel : 'nanobanana-2-lite';
  const rawKey = finalOtherApiKey ? finalOtherApiKey.replace(/^Bearer\s+/i, '').trim() : '';
  const keyParam = rawKey ? `&key=${encodeURIComponent(rawKey)}` : '';
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&seed=${seed}&model=${coverModel}&nologo=true${keyParam}`;
};

// Helper to convert 16-bit PCM (sample rate 24000, 1 channel) to WAV Base64
const pcmBase64ToWavBase64 = (pcmBase64: string): string => {
  const binaryString = atob(pcmBase64);
  const pcmLength = binaryString.length;
  
  // WAV Header is 44 bytes
  const wavBuffer = new ArrayBuffer(44 + pcmLength);
  const view = new DataView(wavBuffer);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + pcmLength, true); // ChunkSize
  writeString(8, 'WAVE'); // Format
  writeString(12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels
  view.setUint32(24, 24000, true); // SampleRate
  view.setUint32(28, 24000 * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data'); // Subchunk2ID
  view.setUint32(40, pcmLength, true); // Subchunk2Size

  // Write PCM Data
  const uint8View = new Uint8Array(wavBuffer, 44);
  for (let i = 0; i < pcmLength; i++) {
    uint8View[i] = binaryString.charCodeAt(i);
  }

  // Convert ArrayBuffer back to Base64
  let wavBinary = '';
  const wavBytes = new Uint8Array(wavBuffer);
  for (let i = 0; i < wavBytes.length; i++) {
    wavBinary += String.fromCharCode(wavBytes[i]);
  }
  return window.btoa(wavBinary);
};

export const mapSentimentToVoiceExpression = (
  sentiment?: string,
  genre?: string
): { mood: string; intensity: 'subtle' | 'moderate' | 'dramatic' | 'intense'; pace: 'slow' | 'moderate' | 'fast'; whisper?: boolean; styleDescription: string } => {
  const cleanSent = sentiment ? sentiment.trim() : '';
  const cleanGenre = genre ? genre.replace(/_/g, ' ').trim() : '';

  return {
    mood: cleanSent || 'adaptive',
    intensity: 'moderate',
    pace: 'moderate',
    whisper: cleanSent.toLowerCase().includes('whisper') || cleanSent.toLowerCase().includes('secret'),
    styleDescription: cleanSent 
      ? `Semantically guided by "${cleanSent}" in a ${cleanGenre || 'rich narrative'} setting with organic vocal modulation.`
      : `Semantically responsive storytelling with dynamic emotional modulation.`
  };
};

export const getDynamicVoiceDirection = (
  text: string,
  genre?: string,
  targetAudience?: string,
  voice?: string,
  customVoiceConfig?: import('../types').VoiceStyleConfig,
  sentiment?: string
): string => {
  const contextNotes: string[] = [];

  if (genre) {
    contextNotes.push(`Genre Atmosphere: ${genre.replace(/_/g, ' ')}`);
  }
  if (targetAudience) {
    contextNotes.push(`Audience Resonance: ${targetAudience.replace(/_/g, ' ')}`);
  }
  if (sentiment) {
    contextNotes.push(`Emotional Undercurrent: ${sentiment}`);
  }
  if (customVoiceConfig?.mood) {
    contextNotes.push(`Voice Mood Preference: ${customVoiceConfig.mood}`);
  }

  const contextSection = contextNotes.length > 0 
    ? `\nNarrative Context:\n${contextNotes.map(n => `- ${n}`).join('\n')}\n` 
    : '';

  return `Semantic Performance Direction for Voice Narration:
You are an expert, award-winning voice actor narrating this story with complete semantic awareness and authentic emotional intelligence.

Do NOT follow static or rigid delivery rules. Instead, semantically understand the unfolding situation, dialogue, tension, and emotional undercurrents of the scene:
1. Dynamic Situational Modulation: In real time, organically modulate your vocal timbre, pitch, breathiness, and volume to match the evolving situation—naturally softening for intimate or covert exchanges, accelerating with urgent tension during peril or conflict, brightening with wonder or joy, and lingering with poignant weight during sorrow or contemplation.
2. Dialogue & Character Acting: Bring distinct psychological reality and vocal nuance to character voices and dialogue lines, expressing their subtext and internal emotional states naturally.
3. Organic Cadence & Breath: Employ natural human pacing, authentic micro-pauses, and fluid rhythm that mirrors the narrative's emotional heartbeat rather than a mechanical meter.
${contextSection}
Deliver a vivid, semantically immersive vocal performance.`;
};

export const generateTTSAudio = async (
  text: string, 
  apiKey: string | null, 
  voice: string = 'Kore',
  model: string = 'gemini-3.1-flash-tts-preview',
  provider: 'gemini' | 'openai' | 'pollinations' = 'gemini',
  otherApiKey?: string,
  options?: {
    genre?: string;
    targetAudience?: string;
    emotion?: string;
    sentiment?: string;
    voiceStyleConfig?: import('../types').VoiceStyleConfig;
  }
): Promise<string> => {
  const voiceDirection = getDynamicVoiceDirection(
    text, 
    options?.genre, 
    options?.targetAudience, 
    voice,
    options?.voiceStyleConfig,
    options?.sentiment || options?.emotion
  );
  
  // Strategy 1: Attempt Gemini TTS with expressive directional prompt
  const tryGeminiTts = async (mdl: string, v: string): Promise<string | null> => {
    try {
      const ai = getAiClient(apiKey);
      const promptDirective = `${voiceDirection}\n\nNarrate the following story paragraph expressively:\n"${text}"`;
      
      const response = await ai.models.generateContent({
        model: mdl,
        contents: [{ parts: [{ text: promptDirective }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: v }, 
            },
          },
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const wavBase64 = pcmBase64ToWavBase64(base64Audio);
        return `data:audio/wav;base64,${wavBase64}`;
      }
      return null;
    } catch (err) {
      console.warn(`[Auto-Retry TTS] Gemini TTS ${mdl} failed:`, err);
      return null;
    }
  };

  // Strategy 2: Attempt OpenAI TTS
  const tryOpenAiTts = async (key: string, mdl: string = 'tts-1', v: string = 'alloy'): Promise<string | null> => {
    try {
      const openai = getOpenAIClient(key, 'https://api.openai.com/v1');
      const safeModel = mdl.startsWith('gemini') ? 'tts-1' : mdl;
      const response = await openai.audio.speech.create({
        model: safeModel,
        voice: (['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(v) ? v : 'alloy') as any,
        input: text,
        response_format: 'mp3',
      });
      const buffer = await response.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:audio/mp3;base64,${window.btoa(binary)}`;
    } catch (err) {
      console.warn(`[Auto-Retry TTS] OpenAI TTS failed:`, err);
      return null;
    }
  };

  // Strategy 3: Attempt Pollinations TTS (Supports Bearer token & voice parameters)
  const tryPollinationsTts = async (key?: string): Promise<string | null> => {
    const rawKey = key ? key.replace(/^Bearer\s+/i, '').trim() : '';
    const safeVoice = (['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'ballad', 'coral', 'sage', 'verse', 'rachel', 'domi', 'bella', 'elli', 'charlotte', 'dorothy', 'sarah', 'emily', 'lily', 'matilda', 'adam', 'antoni', 'arnold'].includes(voice) ? voice : 'alloy') as any;
    
    try {
      const openai = getOpenAIClient(rawKey || 'anonymous', 'https://gen.pollinations.ai/v1');
      const response = await openai.audio.speech.create({
        model: 'openai-audio',
        voice: safeVoice,
        input: text,
        response_format: 'mp3',
      });
      const buffer = await response.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:audio/mp3;base64,${window.btoa(binary)}`;
    } catch (err) {
      console.warn(`[Auto-Retry TTS] Pollinations OpenAI TTS failed, trying direct audio stream endpoint:`, err);
      try {
        const audioUrl = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=${encodeURIComponent(safeVoice)}${rawKey ? `&key=${encodeURIComponent(rawKey)}` : ''}`;
        const resp = await fetch(audioUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (streamErr) {
        console.warn(`[Auto-Retry TTS] Direct Pollinations audio stream failed:`, streamErr);
      }
      return null;
    }
  };

  // Step 1: Execute primary selected provider
  if (provider === 'gemini') {
    const audioRes = await tryGeminiTts(model || 'gemini-3.1-flash-tts-preview', voice || 'Kore');
    if (audioRes) return audioRes;
    
    // Auto-retry with secondary Gemini TTS model
    if (model !== 'gemini-2.5-flash-preview-tts') {
      const fallbackAudio = await tryGeminiTts('gemini-2.5-flash-preview-tts', 'Kore');
      if (fallbackAudio) return fallbackAudio;
    }
  } else if (provider === 'openai') {
    if (otherApiKey) {
      const audioRes = await tryOpenAiTts(otherApiKey, model, voice);
      if (audioRes) return audioRes;
    }
  } else if (provider === 'pollinations') {
    const audioRes = await tryPollinationsTts(otherApiKey);
    if (audioRes) return audioRes;
  }

  // Step 2: Auto-retry across other available options
  // Try Gemini if an API key is present in environment
  const envGeminiKey = apiKey || process.env.API_KEY || (typeof window !== 'undefined' ? (window as any).GEMINI_API_KEY : '');
  if (envGeminiKey && provider !== 'gemini') {
    const geminiFallback = await tryGeminiTts('gemini-3.1-flash-tts-preview', 'Kore');
    if (geminiFallback) return geminiFallback;
  }

  // Step 3: Zero-cost Pollinations speech audio fallback
  const pollinationsFallback = await tryPollinationsTts(otherApiKey);
  if (pollinationsFallback) return pollinationsFallback;

  throw new Error('Audio generation failed across all available providers.');
};

export const enhancePrompt = async (
  prompt: string,
  apiKey: string | null,
  provider: string = 'gemini',
  otherApiKey?: string,
  model: string = 'gemini-2.5-flash',
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<string> => {
  const systemInstruction = `You are a creative writing assistant. Your task is to take a simple story idea and expand it into a rich, detailed, and engaging prompt for a story generator. 
  Keep the enhanced prompt under 3 sentences but make it evocative and specific. 
  Do not add "Here is an enhanced prompt:" or similar prefixes. Just return the prompt itself.`;

  if (provider === 'gemini') {
    try {
      const ai = getAiClient(apiKey);
      const response = await ai.models.generateContent({
        model: model,
        contents: `Enhance this story idea: "${prompt}"`,
        config: {
          systemInstruction,
        },
      });
      const responseText = response.text;
      return responseText ? responseText.trim() : prompt;
    } catch (geminiErr) {
      console.warn("[Auto-Recovery] Gemini enhancePrompt failed, using Puter/Pollinations fallback:", geminiErr);
      try {
        const resp = await callPuterAiChat(`Enhance this story idea: "${prompt}"`, systemInstruction, 'openai/gpt-5.4-nano');
        if (resp) return resp.trim();
      } catch {}
      return prompt;
    }
  } else if (provider === 'puter') {
    try {
      const resp = await callPuterAiChat(`Enhance this story idea: "${prompt}"`, systemInstruction, model || 'openai/gpt-5.4-nano');
      return resp.trim();
    } catch {
      return prompt;
    }
  } else {
    // OpenAI Compatible Providers
    if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing. Please provide it in Settings.`);
    }
    
    const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
      apiKey: otherApiKey,
      customBaseUrl: options?.customBaseUrl,
      cloudflareAccountId: options?.cloudflareAccountId,
    });

    const openai = getOpenAIClient(effectiveApiKey, baseURL);
    
    // Fallback model if the provided model is not compatible with the provider
    let effectiveModel = model;
    if (provider === 'pollinations' && !['openai', 'openai-fast', 'openai-large', 'qwen-coder', 'mistral', 'deepseek', 'deepseek-v3', 'llama', 'gemini'].includes(model)) {
        effectiveModel = 'openai';
    } else if ((provider === 'others' || provider === 'openai') && model.startsWith('gemini')) {
        effectiveModel = 'gpt-4o-mini';
    }
    
    const completion = await openai.chat.completions.create({
      model: effectiveModel, 
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Enhance this story idea: "${prompt}"` }
      ],
    });

    return completion.choices[0].message.content?.trim() || prompt;
  }
};

export const testApiKey = async (apiKey: string): Promise<{ success: boolean; message: string; }> => {
  if (!apiKey) return { success: false, message: 'API Key cannot be empty.' };
  try {
    const ai = getAiClient(apiKey);
    // A simple, low-cost call to verify the key and model access.
    await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
    return { success: true, message: 'Success! Your API Key is valid.' };
  } catch (error: any) {
    console.error("API Key test failed:", error);
    let userMessage = "An unknown error occurred. Please double-check your API key.";
    const errorMessage = error.toString().toLowerCase();
    const linkText = "You can find or create a key at the Google AI Studio.";

    if (errorMessage.includes('api key not valid')) {
      userMessage = "Invalid API Key. Please ensure you have copied the entire key correctly.";
    } else if (errorMessage.includes('quota') || errorMessage.includes('resource has been exhausted')) {
      userMessage = "You may have exceeded your API quota for the day. Please check your usage in your Google Cloud account.";
    } else if (errorMessage.includes('fetch')) {
      userMessage = "A network error occurred. Please check your internet connection and try again.";
    }
    
    return { 
        success: false, 
        message: `${userMessage} ${linkText}`
    };
  }
};

export const testProviderKey = async (
  provider: string,
  key: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<{ success: boolean; message: string }> => {
  if (provider === 'puter') {
    return { success: true, message: 'Free provider - no API key required!' };
  }
  if (provider === 'pollinations') {
    if (!key || !key.trim()) {
      return { success: true, message: 'Success! 100% Free Public Tier is active (no token required).' };
    }
    const cleanKey = key.replace(/^Bearer\s+/i, '').trim();
    try {
      const openai = getOpenAIClient(cleanKey, 'https://gen.pollinations.ai/v1');
      await openai.chat.completions.create({
        model: 'openai-fast',
        messages: [{ role: 'user', content: 'test connection' }],
        max_tokens: 2,
      });
      return { success: true, message: 'Success! Pollinations.ai Bearer Token is verified and connected.' };
    } catch (err: any) {
      console.error('Pollinations token test error:', err);
      return { 
        success: false, 
        message: `Token test: ${err.message || 'Check your token from enter.pollinations.ai'}` 
      };
    }
  }

  if (provider === 'cloudflare') {
    const accountId = options?.cloudflareAccountId?.trim();
    const cleanKey = key ? key.replace(/^Bearer\s+/i, '').trim() : '';

    if (!cleanKey) {
      return { success: false, message: 'Cloudflare API Token cannot be empty. Create one in Cloudflare Dashboard with "Workers AI:Edit/Read" permissions.' };
    }

    if (!accountId || accountId === 'your-account-id') {
      return {
        success: false,
        message: 'Cloudflare requires your 32-character Account ID. Please enter your Account ID in the field below.',
      };
    }

    try {
      // Step 1: Verify token status using Cloudflare standard token verification
      const verifyRes = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (verifyRes.status === 401 || verifyRes.status === 403) {
        return {
          success: false,
          message: 'Invalid Cloudflare API Token. Please check token permissions in Cloudflare Dashboard.',
        };
      }

      // Step 2: Test Cloudflare Workers AI execution
      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig('cloudflare', {
        apiKey: cleanKey,
        cloudflareAccountId: accountId,
      });
      const openai = getOpenAIClient(effectiveApiKey, baseURL);

      await openai.chat.completions.create({
        model: '@cf/meta/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 2,
      });

      return { success: true, message: 'Success! Cloudflare Workers AI is verified and ready.' };
    } catch (err: any) {
      console.warn('Cloudflare test key issue:', err);
      const msg = err?.message || String(err);
      if (msg.includes('401')) {
        return { success: false, message: 'Cloudflare 401 Unauthorized: Invalid API Token.' };
      } else if (msg.includes('403')) {
        return { success: false, message: 'Cloudflare 403 Forbidden: Ensure token has "Workers AI" permissions for Account ID: ' + accountId };
      } else if (msg.includes('404')) {
        return { success: false, message: 'Cloudflare 404: Account ID not found. Verify your 32-character Account ID.' };
      } else if (msg.includes('429')) {
        return { success: false, message: 'Cloudflare 429: Daily free neuron quota reached.' };
      }
      return {
        success: false,
        message: `Cloudflare connection error: ${msg}. Verify your 32-char Account ID and API Token permissions.`,
      };
    }
  }

  if (!key) return { success: false, message: 'API Key cannot be empty.' };

  if (provider === 'gemini') {
    return testApiKey(key);
  }

  try {
    const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
      apiKey: key,
      customBaseUrl: options?.customBaseUrl,
      cloudflareAccountId: options?.cloudflareAccountId,
    });
    const openai = getOpenAIClient(effectiveApiKey, baseURL);
    
    // Choose a very lightweight model for rapid verification
    let testModel = 'gpt-3.5-turbo';
    if (provider === 'groq') testModel = 'llama-3.1-8b-instant';
    else if (provider === 'inception') testModel = 'mercury-2';
    else if (provider === 'cerebras') testModel = 'llama3.1-8b';
    else if (provider === 'mistral') testModel = 'mistral-small-latest';
    else if (provider === 'cohere') testModel = 'command-r-08-2024';
    else if (provider === 'nvidia') testModel = 'meta/llama-3.1-8b-instruct';
    else if (provider === 'openrouter') testModel = 'meta-llama/llama-3.2-3b-instruct:free';
    else if (provider === 'requesty') testModel = 'meta-llama/llama-3.3-70b';
    else if (provider === 'zai' || provider === 'z_ai' || provider === 'zhipuai') testModel = 'glm-4-flash';
    else if (provider === 'siliconflow') testModel = 'Qwen/Qwen2.5-7B-Instruct';
    else if (provider === 'huggingface') testModel = 'meta-llama/Llama-3.3-70B-Instruct';
    else if (provider === 'openai') testModel = 'gpt-4o-mini';
    else if (provider === 'anthropic') testModel = 'claude-3-haiku-20240307';
    else if (provider === 'deepseek') testModel = 'deepseek-chat';
    else if (provider === 'xai') testModel = 'grok-beta';
    else if (provider === 'together') testModel = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
    else if (provider === 'fireworks') testModel = 'accounts/fireworks/models/llama-v3p3-70b-instruct';
    else if (provider === 'minimax') testModel = 'abab6.5s';
    else if (provider === 'kimi') testModel = 'moonshot-v1-8k';
    else if (provider === 'alibaba') testModel = 'qwen-turbo';
    else if (['llamacpp', 'ollama', 'lmstudio', 'jan', 'vllm', 'sglang', 'localai', 'gpt4all', 'local_openai_proxy'].includes(provider)) testModel = '(loaded model)';
    else if (provider === 'webgpu') return { success: true, message: 'WebGPU runtime is ready in your browser!' };

    await openai.chat.completions.create({
      model: testModel,
      messages: [{ role: 'user', content: 'test connection' }],
      max_tokens: 2,
    });

    return { success: true, message: `Success! ${provider.toUpperCase()} API Key is verified and ready to use.` };
  } catch (err: any) {
    console.error(`Test key failed for ${provider}:`, err);
    return { 
      success: false, 
      message: err.message?.includes('401') 
        ? 'Invalid API Key or unauthorized.' 
        : err.message?.includes('429') 
          ? 'Rate limit reached or quota exceeded.' 
          : `Connection test result: ${err.message || 'Check key and parameters.'}` 
    };
  }
};

const translationResponseSchema = {
  type: "object",
  properties: {
    translatedTitle: { type: "string" },
    translatedSegments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          paragraph: { type: "string" },
          chapterTitle: { type: "string" },
          choices: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["id", "paragraph"]
      }
    }
  },
  required: ["translatedSegments"]
};

export const translateStoryContent = async (
  title: string,
  segments: StorySegment[],
  targetLanguage: string,
  apiKey: string | null,
  provider: string = 'gemini',
  model: string = 'gemini-2.5-flash',
  otherApiKey?: string,
  options?: { customBaseUrl?: string; cloudflareAccountId?: string }
): Promise<{ title: string; segments: StorySegment[] }> => {
  if (!segments || segments.length === 0) {
    return { title, segments: [] };
  }

  const payloadToTranslate = {
    title,
    segments: segments.map(s => ({
      id: s.id,
      chapterTitle: s.chapterTitle || '',
      paragraph: s.paragraph,
      choices: s.choices || []
    }))
  };

  const systemInstruction = `You are an expert literary translator and localization specialist.
Your task is to translate an interactive story into "${targetLanguage}".

Guidelines:
1. Translate the story title and all scene paragraphs into natural, expressive, and atmospheric ${targetLanguage}.
2. Preserve the exact emotional resonance, narrative tension, imagery, and character voices.
3. If chapter titles or branch choices exist, translate them accurately into ${targetLanguage}.
4. Retain all "id" fields exactly as provided so the scenes map 1:1.
5. Return a valid JSON object matching the requested schema.`;

  const userPrompt = `Translate this entire story into ${targetLanguage}:\n\n${JSON.stringify(payloadToTranslate, null, 2)}`;

  return withRetry(async () => {
    let resultJson: any = null;

    if (provider === 'gemini') {
      const ai = getAiClient(apiKey);
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: translationResponseSchema as any,
        },
      });
      const responseText = response.text;
      if (!responseText) throw new Error("Translation returned empty response.");
      resultJson = extractJson(responseText);
    } else if (provider === 'puter') {
      const raw = await callPuterAiChat(userPrompt, systemInstruction, model || 'openai/gpt-5.4-nano');
      resultJson = extractJson(raw);
    } else {
      if (!otherApiKey && provider !== 'pollinations') {
        throw new Error(`API Key for ${provider} is missing. Please provide it in Settings.`);
      }

      const { baseURL, effectiveApiKey } = getOpenAIProviderConfig(provider, {
        apiKey: otherApiKey,
        customBaseUrl: options?.customBaseUrl,
        cloudflareAccountId: options?.cloudflareAccountId,
      });

      const openai = getOpenAIClient(effectiveApiKey, baseURL);
      const completion = await openai.chat.completions.create({
        model: model === 'gemini-2.5-flash' ? 'gpt-3.5-turbo' : model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `${userPrompt}\n\nReturn strictly valid JSON matching the schema.` }
        ],
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('No content returned from AI');
      resultJson = extractJson(content);
    }

    const translatedTitle = resultJson?.translatedTitle || title;
    const translatedList = resultJson?.translatedSegments || [];
    const translatedMap = new Map<string, { paragraph: string; chapterTitle?: string; choices?: string[] }>();
    
    for (const item of translatedList) {
      if (item && item.id) {
        translatedMap.set(item.id, {
          paragraph: item.paragraph || '',
          chapterTitle: item.chapterTitle,
          choices: Array.isArray(item.choices) ? item.choices : undefined
        });
      }
    }

    // Merge translated text with original segments (preserving media, audio, IDs, timestamps)
    const updatedSegments: StorySegment[] = segments.map((seg, idx) => {
      const translated = translatedMap.get(seg.id) || translatedList[idx];
      if (translated) {
        return {
          ...seg,
          paragraph: translated.paragraph || seg.paragraph,
          chapterTitle: translated.chapterTitle || seg.chapterTitle,
          choices: translated.choices || seg.choices,
        };
      }
      return seg;
    });

    return {
      title: translatedTitle,
      segments: updatedSegments
    };
  });
};

/**
 * Suggests creative story starters/topics using free models (Gemini 2.5 Flash / Puter AI / Pollinations / curated smart fallback)
 */
export const suggestTopicsWithFreeModel = async (
  count: number = 5,
  apiKey: string | null = null,
  genre?: string,
  targetAudience?: string
): Promise<Array<{ label: string; genre: any; audience: any; storyLength: 'short'; description?: string }>> => {
  const promptText = `Generate exactly ${count} highly imaginative, captivating story prompts/topics for interactive storytelling.
${genre ? `Preferred genre: ${genre}` : 'Mix diverse genres (fantasy, sci-fi, mystery, adventure, funny, superhero, fairy_tale, bedtime, thriller).' }
${targetAudience ? `Target audience: ${targetAudience}` : 'Mix diverse target audiences (children, teen, adult).' }

Respond with ONLY a valid JSON array of objects matching this exact structure:
[
  {
    "label": "Creative Short Title/Premise (3-6 words)",
    "genre": "fantasy",
    "audience": "children",
    "storyLength": "short",
    "description": "One vivid sentence summarizing the core dilemma or wonder."
  }
]`;

  const systemInstruction = "You are a master creative muse. Generate fresh, diverse, unforgettable story concepts. Return ONLY a valid JSON array without any markdown fences or preamble.";

  // 1. Try Puter AI 100% free model
  try {
    const raw = await callPuterAiChat(promptText, systemInstruction, 'openai/gpt-5.4-nano');
    const parsed = extractJson(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, count).map((s: any) => ({
        label: s.label || 'The Secret Gateway',
        genre: s.genre || 'fantasy',
        audience: s.audience || 'children',
        storyLength: 'short',
        description: s.description || s.label,
      }));
    }
  } catch (e) {
    console.warn("[suggestTopics] Puter AI attempt failed, trying Pollinations tier:", e);
  }

  // 2. Try Gemini 2.5 Flash if available
  const envGeminiKey = apiKey || (typeof process !== 'undefined' ? process.env.API_KEY : '') || (typeof window !== 'undefined' ? (window as any).GEMINI_API_KEY : '');
  if (envGeminiKey) {
    try {
      const ai = getAiClient(envGeminiKey);
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 1.1,
        },
      });
      const parsed = extractJson(res.text || '');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, count).map((s: any) => ({
          label: s.label || 'The Secret Gateway',
          genre: s.genre || 'fantasy',
          audience: s.audience || 'children',
          storyLength: 'short',
          description: s.description || s.label,
        }));
      }
    } catch (e) {
      console.warn("[suggestTopics] Gemini attempt failed, trying Pollinations:", e);
    }
  }

  // 3. Try Pollinations free endpoint
  try {
    const { baseURL } = getOpenAIProviderConfig('pollinations');
    const openai = getOpenAIClient('dummy', baseURL);
    const completion = await openai.chat.completions.create({
      model: 'openai',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: promptText }
      ],
      temperature: 1.1,
    });
    const parsed = extractJson(completion.choices[0]?.message?.content || '');
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, count).map((s: any) => ({
        label: s.label || 'The Secret Gateway',
        genre: s.genre || 'fantasy',
        audience: s.audience || 'children',
        storyLength: 'short',
        description: s.description || s.label,
      }));
    }
  } catch {}

  // 4. Default fallback to dynamic pool
  const { getRandomStarters } = await import('../utils/storyStarters');
  return getRandomStarters(count);
};