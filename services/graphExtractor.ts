import { EntityTriple, EntityType } from '../types';

/**
 * Fast client-side Heuristic Entity & Triple Extractor
 * Extracts character names, locations, items, and action relations from paragraph text instantly.
 */
export function extractTriplesHeuristic(paragraph: string): EntityTriple[] {
  if (!paragraph || paragraph.trim().length === 0) return [];

  const triples: EntityTriple[] = [];
  
  // Extract Proper Nouns (Capitalized words or phrases)
  const words = paragraph.split(/\s+/);
  const properNouns: { text: string; type: EntityType }[] = [];
  
  // Simple Capitalization Match for Proper Nouns (ignoring start of sentences if not title-case)
  const cleanPara = paragraph.replace(/["'“”]/g, '');
  const matches = cleanPara.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  const commonStopWords = new Set([
    'The', 'A', 'An', 'This', 'That', 'These', 'Those', 'He', 'She', 'They', 'It',
    'In', 'On', 'At', 'To', 'From', 'With', 'By', 'As', 'For', 'When', 'While', 'Then',
    'Suddenly', 'Meanwhile', 'Next', 'Finally', 'Chapter', 'Scene'
  ]);

  const uniqueEntities = new Set<string>();

  matches.forEach(m => {
    const trimmed = m.trim();
    if (trimmed.length > 2 && !commonStopWords.has(trimmed) && !uniqueEntities.has(trimmed.toLowerCase())) {
      uniqueEntities.add(trimmed.toLowerCase());
      
      let type: EntityType = 'character';
      const lower = trimmed.toLowerCase();
      if (/\b(forest|castle|library|room|city|mountain|tower|village|kingdom|island|cave|ocean|hall|valley|sector|station)\b/i.test(lower)) {
        type = 'location';
      } else if (/\b(key|sword|ring|amulet|book|crown|shield|scroll|orb|artifact|map|compass|weapon)\b/i.test(lower)) {
        type = 'item';
      } else if (/\b(guards|guild|order|army|cult|council|clan|empire|rebellion)\b/i.test(lower)) {
        type = 'faction';
      }
      
      properNouns.push({ text: trimmed, type });
    }
  });

  if (properNouns.length === 0) return [];

  const primaryChar = properNouns.find(p => p.type === 'character') || properNouns[0];

  // Derive relationships with other entities
  properNouns.forEach(entity => {
    if (entity.text !== primaryChar.text) {
      let relationship = 'INTERACTS_WITH';
      if (entity.type === 'location') relationship = 'EXPLORES';
      else if (entity.type === 'item') relationship = 'POSSESSES';
      else if (entity.type === 'faction') relationship = 'ENCOUNTERS';

      triples.push({
        source: primaryChar.text,
        sourceType: primaryChar.type,
        relationship,
        target: entity.text,
        targetType: entity.type,
      });
    }
  });

  return triples;
}

/**
 * Extracts triples via structured AI JSON prompt or falls back to heuristic
 */
export async function extractTriplesFromParagraph(
  paragraph: string,
  apiKey?: string | null,
  callAiFn?: (prompt: string, sysPrompt: string) => Promise<string>
): Promise<EntityTriple[]> {
  if (!paragraph || paragraph.trim().length === 0) return [];

  if (callAiFn) {
    try {
      const sysPrompt = `Extract key narrative entities and relationships from the story paragraph.
Return ONLY a valid JSON array of objects with keys:
"source" (string), "sourceType" ("character"|"location"|"item"|"faction"|"event"), "relationship" (string, short UPPERCASE verb e.g. POSSESSES, MARCHES_TO, DISCOVERS, CONFRONTS), "target" (string), "targetType" ("character"|"location"|"item"|"faction"|"event").`;

      const prompt = `Story Paragraph:\n"${paragraph}"`;
      const rawJson = await callAiFn(prompt, sysPrompt);
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => ({
          source: String(item.source || '').trim(),
          sourceType: item.sourceType || 'character',
          relationship: String(item.relationship || 'CONNECTED_TO').toUpperCase().replace(/\s+/g, '_'),
          target: String(item.target || '').trim(),
          targetType: item.targetType || 'item',
        })).filter(t => t.source && t.target);
      }
    } catch (e) {
      console.warn('[Graph Extractor] AI extraction fallback to heuristic:', e);
    }
  }

  return extractTriplesHeuristic(paragraph);
}

/**
 * Fast Heuristic Character Emotional Sentiment Trend Extractor
 */
export function extractEmotionalSentiments(
  paragraph: string, 
  characterNames: string[]
): Array<{ characterName: string; sentiment: string }> {
  if (!paragraph || characterNames.length === 0) return [];

  const lowerPara = paragraph.toLowerCase();
  const results: Array<{ characterName: string; sentiment: string }> = [];

  const sentimentLexicon: Record<string, string[]> = {
    determined: ['determined', 'resolved', 'focused', 'unyielding', 'steadfast', 'vowed', 'decided', 'swore', 'brave', 'courage'],
    fearful: ['terrified', 'fearful', 'panicked', 'scared', 'dread', 'trembling', 'afraid', 'horrified', 'chilled', 'shuddered'],
    hopeful: ['hopeful', 'optimistic', 'inspired', 'encouraged', 'smiled', 'brightened', 'relief', 'relieved', 'comforted'],
    grieving: ['grieving', 'mourned', 'wept', 'cried', 'heartbroken', 'sorrow', 'sad', 'despair', 'lamented'],
    suspicious: ['suspicious', 'wary', 'distrusted', 'doubted', 'hesitated', 'watched closely', 'skeptical', 'guarded'],
    triumphant: ['triumphant', 'victorious', 'cheered', 'exulted', 'proud', 'celebrated', 'conquered', 'mastered'],
    curious: ['curious', 'wondered', 'fascinated', 'investigated', 'peered', 'examined', 'intrigued', 'searched'],
    furious: ['furious', 'enraged', 'angry', 'snarled', 'screamed', 'glared', 'outraged', 'hostile', 'fuming'],
  };

  characterNames.forEach(char => {
    if (lowerPara.includes(char.toLowerCase())) {
      let detectedSentiment = 'neutral';
      for (const [sentimentKey, keywords] of Object.entries(sentimentLexicon)) {
        if (keywords.some(kw => lowerPara.includes(kw))) {
          detectedSentiment = sentimentKey;
          break;
        }
      }
      if (detectedSentiment !== 'neutral') {
        results.push({ characterName: char, sentiment: detectedSentiment });
      }
    }
  });

  return results;
}
