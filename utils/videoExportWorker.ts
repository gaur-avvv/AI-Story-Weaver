// Web Worker for Video Export frame processing and subtitle layout calculation

export interface SubtitleBoxCalculation {
  lineText: string;
  boxWidth: number;
  boxHeight: number;
  boxX: number;
  boxY: number;
  centerX: number;
  centerY: number;
}

export function splitTextIntoLinesWorker(text: string, maxWordsPerLine = 8): string[] {
  if (!text) return [''];
  const sentences = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];
  const lines: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    let currentLine: string[] = [];

    for (const word of words) {
      currentLine.push(word);
      if (currentLine.length >= maxWordsPerLine) {
        lines.push(currentLine.join(' '));
        currentLine = [];
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }
  }

  return lines.length > 0 ? lines : [text];
}

self.onmessage = async function (e: MessageEvent) {
  const { type, payload } = e.data;

  if (type === 'PROCESS_VIDEO_FRAMES') {
    try {
      const { segments, width = 1280, height = 720, transitionEffect = 'kenburns' } = payload;
      const totalSegments = segments.length;

      self.postMessage({ 
        type: 'LOG', 
        step: 'Initializing Worker', 
        message: `Offloaded video frame pipeline to Web Worker (${totalSegments} segments)`,
        progress: 5 
      });

      const processedSegments = [];

      for (let i = 0; i < totalSegments; i++) {
        const seg = segments[i];
        const chapterNum = seg.chapterNumber || (i + 1);
        const chapterTitle = seg.chapterTitle || `Scene ${i + 1}`;
        const lines = splitTextIntoLinesWorker(seg.paragraph || '');

        const startPct = 10 + Math.round((i / totalSegments) * 75);

        self.postMessage({
          type: 'LOG',
          step: 'Processing frames',
          message: `Worker analyzing Chapter ${chapterNum}: "${chapterTitle.substring(0, 30)}..." (${lines.length} subtitle lines)`,
          progress: startPct
        });

        // Calculate Subtitle Layout metrics for each line
        const lineLayouts = lines.map((lineText) => {
          const estimatedCharWidth = 18;
          const textWidth = lineText.length * estimatedCharWidth;
          const boxWidth = Math.min(width - 120, Math.max(300, textWidth + 80));
          const boxHeight = 64;
          const boxX = (width - boxWidth) / 2;
          const boxY = height - boxHeight - 40;

          return {
            lineText,
            boxWidth,
            boxHeight,
            boxX,
            boxY,
            centerX: width / 2,
            centerY: boxY + boxHeight / 2
          };
        });

        // Compute Ken Burns animation matrix keyframes
        const keyframes = [];
        const fps = 30;
        const totalFramesInSeg = Math.max(90, Math.round((seg.durationMs || 5000) / 1000 * fps));

        for (let frameIdx = 0; frameIdx < totalFramesInSeg; frameIdx += 5) {
          const progress = frameIdx / totalFramesInSeg;
          const zoom = 1 + (progress * 0.08);
          const panX = (width - (width * zoom)) / 2 - (progress * 20);
          const panY = (height - (height * zoom)) / 2;

          keyframes.push({ frameIdx, progress, zoom, panX, panY });
        }

        processedSegments.push({
          segmentIndex: i,
          chapterNum,
          chapterTitle,
          lines,
          lineLayouts,
          totalFramesInSeg,
          keyframes
        });

        // Small yield to maintain background worker responsiveness
        await new Promise(r => setTimeout(r, 20));
      }

      self.postMessage({
        type: 'LOG',
        step: 'Syncing audio',
        message: 'Worker frame & subtitle matrix rendering complete',
        progress: 88
      });

      self.postMessage({
        type: 'SUCCESS',
        processedSegments,
        progress: 90
      });

    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        error: err.message || 'Worker frame processing error'
      });
    }
  }
};
