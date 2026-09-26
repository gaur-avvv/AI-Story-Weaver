import { describe, it, expect, beforeEach } from 'vitest';
import { StoryGraphState } from '../services/storyGraphState';
import { EntityTriple } from '../types';

describe('StoryGraphState - Narrative Continuity & Knowledge Graph', () => {
  let graph: StoryGraphState;

  beforeEach(() => {
    graph = new StoryGraphState();
  });

  it('correctly ingests entities and relationships from triples', () => {
    const triples: EntityTriple[] = [
      {
        source: 'Elena',
        sourceType: 'character',
        relationship: 'EXPLORES',
        target: 'Sunken Citadel',
        targetType: 'location',
      },
      {
        source: 'Elena',
        sourceType: 'character',
        relationship: 'POSSESSES',
        target: 'Obsidian Blade',
        targetType: 'item',
      }
    ];

    graph.ingestParagraphData(triples, 'Elena explores the ancient Sunken Citadel with her Obsidian Blade.', 0);

    const nodes = graph.getNodes();
    expect(nodes.length).toBe(3);

    const elena = graph.getNodeById('elena');
    expect(elena).toBeDefined();
    expect(elena?.name).toBe('Elena');
    expect(elena?.type).toBe('character');
    expect(elena?.mentionCount).toBe(2);

    const edges = graph.getEdges();
    expect(edges.length).toBe(2);
    expect(edges.some(e => e.relationship === 'EXPLORES')).toBe(true);
    expect(edges.some(e => e.relationship === 'POSSESSES')).toBe(true);
  });

  it('records character emotional sentiment transitions over scenes', () => {
    graph.recordCharacterSentiment('Elena', 'hopeful', 0);
    graph.recordCharacterSentiment('Elena', 'apprehensive', 1);
    graph.recordCharacterSentiment('Elena', 'resolute', 2);

    const elena = graph.getNodeById('elena');
    expect(elena).toBeDefined();
    expect(elena?.currentEmotion).toBe('resolute');
    expect(elena?.emotionalTrend?.length).toBe(3);
    expect(elena?.emotionalTrend?.[0].sentiment).toBe('hopeful');
    expect(elena?.emotionalTrend?.[2].sentiment).toBe('resolute');

    expect(graph.getDominantSentiment()).toBe('resolute');
  });

  it('detects item possession conflicts in narrative consistency audit', () => {
    const scene1Triples: EntityTriple[] = [
      { source: 'Marcus', sourceType: 'character', relationship: 'POSSESSES', target: 'Amulet of Dawn', targetType: 'item' }
    ];
    graph.ingestParagraphData(scene1Triples, 'Marcus holds the Amulet of Dawn tightly.', 0);

    const scene2Triples: EntityTriple[] = [
      { source: 'Cassian', sourceType: 'character', relationship: 'WIELDS', target: 'Amulet of Dawn', targetType: 'item' }
    ];
    graph.ingestParagraphData(scene2Triples, 'Cassian wields the Amulet of Dawn against the darkness.', 1);

    const audit = graph.getInconsistencyAudit();
    expect(audit).toContain('Amulet of Dawn');
    expect(audit).toContain('multiple characters');
  });

  it('detects sensitive status events (e.g. killed, captured)', () => {
    const triples: EntityTriple[] = [
      { source: 'Shadow King', sourceType: 'character', relationship: 'CAPTURED', target: 'Lyra', targetType: 'character' }
    ];
    graph.ingestParagraphData(triples, 'The Shadow King captured Lyra in the dark dungeon.', 0);

    const audit = graph.getInconsistencyAudit();
    expect(audit).toContain('Lyra');
    expect(audit).toContain('captured');
  });

  it('detects shifting allegiances (ally vs enemy contradiction)', () => {
    const scene1: EntityTriple[] = [
      { source: 'Rowan', sourceType: 'character', relationship: 'ALLIED_WITH', target: 'Elena', targetType: 'character' }
    ];
    graph.ingestParagraphData(scene1, 'Rowan stood as an ally to Elena.', 0);

    const scene2: EntityTriple[] = [
      { source: 'Rowan', sourceType: 'character', relationship: 'BETRAYED_AND_ATTACKED', target: 'Elena', targetType: 'character' }
    ];
    graph.ingestParagraphData(scene2, 'Rowan attacked Elena in the shadows.', 1);

    const audit = graph.getInconsistencyAudit();
    expect(audit).toContain('Rowan');
    expect(audit).toContain('shifting allegiance');
  });

  it('builds comprehensive lore context for LLM prompt injection', () => {
    const triples: EntityTriple[] = [
      { source: 'Elena', sourceType: 'character', relationship: 'EXPLORES', target: 'Whispering Woods', targetType: 'location' },
      { source: 'Elena', sourceType: 'character', relationship: 'POSSESSES', target: 'Crystal Staff', targetType: 'item' },
    ];
    graph.ingestParagraphData(triples, 'Elena explores the Whispering Woods with her Crystal Staff.', 0);
    graph.recordCharacterSentiment('Elena', 'determined', 0);

    const promptContext = graph.getLoreContextForPrompt();
    expect(promptContext).toContain('Elena');
    expect(promptContext).toContain('Whispering Woods');
    expect(promptContext).toContain('Crystal Staff');
    expect(promptContext).toContain('determined');
  });

  it('reports no contradictions for a clean story, while still surfacing informational guidance', () => {
    const triples: EntityTriple[] = [
      { source: 'Elena', sourceType: 'character', relationship: 'EXPLORES', target: 'Whispering Woods', targetType: 'location' },
    ];
    graph.ingestParagraphData(triples, 'Elena explores the Whispering Woods.', 0);

    const audit = graph.getInconsistencyAudit();
    // Regression guard: a clean story must not produce a "-" bulleted contradiction line
    // (the modal counts those as blocking findings), only "*" informational guidance.
    const contradictionLines = audit.split('\n').filter(l => l.trim().startsWith('-'));
    expect(contradictionLines).toHaveLength(0);
    expect(audit).toContain('Elena');
  });
});
