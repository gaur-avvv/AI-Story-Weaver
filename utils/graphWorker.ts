// Web Worker for background Knowledge Graph NLP extraction
import { extractTriplesHeuristic } from '../services/graphExtractor';

self.onmessage = (event: MessageEvent) => {
  const { type, paragraph, segmentIndex } = event.data;

  if (type === 'INIT') {
    self.postMessage({ type: 'READY' });
    return;
  }

  if (type === 'PROCESS_TEXT') {
    try {
      const triples = extractTriplesHeuristic(paragraph);
      self.postMessage({
        type: 'RESULT',
        segmentIndex,
        paragraph,
        triples,
      });
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        error: err?.message || 'Failed to extract graph triples',
      });
    }
  }
};
