import type { StorySegment } from '../../types';

/**
 * A single SHEET of the flipbook "story book" (v2 — ancient storybook layout).
 *
 * Page sequence produced by buildBookPages():
 *   [cover, image, text, image, text, ..., backcover]
 *
 * <hic-pageflip> renders sheet 0 (the cover) alone on the right side of the
 * first spread; every following pair of sheets forms one open spread:
 *   spread 1 = [image | text], spread 2 = [image | text], ...
 * so the reader always sees the illustration on the LEFT page and the prose
 * on the RIGHT page, like a classic picture book.
 *
 * Chapter breaks are rendered as an illuminated plaque ON the image page of
 * the segment that starts the chapter (chapterNumber/chapterTitle), which
 * keeps the image|text pairing perfectly aligned with no parity gaps.
 */
export type BookPageKind = 'cover' | 'image' | 'text' | 'backcover';

export interface BookPage {
  kind: BookPageKind;
  /** Cover title (cover pages) */
  title?: string;
  /** Genre • audience line (cover pages) */
  subtitle?: string;
  /** Illustration source (cover / image pages) */
  image?: string;
  /** Story prose (text pages) */
  text?: string;
  /** The story segment this page belongs to (image & text pages) */
  segmentIndex?: number;
  /** Set on an IMAGE page whose segment starts a chapter */
  chapterNumber?: number;
  /** Set on an IMAGE page whose segment starts a chapter */
  chapterTitle?: string;
  /** True on prose pages that continue a segment split across several sheets */
  continuation?: boolean;
}

export interface BuildBookPagesOptions {
  storyTitle?: string;
  genre?: string;
  targetAudience?: string;
  /** Optional generated cover art; falls back to a styled leather cover */
  coverImage?: string;
}

/**
 * Maps the flat StorySegment[] + extracted chapters into an ordered book:
 * [cover, (image, text)*, backcover]
 */
export function buildBookPages(
  segments: StorySegment[],
  options: BuildBookPagesOptions = {}
): BookPage[] {
  return buildBookPagesImpl(segments, options);
}

// Implementation lives in ./buildBookPages.ts to keep this contract file dependency-free.
import { buildBookPages as buildBookPagesImpl } from './buildBookPages';
