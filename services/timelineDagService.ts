import { StorySegment } from '../types';

export interface TimelineNode {
  id: string;
  segmentIndex: number;
  title: string;
  paragraph: string;
  snippet: string;
  choiceTaken?: string;
  availableChoices?: string[];
  parentId: string | null;
  childrenIds: string[];
  isCurrentPath: boolean;
  depth: number;
}

/**
 * Builds a Directed Acyclic Graph (DAG) representation from story segments and choice paths
 */
export function buildTimelineDag(segments: StorySegment[]): TimelineNode[] {
  if (!segments || segments.length === 0) return [];

  const nodes: TimelineNode[] = [];

  segments.forEach((seg, index) => {
    const parentId = index > 0 ? `node_seg_${index - 1}` : null;
    const nodeId = `node_seg_${index}`;
    const nextId = index < segments.length - 1 ? `node_seg_${index + 1}` : null;

    const snippet = seg.paragraph.length > 120 
      ? seg.paragraph.slice(0, 120) + '...' 
      : seg.paragraph;

    nodes.push({
      id: nodeId,
      segmentIndex: index,
      title: seg.chapterTitle || `Scene ${index + 1}`,
      paragraph: seg.paragraph,
      snippet,
      choiceTaken: seg.selectedChoice,
      availableChoices: seg.choices || [],
      parentId,
      childrenIds: nextId ? [nextId] : [],
      isCurrentPath: true,
      depth: index,
    });
  });

  return nodes;
}

/**
 * Escapes text for safe insertion into the exported static HTML document.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Compiles story segments into a standalone interactive HTML reader.
 *
 * Note: the generator only has the single path the reader actually took (unselected
 * choices were never generated), so every choice here intentionally advances to the
 * same next passage rather than pretending to offer distinct, playable branches.
 */
export function exportToTwineHtml(storyTitle: string, segments: StorySegment[]): string {
  const safeTitle = escapeHtml(storyTitle);

  const passages = segments.map((seg, idx) => {
    const isLast = idx === segments.length - 1;
    const nextPassageName = `Scene_${idx + 2}`;

    const choicesHtml = !isLast
      ? `<div class="choice-btn" onclick="showPassage('${nextPassageName}')">Continue to next chapter →</div>`
      : `<div class="the-end">❦ The End ❦</div>`;

    return `
      <div id="Scene_${idx + 1}" class="passage" style="display: ${idx === 0 ? 'block' : 'none'};">
        <div class="chapter-badge">Chapter ${seg.chapterNumber || (idx + 1)}</div>
        <h2>${escapeHtml(seg.chapterTitle || `Scene ${idx + 1}`)}</h2>
        <div class="prose">${escapeHtml(seg.paragraph).replace(/\n\n/g, '</p><p>')}</div>
        <div class="choices-container">
          ${choicesHtml}
        </div>
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Interactive CYOA Story</title>
  <style>
    body {
      background: #090d16;
      color: #f1f5f9;
      font-family: 'Merriweather', Georgia, serif;
      margin: 0;
      padding: 2rem 1rem;
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 720px;
      width: 100%;
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.2);
      border-radius: 1.5rem;
      padding: 2.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .header {
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    h1 {
      color: #c084fc;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 700;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
      font-family: sans-serif;
    }
    .chapter-badge {
      display: inline-block;
      font-family: sans-serif;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #c084fc;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.3);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1rem;
    }
    h2 {
      color: #ffffff;
      margin-top: 0;
      font-size: 1.5rem;
    }
    .prose {
      line-height: 1.8;
      font-size: 1.1rem;
      color: #e2e8f0;
      margin-bottom: 2rem;
    }
    .choices-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 2rem;
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
      padding-top: 1.5rem;
    }
    .choice-btn {
      background: rgba(168, 85, 247, 0.1);
      border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      color: #f1f5f9;
      cursor: pointer;
      font-family: sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .choice-btn:hover {
      background: #9333ea;
      color: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
    }
    .the-end {
      text-align: center;
      color: #c084fc;
      font-size: 1.3rem;
      padding: 1.5rem;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${safeTitle}</h1>
      <div class="subtitle">An Interactive Choose-Your-Own-Adventure Tale</div>
    </div>
    ${passages}
  </div>
  <script>
    function showPassage(id) {
      document.querySelectorAll('.passage').forEach(p => p.style.display = 'none');
      const target = document.getElementById(id);
      if (target) {
        target.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  </script>
</body>
</html>`;
}
