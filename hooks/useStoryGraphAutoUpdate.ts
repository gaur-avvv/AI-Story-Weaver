import { useEffect, useRef } from 'react';
import { StorySegment } from '../types';
import { globalStoryGraph } from '../services/storyGraphState';
import { extractTriplesHeuristic, extractEmotionalSentiments } from '../services/graphExtractor';

/**
 * Custom React hook that automatically updates the Knowledge Graph
 * (entities, relationship connections, character emotional sentiment trends)
 * whenever story segments or chapters are generated or regenerated.
 */
export function useStoryGraphAutoUpdate(segments: StorySegment[], isGenerating: boolean) {
  const prevSegmentsLengthRef = useRef<number>(0);
  const prevFingerprintRef = useRef<string>('');

  useEffect(() => {
    if (isGenerating || segments.length === 0) return;

    const currentFingerprint = segments.map(s => `${s.id}:${s.paragraph.slice(0, 30)}`).join('|');

    // Trigger update if segments count changed or if content changed (e.g. regeneration)
    if (
      segments.length !== prevSegmentsLengthRef.current ||
      currentFingerprint !== prevFingerprintRef.current
    ) {
      // Re-ingest segments into global story graph
      segments.forEach((segment, index) => {
        if (!segment.paragraph) return;

        // Extract entity triples & connections
        const triples = extractTriplesHeuristic(segment.paragraph);
        globalStoryGraph.ingestParagraphData(triples, segment.paragraph, index);

        // Extract character emotional sentiment trends
        const charNodes = globalStoryGraph.getNodes().filter(n => n.type === 'character');
        const charNames = charNodes.map(c => c.name);
        if (charNames.length > 0) {
          const sentiments = extractEmotionalSentiments(segment.paragraph, charNames);
          sentiments.forEach(s => {
            globalStoryGraph.recordCharacterSentiment(s.characterName, s.sentiment, index);
          });
        }
      });

      prevSegmentsLengthRef.current = segments.length;
      prevFingerprintRef.current = currentFingerprint;
    }
  }, [segments, isGenerating]);
}
