import type { BookPage, BuildBookPagesOptions } from './bookTypes';
import type { StorySegment } from '../../types';
import { extractChapters } from '../../utils/chapterUtils';

/**
 * Maximum characters of prose per text sheet, tuned for the default 900x675
 * page (17px Merriweather, 1.75 line-height ≈ 17 usable lines). Deliberately
 * conservative so nothing clips even when the reader picks a larger font.
 */
const CHARS_PER_TEXT_PAGE = 1350;

/**
 * Splits a long paragraph into page-sized chunks, preferring sentence
 * boundaries and falling back to word boundaries. Whitespace is normalised
 * first because the sheets justify their text anyway.
 */
function splitProseIntoPages(paragraph: string): string[] {
  const text = paragraph.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  if (text.length <= CHARS_PER_TEXT_PAGE) return [text];

  const pages: string[] = [];
  let rest = text;
  while (rest.length > CHARS_PER_TEXT_PAGE) {
    const window = rest.slice(0, CHARS_PER_TEXT_PAGE);

    // Prefer the last sentence end in the back half of the budget…
    let cut = -1;
    for (let i = window.length - 2; i >= Math.floor(CHARS_PER_TEXT_PAGE * 0.5); i--) {
      const ch = window[i];
      if ((ch === '.' || ch === '!' || ch === '?') && window[i + 1] === ' ') {
        cut = i + 1;
        break;
      }
    }
    // …otherwise break at a word boundary.
    if (cut < 0) {
      cut = window.lastIndexOf(' ');
      if (cut <= 0) cut = CHARS_PER_TEXT_PAGE;
    }

    pages.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length > 0) pages.push(rest);
  return pages;
}

/**
 * Maps the flat StorySegment[] + extracted chapters into the ordered v2
 * "ancient storybook" sheet sequence:
 *
 *   [cover, image, text, image, text, ..., backcover]
 *
 * Every segment's prose is paginated with splitProseIntoPages(); each chunk
 * gets its own [image | text] spread (the illustration repeats on continuation
 * spreads, like a picture book), so the strict image-left / text-right pairing
 * never breaks and narration sync can target any chunk.
 *
 * The image page is ALWAYS emitted for every chunk (even without art — the
 * component renders an ornament fallback), with chapter plaque fields attached
 * only to the first spread of a segment that starts a chapter. A backcover
 * sheet closes the book so the final spread parity works out as: cover alone
 * on the right, then [image | text] pairs, and the backcover alone on the left
 * of the last spread when left over.
 *
 * NOTE: bookTypes.ts re-exports this function at runtime, so every import from
 * './bookTypes' here MUST be type-only (`import type`). Type-only imports are
 * erased at compile time, which avoids a runtime circular dependency.
 */
export function buildBookPages(
  segments: StorySegment[],
  options: BuildBookPagesOptions = {}
): BookPage[] {
  const pages: BookPage[] = [];

  // Cover sheet.
  const subtitle = [options.genre, options.targetAudience].filter(Boolean).join(' • ');
  pages.push({
    kind: 'cover',
    title: options.storyTitle || 'Novella Story',
    subtitle: subtitle || undefined,
    image: options.coverImage,
  });

  if (!segments || segments.length === 0) {
    pages.push({ kind: 'backcover' });
    return pages;
  }

  // Reuse the app's chapter extraction logic so the book's chapter plaques
  // match the outline / chapter views exactly (chapterNumber, title, startIndex).
  const chapters = extractChapters(segments);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const chapterStart = chapters.find((c) => c.startIndex === i);
    const chunks = splitProseIntoPages(segment.paragraph ?? '');

    // Image-less segment with no prose at all: a single plate page keeps the
    // pairing intact without inventing empty text pages.
    if (chunks.length === 0) {
      const imagePage: BookPage = {
        kind: 'image',
        image: segment.imageUrl,
        segmentIndex: i,
      };
      if (chapterStart) {
        imagePage.chapterNumber = chapterStart.chapterNumber;
        imagePage.chapterTitle = chapterStart.title;
      }
      pages.push(imagePage);
      continue;
    }

    chunks.forEach((chunk, chunkIndex) => {
      const imagePage: BookPage = {
        kind: 'image',
        // The illustration repeats on continuation spreads — like a picture
        // book — so every spread stays [image | text].
        image: segment.imageUrl,
        segmentIndex: i,
      };
      if (chapterStart && chunkIndex === 0) {
        imagePage.chapterNumber = chapterStart.chapterNumber;
        imagePage.chapterTitle = chapterStart.title;
      }
      pages.push(imagePage);

      pages.push({
        kind: 'text',
        text: chunk,
        segmentIndex: i,
        continuation: chunkIndex > 0,
      });
    });
  }

  // Back cover sheet closes the book.
  pages.push({ kind: 'backcover' });

  return pages;
}

