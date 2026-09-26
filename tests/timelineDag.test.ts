import { describe, it, expect } from 'vitest';
import { buildTimelineDag, exportToTwineHtml } from '../services/timelineDagService';
import { StorySegment } from '../types';

describe('timelineDagService - CYOA Branching DAG & Twine Export', () => {
  const mockSegments: StorySegment[] = [
    {
      id: 'seg_1',
      paragraph: 'Elena entered the dark forest, her torch flickering.',
      chapterTitle: 'Into the Forest',
      chapterNumber: 1,
      choices: ['Take the high mountain path', 'Follow the subterranean stream'],
      selectedChoice: 'Follow the subterranean stream',
    },
    {
      id: 'seg_2',
      paragraph: 'The stream led her to an ancient underground archway.',
      chapterTitle: 'The Sunken Arch',
      chapterNumber: 2,
      choices: ['Inspect the runes', 'Light another torch'],
      selectedChoice: 'Inspect the runes',
    }
  ];

  it('builds DAG nodes from story segments with parent-child connections', () => {
    const dag = buildTimelineDag(mockSegments);

    expect(dag.length).toBe(2);
    expect(dag[0].id).toBe('node_seg_0');
    expect(dag[0].parentId).toBeNull();
    expect(dag[0].childrenIds).toEqual(['node_seg_1']);

    expect(dag[1].id).toBe('node_seg_1');
    expect(dag[1].parentId).toBe('node_seg_0');
    expect(dag[1].choiceTaken).toBe('Inspect the runes');
  });

  it('handles empty segments list gracefully', () => {
    expect(buildTimelineDag([])).toEqual([]);
  });

  it('exports standalone valid Twine HTML game package', () => {
    const html = exportToTwineHtml('The Crystal Spire', mockSegments);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('The Crystal Spire');
    expect(html).toContain('Elena entered the dark forest');
    expect(html).toContain('The stream led her');
    expect(html).toContain('showPassage');
  });
});
