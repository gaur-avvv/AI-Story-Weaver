import { describe, it, expect, beforeEach } from 'vitest';
import { CharacterConsistencyManager } from '../services/characterConsistencyService';

describe('characterConsistencyService - Visual DNA & Seed Anchoring', () => {
  let manager: CharacterConsistencyManager;

  beforeEach(() => {
    manager = new CharacterConsistencyManager();
  });

  it('generates consistent and deterministic visual signatures for the same character', () => {
    const sig1 = manager.getOrCreateSignature('Elena', 'fantasy');
    const sig2 = manager.getOrCreateSignature('Elena', 'fantasy');

    expect(sig1.characterName).toBe('Elena');
    expect(sig1.seed).toBe(sig2.seed);
    expect(sig1.hairStyleAndColor).toBe(sig2.hairStyleAndColor);
    expect(sig1.distinctiveAttire).toBe(sig2.distinctiveAttire);
  });

  it('generates different visual signatures for different characters', () => {
    const elena = manager.getOrCreateSignature('Elena', 'fantasy');
    const marcus = manager.getOrCreateSignature('Marcus', 'fantasy');

    expect(elena.characterName).toBe('Elena');
    expect(marcus.characterName).toBe('Marcus');
    expect(elena.seed).not.toBe(marcus.seed);
  });

  it('injects visual consistency directives into scene prompts when character is mentioned', () => {
    const basePrompt = 'Illustration of a dark cave with glowing crystals.';
    const paragraph = 'Elena approached the altar cautiously, holding her torch high.';
    const knownCharacters = ['Elena', 'Marcus'];

    const enhanced = manager.injectAnchorsIntoScenePrompt(basePrompt, paragraph, knownCharacters, 'fantasy');

    expect(enhanced).toContain('Visual Consistency Directives');
    expect(enhanced).toContain('Elena');
    expect(enhanced).toContain('Character Anchor: Elena');
    // Marcus is not in paragraph, should not be injected
    expect(enhanced).not.toContain('Marcus');
  });

  it('leaves prompt untouched if no known characters are present in the paragraph', () => {
    const basePrompt = 'A vast empty desert at twilight.';
    const paragraph = 'The wind swept across the barren dunes.';
    const knownCharacters = ['Elena', 'Marcus'];

    const result = manager.injectAnchorsIntoScenePrompt(basePrompt, paragraph, knownCharacters, 'fantasy');
    expect(result).toBe(basePrompt);
  });
});
