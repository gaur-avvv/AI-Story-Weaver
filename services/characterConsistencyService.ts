export interface CharacterVisualSignature {
  characterName: string;
  genderOrArchetype: string;
  hairStyleAndColor: string;
  distinctiveAttire: string;
  keyAccessories: string;
  colorPalette: string[];
  seed: number;
}

// Deterministic simple hash function from string to 32-bit integer
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Curated visual asset tables
const HAIR_STYLES = [
  'braided chestnut hair with amber highlights',
  'raven-black hair tied in a practical warrior knot',
  'flowing golden-blonde locks framing the face',
  'silver-white cropped hair with sharp bangs',
  'crimson-auburn wavy hair flowing over shoulders',
  'deep copper curls braided with leather cord',
  'midnight-blue swept-back hair with side undercut',
];

const ATTIRE_BY_GENRE: Record<string, string[]> = {
  fantasy: [
    'tailored emerald tunic with silver filigree and leather bracers',
    'hooded velvet cloak over fine leather riding gear',
    'adventurer gambeson with engraved brass buckles and linen shirt',
    'scholarly sapphire robe with starry hem and bronze clasps',
    'burnished plate-mail shoulders over reinforced dark wool coat',
  ],
  'sci-fi': [
    'sleek matte-white environmental suit with luminescent blue seams',
    'carbon-fiber tactical jacket with holographic collar display',
    'reinforced pilot flightsuit with titanium mesh trim',
    'deep-space explorer coat with glowing biometric patches',
  ],
  cyberpunk: [
    'neon-accented translucent waterproof duster with chrome zips',
    'armored streetwear vest over glowing synth-fiber hoodie',
    'asymmetric high-collar jacket with fiber-optic wiring',
  ],
  default: [
    'signature tailored traveler coat with brass buttons',
    'woven linen tunic with patterned hem and rugged traveler belt',
  ],
};

const ACCESSORIES = [
  'carved silver pendant amulet',
  'leather band with an etched runic stone',
  'fine gold circlet with a sapphire inlay',
  'fingerless leather gloves with brass rivets',
  'braided talisman necklace of polished river glass',
  'twin ornate daggers strapped to the hip',
];

export class CharacterConsistencyManager {
  private signatures: Map<string, CharacterVisualSignature> = new Map();

  public getOrCreateSignature(characterName: string, genre: string = 'fantasy'): CharacterVisualSignature {
    const key = characterName.trim().toLowerCase();
    if (this.signatures.has(key)) {
      return this.signatures.get(key)!;
    }

    const hash = hashString(key);
    const attirePool = ATTIRE_BY_GENRE[genre] || ATTIRE_BY_GENRE.default;

    const signature: CharacterVisualSignature = {
      characterName: characterName.trim(),
      genderOrArchetype: /queen|princess|girl|lady|witch|mother|sister|maiden|daughter|madam|woman/i.test(key) ? 'female' : 'male_or_neutral',
      hairStyleAndColor: HAIR_STYLES[hash % HAIR_STYLES.length],
      distinctiveAttire: attirePool[(hash >> 2) % attirePool.length],
      keyAccessories: ACCESSORIES[(hash >> 4) % ACCESSORIES.length],
      colorPalette: ['#a855f7', '#3b82f6', '#10b981'],
      seed: 100000 + (hash % 899999),
    };

    this.signatures.set(key, signature);
    return signature;
  }

  public getAnchorPrompt(characterName: string, genre: string = 'fantasy'): string {
    const sig = this.getOrCreateSignature(characterName, genre);
    return `[Character Anchor: ${sig.characterName} — ${sig.hairStyleAndColor}, wearing ${sig.distinctiveAttire}, featuring ${sig.keyAccessories}, consistent visual DNA]`;
  }

  public injectAnchorsIntoScenePrompt(
    basePrompt: string,
    paragraph: string,
    knownCharacters: string[],
    genre: string = 'fantasy'
  ): string {
    if (!paragraph || knownCharacters.length === 0) return basePrompt;

    const lowerPara = paragraph.toLowerCase();
    const mentionedCharacters = knownCharacters.filter(c => 
      c.length > 2 && lowerPara.includes(c.toLowerCase())
    );

    if (mentionedCharacters.length === 0) return basePrompt;

    // Build anchor strings for up to 2 primary characters in the scene
    const anchors = mentionedCharacters
      .slice(0, 2)
      .map(c => this.getAnchorPrompt(c, genre))
      .join(' ');

    return `${basePrompt} | Visual Consistency Directives: ${anchors}`;
  }

  public clear() {
    this.signatures.clear();
  }
}

export const globalCharacterConsistency = new CharacterConsistencyManager();
