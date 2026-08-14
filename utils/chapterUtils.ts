import { StorySegment, StoryChapter } from '../types';

/**
 * Extracts and calculates structured chapters from a list of segments.
 * If segment 0 has no chapterTitle, it assigns "Chapter 1: The Beginning" by default.
 */
export function extractChapters(segments: StorySegment[]): StoryChapter[] {
  if (!segments || segments.length === 0) return [];

  const chapters: StoryChapter[] = [];
  let currentChapter: StoryChapter | null = null;
  let currentSegmentCount = 0;

  segments.forEach((segment, index) => {
    // A segment starts a new chapter if:
    // 1. It is the very first segment (index 0)
    // 2. OR it has a distinct chapterTitle defined
    const hasExplicitChapter = Boolean(segment.chapterTitle && segment.chapterTitle.trim().length > 0);
    const isFirstSegment = index === 0;

    if (isFirstSegment || hasExplicitChapter) {
      if (currentChapter) {
        currentChapter.segmentCount = currentSegmentCount;
        chapters.push(currentChapter);
      }

      const chapterNumber = chapters.length + 1;
      const defaultTitle = isFirstSegment ? 'Chapter 1: The Journey Begins' : `Chapter ${chapterNumber}`;
      const title = segment.chapterTitle?.trim() || defaultTitle;

      currentChapter = {
        id: `chap-${index}-${Date.now()}`,
        chapterNumber,
        title,
        startIndex: index,
        segmentCount: 0,
      };
      currentSegmentCount = 0;
    }

    currentSegmentCount++;
  });

  if (currentChapter) {
    currentChapter.segmentCount = currentSegmentCount;
    chapters.push(currentChapter);
  }

  return chapters;
}

/**
 * Assigns a chapter title to a specific segment index, starting a new chapter there.
 */
export function setChapterAtSegment(
  segments: StorySegment[],
  segmentIndex: number,
  title: string
): StorySegment[] {
  return segments.map((seg, idx) => {
    if (idx === segmentIndex) {
      return {
        ...seg,
        chapterTitle: title.trim(),
      };
    }
    return seg;
  });
}

/**
 * Removes the chapter breakpoint from a segment (merges it with the preceding chapter).
 */
export function removeChapterAtSegment(
  segments: StorySegment[],
  segmentIndex: number
): StorySegment[] {
  if (segmentIndex === 0) {
    // If it's the first segment, reset to default title instead of deleting
    return segments.map((seg, idx) => {
      if (idx === 0) {
        return { ...seg, chapterTitle: 'Chapter 1: The Journey Begins' };
      }
      return seg;
    });
  }

  return segments.map((seg, idx) => {
    if (idx === segmentIndex) {
      const copy = { ...seg };
      delete copy.chapterTitle;
      delete copy.chapterNumber;
      return copy;
    }
    return seg;
  });
}

/**
 * Computes word count and reading time for a chapter's segments.
 */
export function getChapterStats(segments: StorySegment[], chapter: StoryChapter) {
  const chapterSegments = segments.slice(chapter.startIndex, chapter.startIndex + chapter.segmentCount);
  const totalWords = chapterSegments.reduce((acc, seg) => {
    return acc + (seg.paragraph ? seg.paragraph.trim().split(/\s+/).length : 0);
  }, 0);

  // Average reading speed: 200 words per minute
  const readingMinutes = Math.max(1, Math.ceil(totalWords / 200));

  return {
    totalWords,
    readingMinutes,
    sceneCount: chapterSegments.length,
    hasIllustrations: chapterSegments.filter(s => !!s.imageUrl).length,
  };
}

/**
 * Auto-generates named chapters by dividing long stories and creating creative chapter titles.
 */
export function autoOrganizeChapters(
  segments: StorySegment[],
  storyTitle: string,
  genre: string = 'Fantasy'
): StorySegment[] {
  if (segments.length === 0) return segments;

  // For stories with 1-3 segments, 1 chapter is great.
  // For longer stories, place a chapter every 2-3 segments.
  const interval = segments.length > 8 ? 3 : 2;

  const thematicTitles: { [key: string]: string[] } = {
    fantasy: [
      'The Whispering Woods',
      'Secrets of the Ancient Runes',
      'The Crystal Citadel',
      'Shadows in the Sky',
      'The Enchanted Dawn',
      'Trials of the Arcane',
    ],
    'sci-fi': [
      'Signals from the Void',
      'The Hyperdrive Breach',
      'Cybernetic Horizon',
      'Echoes of the Nebula',
      'The Quantum Core',
      'Starlight Reckoning',
    ],
    mystery: [
      'The Missing Artifact',
      'Footprints in the Fog',
      'The Cryptic Key',
      'A Shadowed Alibi',
      'The Midnight Revelation',
      'Truth Unveiled',
    ],
    adventure: [
      'Setting Sail',
      'The Treacherous Crossing',
      'Into the Forgotten Temple',
      'The Golden Horizon',
      'Against the Raging Tide',
      'Triumphant Return',
    ],
    bedtime: [
      'Twilight Settles In',
      'Moonbeams and Starlight',
      'The Pillow Cloud Kingdom',
      'Lullaby of the Stars',
      'Peaceful Slumber',
    ],
  };

  const selectedList = thematicTitles[genre.toLowerCase()] || thematicTitles.fantasy;

  return segments.map((seg, idx) => {
    if (idx === 0) {
      const firstTitle = `Chapter 1: ${selectedList[0] || 'The Beginning'}`;
      return { ...seg, chapterTitle: firstTitle };
    }

    if (idx % interval === 0) {
      const chapterIdx = Math.floor(idx / interval);
      const titleName = selectedList[chapterIdx % selectedList.length] || `The Unfolding Story Part ${chapterIdx + 1}`;
      const newTitle = `Chapter ${chapterIdx + 1}: ${titleName}`;
      return { ...seg, chapterTitle: newTitle };
    }

    // Otherwise clear any old mid-chapter marker unless user explicitly modified it
    const copy = { ...seg };
    if (!seg.chapterTitle) {
      delete copy.chapterTitle;
    }
    return copy;
  });
}
