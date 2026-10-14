import { StorySegment, GraphNode, GraphEdge, EntityTriple } from '../types';
import { globalStoryGraph } from '../services/storyGraphState';
import { extractTriplesHeuristic } from '../services/graphExtractor';

export interface ParsedCharacter {
  id: string;
  name: string;
  role: 'Protagonist' | 'Companion' | 'Antagonist' | 'Supporting Character';
  description: string;
  mentionCount: number;
  firstSeenScene: number;
  activeScenes: number[];
  currentMood?: string;
  emotionalArc?: string[];
  relationships: {
    targetName: string;
    targetType: string;
    relation: string;
  }[];
  keyItems: string[];
  keyLocations: string[];
  recentSnippet?: string;
}

/**
 * Extracts a concise, narrative-grounded summary sentence for a character
 * based on the sentences in paragraphs where they appear.
 */
function extractNarrativeContextSentence(name: string, segments: StorySegment[]): string {
  const nameRegex = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i');

  for (let i = 0; i < segments.length; i++) {
    const text = segments[i].paragraph;
    if (!text) continue;

    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (nameRegex.test(trimmed) && trimmed.length > 20 && trimmed.length < 220) {
        // Clean up leading conjunctions
        return trimmed.replace(/^(and|but|so|then|meanwhile|suddenly)\s+/i, '');
      }
    }
  }

  return '';
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ensure the globalStoryGraph has ingested all current segments.
 */
export function syncStoryGraphWithSegments(segments: StorySegment[]) {
  if (segments.length === 0) return;

  const currentNodes = globalStoryGraph.getNodes();
  if (currentNodes.length === 0) {
    segments.forEach((seg, idx) => {
      if (seg.paragraph) {
        const triples = extractTriplesHeuristic(seg.paragraph);
        globalStoryGraph.ingestParagraphData(triples, seg.paragraph, idx);
      }
    });
  }
}

/**
 * Parses the story graph and narrative segments to extract characters,
 * their roles, relational connections, and narrative descriptions.
 */
export function parseCharactersFromStoryGraph(segments: StorySegment[]): ParsedCharacter[] {
  syncStoryGraphWithSegments(segments);

  const nodes = globalStoryGraph.getNodes();
  const edges = globalStoryGraph.getEdges();

  // Filter character entities
  const characterNodes = nodes.filter(n => n.type === 'character');

  if (characterNodes.length === 0) {
    return [];
  }

  // Determine protagonist (character with highest mentions appearing in early scenes)
  const sortedByImportance = [...characterNodes].sort((a, b) => {
    const aFirst = a.occurrences[0]?.segmentIndex ?? 999;
    const bFirst = b.occurrences[0]?.segmentIndex ?? 999;
    if (a.mentionCount !== b.mentionCount) {
      return b.mentionCount - a.mentionCount;
    }
    return aFirst - bFirst;
  });

  const protagonistId = sortedByImportance[0]?.id;

  const results: ParsedCharacter[] = characterNodes.map(node => {
    const appearances = node.occurrences.map(o => o.segmentIndex);
    const uniqueScenes = Array.from(new Set(appearances)).sort((a, b) => a - b);
    const firstSeen = uniqueScenes[0] ?? 0;

    // Find all incident edges
    const relatedEdges = edges.filter(e => e.source === node.id || e.target === node.id);

    const relList: ParsedCharacter['relationships'] = [];
    const keyItems: string[] = [];
    const keyLocations: string[] = [];

    relatedEdges.forEach(edge => {
      const isSource = edge.source === node.id;
      const otherId = isSource ? edge.target : edge.source;
      const otherNode = globalStoryGraph.getNodeById(otherId);
      const otherName = otherNode?.name || otherId;
      const otherType = otherNode?.type || 'item';

      if (otherType === 'item' && !keyItems.includes(otherName)) {
        keyItems.push(otherName);
      } else if (otherType === 'location' && !keyLocations.includes(otherName)) {
        keyLocations.push(otherName);
      } else if (otherType === 'character' && otherName !== node.name) {
        const readableRel = edge.relationship.toLowerCase().replace(/_/g, ' ');
        if (!relList.some(r => r.targetName.toLowerCase() === otherName.toLowerCase())) {
          relList.push({
            targetName: otherName,
            targetType: otherType,
            relation: isSource ? readableRel : `connected via ${readableRel}`,
          });
        }
      }
    });

    // Determine Character Role
    let role: ParsedCharacter['role'] = 'Supporting Character';
    if (node.id === protagonistId) {
      role = 'Protagonist';
    } else {
      const hasHostileRelation = relatedEdges.some(e => 
        e.relationship.includes('ENEMY') || 
        e.relationship.includes('ATTACK') || 
        e.relationship.includes('BETRAY') || 
        e.relationship.includes('FIGHT') ||
        e.relationship.includes('CONFRONT') ||
        e.relationship.includes('MONSTER')
      );
      const hasFriendlyRelation = relatedEdges.some(e => 
        e.relationship.includes('ALLY') || 
        e.relationship.includes('FRIEND') || 
        e.relationship.includes('PROTECT') ||
        e.relationship.includes('AID')
      );

      if (hasHostileRelation) {
        role = 'Antagonist';
      } else if (hasFriendlyRelation || node.mentionCount >= 3) {
        role = 'Companion';
      }
    }

    // Synthesize Narrative Context Description
    const narrativeSentence = extractNarrativeContextSentence(node.name, segments);
    const descriptionParts: string[] = [];

    if (narrativeSentence) {
      descriptionParts.push(narrativeSentence);
    } else {
      // Fallback synthetic description based on narrative context
      if (role === 'Protagonist') {
        descriptionParts.push(`Central protagonist navigating the story's main journey.`);
      } else if (role === 'Antagonist') {
        descriptionParts.push(`Key opposing force creating conflict and obstacles.`);
      } else if (role === 'Companion') {
        descriptionParts.push(`Valued companion and ally actively involved in the narrative.`);
      } else {
        descriptionParts.push(`Supporting figure appearing during critical moments.`);
      }
    }

    // Add contextual relational facts if available
    const contextAdditions: string[] = [];
    if (keyItems.length > 0) {
      contextAdditions.push(`Associated with ${keyItems.slice(0, 2).join(' & ')}`);
    }
    if (keyLocations.length > 0) {
      contextAdditions.push(`Active in ${keyLocations.slice(0, 2).join(' & ')}`);
    }
    if (relList.length > 0) {
      const topRel = relList[0];
      contextAdditions.push(`${topRel.relation} ${topRel.targetName}`);
    }

    if (contextAdditions.length > 0) {
      descriptionParts.push(`Notable lore: ${contextAdditions.join(' · ')}.`);
    }

    // Emotional Arc
    const emotionalArc = (node.emotionalTrend || []).map(e => e.sentiment);

    return {
      id: node.id,
      name: node.name,
      role,
      description: descriptionParts.join(' '),
      mentionCount: node.mentionCount,
      firstSeenScene: firstSeen,
      activeScenes: uniqueScenes,
      currentMood: node.currentEmotion || undefined,
      emotionalArc: emotionalArc.length > 0 ? emotionalArc : undefined,
      relationships: relList,
      keyItems,
      keyLocations,
      recentSnippet: node.occurrences[node.occurrences.length - 1]?.snippet,
    };
  });

  // Sort: Protagonist first, then by mention count
  return results.sort((a, b) => {
    if (a.role === 'Protagonist') return -1;
    if (b.role === 'Protagonist') return 1;
    return b.mentionCount - a.mentionCount;
  });
}
