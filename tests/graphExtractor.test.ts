import { describe, it, expect } from 'vitest';
import { extractTriplesHeuristic } from '../services/graphExtractor';

describe('graphExtractor - Heuristic Entity & Relationship Extractor', () => {
  it('extracts character, location, and item triples from narrative text', () => {
    const paragraph = 'Aria cautiously walked into the Obsidian Castle, gripping her silver Sword tightly.';
    const triples = extractTriplesHeuristic(paragraph);

    expect(triples.length).toBeGreaterThan(0);
    
    // Primary character should be Aria
    const ariaTriples = triples.filter(t => t.source === 'Aria');
    expect(ariaTriples.length).toBeGreaterThan(0);

    // Should classify Obsidian Castle as location and Sword as item
    const locationTriple = triples.find(t => t.target.includes('Castle'));
    expect(locationTriple).toBeDefined();
    expect(locationTriple?.targetType).toBe('location');
    expect(locationTriple?.relationship).toBe('EXPLORES');

    const itemTriple = triples.find(t => t.target.includes('Sword'));
    expect(itemTriple).toBeDefined();
    expect(itemTriple?.targetType).toBe('item');
    expect(itemTriple?.relationship).toBe('POSSESSES');
  });

  it('filters out common English sentence-starting stop words', () => {
    const paragraph = 'Suddenly, the hero ventured forth into the dark.';
    const triples = extractTriplesHeuristic(paragraph);

    // 'Suddenly' is in stop words and should not become an entity
    const suddenlyTriple = triples.find(t => t.source === 'Suddenly' || t.target === 'Suddenly');
    expect(suddenlyTriple).toBeUndefined();
  });

  it('handles empty or whitespace-only strings gracefully', () => {
    expect(extractTriplesHeuristic('')).toEqual([]);
    expect(extractTriplesHeuristic('   \n  \t ')).toEqual([]);
  });
});
