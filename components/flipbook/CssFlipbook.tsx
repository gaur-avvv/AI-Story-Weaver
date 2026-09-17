import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BookPage } from './bookTypes';
import { CornerAffordance, type CornerId } from './CornerAffordance';
import { playPageTurnSound } from '../../utils/pageTurnSound';

export interface CssFlipbookProps {
  pages: BookPage[];
  fontFamilyPreference?: string;
  fontSize?: number;
  title?: string;
  activeSegmentIndex?: number;
  /** True while narration audio is actually playing (drives page-follow). */
  isNarrating?: boolean;
  /** When true the flipbook fills its parent: no max-width card, the
   *  open-book area flex-grows, and floating arrows + a bottom seek bar
   *  replace the standard controls row. */
  fill?: boolean;
}

const INK = '#3b2f1e';
const GOLD = '#d4af37';
const GOLD_INK = '#8a6a2f';
const HEADING_FONT = "'Cinzel', serif";
const DEFAULT_BODY_FONT = "'Merriweather', 'Lora', Georgia, serif";

/* ------------------------------------------------------------------ */
/* Ancient storybook theme constants                                   */
/* ------------------------------------------------------------------ */

/** Parchment stock shared by every paper page. */
const PARCHMENT_STYLE: CSSProperties = {
  backgroundColor: '#f3e9d2',
  backgroundImage:
    'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(120,90,40,0.18) 100%), ' +
    'repeating-linear-gradient(0deg, rgba(160,130,80,0.05) 0px, rgba(160,130,80,0.05) 1px, transparent 1px, transparent 3px)',
  boxShadow: 'inset 0 0 60px rgba(120,80,20,0.25)',
};

const LEATHER_STYLE: CSSProperties = {
  background: 'linear-gradient(135deg,#3b2a1a,#5a3d22 45%,#2a1c10)',
};

/** Maps the app's `fontFamilyPreference` values to explicit serif-first stacks. */
const FONT_STACKS: Record<string, string> = {
  serif: "'Merriweather', 'Lora', Georgia, serif",
  sans: "'Inter', 'Outfit', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  cinzel: "'Cinzel', 'Times New Roman', serif",
  merriweather: "'Merriweather', 'Lora', Georgia, serif",
  lora: "'Lora', 'Merriweather', Georgia, serif",
  outfit: "'Outfit', 'Inter', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  fantasy: "'Cinzel', Georgia, serif",
  handwriting: "'Dancing Script', 'Segoe Script', cursive",
};

/** Chapter titles often arrive as "Chapter 3: The Whispering Woods"; the
 * plaque already shows "CHAPTER N", so strip a duplicated prefix. */
function stripChapterPrefix(rawTitle?: string): string {
  const raw = rawTitle ?? '';
  return raw.replace(/^chapter\s*\d+\s*[:.\-\u2013\u2014]*\s*/i, '').trim() || raw;
}

/* ------------------------------------------------------------------ */
/* Page renderers                                                      */
/* ------------------------------------------------------------------ */

/** The empty panel on the left of spread 1 — the inside of the front cover. */
function InsideCoverPanel() {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-4"
      style={{ ...PARCHMENT_STYLE, backgroundColor: '#e9dcc0' }}
    >
      <span
        className="select-none"
        style={{ color: 'rgba(176,141,62,0.4)', fontSize: 56, lineHeight: 1 }}
        aria-hidden="true"
      >
        ❦
      </span>
      <span
        className="italic select-none"
        style={{
          fontFamily: HEADING_FONT,
          color: 'rgba(122,95,45,0.55)',
          fontSize: 12,
          letterSpacing: '0.3em',
        }}
      >
        Ex Libris
      </span>
    </div>
  );
}

/** Leather-bound front cover with gold foil title. */
function CoverPage({ page }: { page: BookPage }) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={LEATHER_STYLE}>
      {page.image ? (
        <>
          <img
            src={page.image}
            alt={`Cover art for ${page.title ?? 'the story'}`}
            className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)] rounded border-4 border-[#2a1c10] object-cover"
          />
          {/* Dark scrim so the gold title stays legible over the art. */}
          <div
            className="absolute inset-6 rounded border-4 border-[#2a1c10] bg-black/40"
            aria-hidden="true"
          />
        </>
      ) : null}

      {/* Double gold inner borders. */}
      <div
        className="pointer-events-none absolute inset-3 rounded-sm border-[3px] border-[#d4af37]/55"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-5 rounded-sm border border-[#d4af37]/40"
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-5 px-8 text-center">
        <h2
          className="bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-3xl font-bold leading-tight text-transparent md:text-4xl"
          style={{ fontFamily: HEADING_FONT }}
        >
          {page.title ?? 'Novella Story'}
        </h2>
        <span className="text-2xl" style={{ color: GOLD }} aria-hidden="true">
          ❦
        </span>
        {page.subtitle ? (
          <p
            className="text-[11px] text-[#e8d9a8] md:text-xs"
            style={{ fontVariant: 'small-caps', letterSpacing: '0.3em' }}
          >
            {page.subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Illuminated chapter plaque, shown on the image page of a chapter opener. */
function ChapterPlaque({ page }: { page: BookPage }) {
  if (page.chapterNumber == null) return null;
  return (
    <div className="absolute left-1/2 top-7 z-10 w-max max-w-[85%] -translate-x-1/2 px-2">
      <div className="rounded border-2 border-[#8a6a2f] bg-[#f7efdc] px-6 py-2 text-center shadow-[0_4px_14px_rgba(60,40,10,0.35)]">
        <span
          className="block text-[11px] text-[#8a6a2f]"
          style={{ fontVariant: 'small-caps', letterSpacing: '0.35em' }}
        >
          Chapter {page.chapterNumber}
        </span>
        <span
          className="block font-semibold leading-snug text-[#3b2f1e]"
          style={{ fontFamily: HEADING_FONT }}
        >
          {stripChapterPrefix(page.chapterTitle)}
        </span>
      </div>
    </div>
  );
}

/** Illustration sheet (left page of an open spread). */
function ImagePage({ page }: { page: BookPage }) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={PARCHMENT_STYLE}>
      {page.image ? (
        <img
          src={page.image}
          alt=""
          className="absolute inset-4 rounded border-[6px] border-[#f7efdc] bg-[#efe3c8] object-contain shadow-[0_6px_18px_rgba(60,40,10,0.35)]"
        />
      ) : (
        <div className="absolute inset-4 flex flex-col items-center justify-center gap-4">
          <span className="text-5xl text-[#b08d3e]" aria-hidden="true">
            ❦
          </span>
        </div>
      )}

      <ChapterPlaque page={page} />

      {/* Gutter shadow along the spine (right edge of a left page). */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[rgba(90,60,20,0.28)] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

/** Prose sheet (right page of an open spread) with a Cinzel drop cap. */
function TextPage({
  page,
  bodyFont,
  fontSize,
}: {
  page: BookPage;
  bodyFont: string;
  fontSize: number;
}) {
  const text = page.text ?? '';
  const isContinuation = page.continuation === true;
  const chars = Array.from(text);
  // Only the opening page of a passage gets the drop cap; continuation pages
  // open with a quiet "continued" marker instead.
  const dropCap = isContinuation ? '' : chars[0] ?? '';
  const rest = isContinuation ? text : chars.slice(1).join('');

  return (
    <div className="relative h-full w-full overflow-hidden" style={PARCHMENT_STYLE}>
      {isContinuation && (
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-3 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-[#8a6a2f]"
        >
          — continued —
        </div>
      )}
      <div
        className="h-full overflow-y-auto text-[#3b2f1e]"
        style={{
          fontFamily: bodyFont,
          fontSize,
          lineHeight: 1.75,
          textAlign: 'justify',
          hyphens: 'auto',
          whiteSpace: 'pre-wrap',
          padding: '32px 34px',
        }}
      >
        {dropCap ? (
          <span
            aria-hidden="true"
            style={{
              float: 'left',
              fontSize: 52,
              lineHeight: 0.9,
              paddingRight: 8,
              paddingTop: 4,
              fontFamily: HEADING_FONT,
              color: '#7a5a1e',
              fontWeight: 700,
            }}
          >
            {dropCap}
          </span>
        ) : null}
        {rest}
      </div>

      {page.segmentIndex != null ? (
        <span
          className="pointer-events-none absolute bottom-2 right-4 text-[10px] text-[#8a6a2f]"
          aria-hidden="true"
        >
          {page.segmentIndex + 2}
        </span>
      ) : null}
      <span
        className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-sm text-[#b08d3e]"
        aria-hidden="true"
      >
        ❦
      </span>

      {/* Gutter shadow along the spine (left edge of a right page). */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[rgba(90,60,20,0.28)] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

/** Leather back cover. */
function BackCoverPage() {
  return (
    <div className="relative h-full w-full overflow-hidden" style={LEATHER_STYLE}>
      <div
        className="pointer-events-none absolute inset-3 rounded-sm border-[3px] border-[#d4af37]/55"
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4">
        <span className="text-4xl" style={{ color: GOLD }} aria-hidden="true">
          ❦
        </span>
        <span
          className="text-xl text-[#d4af37]"
          style={{ fontFamily: HEADING_FONT, fontVariant: 'small-caps', letterSpacing: '0.35em' }}
        >
          The End
        </span>
      </div>
    </div>
  );
}

/** Blank parchment facing the back cover on the final spread. */
function EmptyParchmentPanel() {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      style={PARCHMENT_STYLE}
    >
      <span className="text-3xl text-[#b08d3e]/50" aria-hidden="true">
        ❦
      </span>
    </div>
  );
}

function PagePanel({
  page,
  side,
  bodyFont,
  fontSize,
}: {
  page: BookPage | null;
  side: 'left' | 'right';
  bodyFont: string;
  fontSize: number;
}) {
  if (!page) {
    return side === 'left' ? <InsideCoverPanel /> : <EmptyParchmentPanel />;
  }
  switch (page.kind) {
    case 'cover':
      return <CoverPage page={page} />;
    case 'image':
      return <ImagePage page={page} />;
    case 'text':
      return <TextPage page={page} bodyFont={bodyFont} fontSize={fontSize} />;
    case 'backcover':
      return <BackCoverPage />;
    default:
      return <EmptyParchmentPanel />;
  }
}

/* ------------------------------------------------------------------ */
/* Spread animation                                                    */
/* ------------------------------------------------------------------ */

/** Crossfade / slide between spreads. `custom` carries the turn direction. */
const spreadVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -48 }),
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * CSS 3D "ancient storybook" flipbook fallback. Builds spreads from the v2
 * sheet sequence: the cover sits alone on the RIGHT of the first spread
 * (inside-cover panel on the left), every following spread pairs
 * [image | text], and a leftover backcover sits alone on the LEFT of the last
 * spread. Turns animate a direction-aware spread crossfade plus a sweeping
 * curl overlay; pointer drag / half-clicks / arrow keys all turn pages, and
 * narration can drive the book via `activeSegmentIndex`.
 */
export function CssFlipbook({
  pages,
  fontFamilyPreference,
  fontSize,
  title,
  activeSegmentIndex,
  isNarrating,
  fill = false,
}: CssFlipbookProps) {
  const [spread, setSpread] = useState(0);
  const [direction, setDirection] = useState(1);
  const [turnCount, setTurnCount] = useState(0);
  const pointerState = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const lastSyncedSegmentRef = useRef<number | null>(null);
  const wasNarratingRef = useRef(false);

  const bodyFont = FONT_STACKS[(fontFamilyPreference ?? '').toLowerCase()] ?? DEFAULT_BODY_FONT;
  const resolvedFontSize = fontSize ?? 17;

  /**
   * Spread 0 = { left: null, right: cover }. Then pairwise sheets from index 1:
   * { left: pages[i], right: pages[i+1] }, with a trailing single sheet alone
   * on the left (the backcover) when the count is even.
   */
  const spreads = useMemo(() => {
    const result: Array<{ left: BookPage | null; right: BookPage | null; label: string }> = [];
    if (!pages || pages.length === 0) return result;
    result.push({ left: null, right: pages[0], label: 'Cover' });
    let i = 1;
    let n = 2;
    while (i < pages.length) {
      if (i + 1 < pages.length) {
        result.push({ left: pages[i], right: pages[i + 1], label: `Spread ${n}` });
        i += 2;
      } else {
        result.push({ left: pages[i], right: null, label: `Spread ${n}` });
        i += 1;
      }
      n += 1;
    }
    return result;
  }, [pages]);

  const totalSpreads = spreads.length;
  const current = Math.min(spread, Math.max(0, totalSpreads - 1));
  const currentSpread = totalSpreads > 0 ? spreads[current] : undefined;

  const goTo = useCallback(
    (target: number) => {
      const clampedCurrent = Math.min(spread, Math.max(0, totalSpreads - 1));
      const next = Math.max(0, Math.min(totalSpreads - 1, target));
      if (totalSpreads === 0 || next === clampedCurrent) return;
      setDirection(next > clampedCurrent ? 1 : -1);
      setSpread(next);
      setTurnCount((count) => count + 1);
      // Rustle the paper — same synthesized page-turn sound as the canvas book.
      playPageTurnSound();
    },
    [spread, totalSpreads]
  );

  const goNext = useCallback(() => goTo(current + 1), [goTo, current]);
  const goPrev = useCallback(() => goTo(current - 1), [goTo, current]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    },
    [goNext, goPrev]
  );

  /* ---------------- Pointer drag / half-click page turns ---------------- */

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    pointerState.current = { x: event.clientX, y: event.clientY, moved: false };
    // Capture the pointer so drags that leave the book still report pointerup.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers throw if the pointer is already released; ignore.
    }
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const state = pointerState.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      state.moved = true;
    }
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const state = pointerState.current;
      pointerState.current = null;
      if (!state) return;

      const dx = event.clientX - state.x;
      if (state.moved) {
        // It was a drag: swipe left → next, swipe right → prev.
        if (dx < -60) goNext();
        else if (dx > 60) goPrev();
        return;
      }

      // Plain click: right half of the book turns forward, left half back.
      const rect = event.currentTarget.getBoundingClientRect();
      const isRightHalf = event.clientX - rect.left > rect.width / 2;
      if (isRightHalf) goNext();
      else goPrev();
    },
    [goNext, goPrev]
  );

  const handlePointerCancel = useCallback(() => {
    pointerState.current = null;
  }, []);

  /* ------------------ Corner "hold & flip" affordance -------------------- */

  const bookAreaRef = useRef<HTMLDivElement | null>(null);
  const [cornerHint, setCornerHint] = useState<{ corner: CornerId; x: number; y: number } | null>(
    null
  );

  /**
   * Shows the curled-corner hint when the pointer approaches the outer bottom
   * corners of the open book — the corners a reader would naturally grab — and
   * clears it everywhere else. The hint itself is pointer-events-none, so the
   * drag / half-click logic above keeps working underneath it.
   */
  const probeCorner = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const area = bookAreaRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const zone = Math.min(Math.max(rect.width * 0.14, 80), 200);
      const nearBottom = event.clientY >= rect.bottom - zone;

      if (nearBottom && event.clientX >= rect.right - zone && current < totalSpreads - 1) {
        setCornerHint({ corner: 'br', x: rect.width, y: rect.height });
      } else if (nearBottom && event.clientX <= rect.left + zone && current > 0) {
        setCornerHint({ corner: 'bl', x: 0, y: rect.height });
      } else {
        setCornerHint((prev) => (prev === null ? prev : null));
      }
    },
    [current, totalSpreads]
  );

  const clearCornerHint = useCallback(() => {
    setCornerHint((prev) => (prev === null ? prev : null));
  }, []);

  /* ------------------ Fill-mode seek bar (by spread) --------------------- */

  const seekTrackRef = useRef<HTMLDivElement | null>(null);
  const seekDraggingRef = useRef(false);

  /** Maps a client X position on the seek track to a spread index via the
   *  same goTo() path used by the arrows / dots. */
  const seekToSpreadRatio = useCallback(
    (clientX: number) => {
      const el = seekTrackRef.current;
      if (!el || totalSpreads === 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
      goTo(Math.round(ratio * (totalSpreads - 1)));
    },
    [goTo, totalSpreads]
  );

  /* ------------------------- Narration sync ----------------------------- */

  useEffect(() => {
    if (typeof activeSegmentIndex !== 'number' || activeSegmentIndex < 0) return;

    // Never yank the reader on mount: App seeds activeSegmentIndex with 0
    // whether or not any audio exists, so the book must stay on the cover
    // until narration actually starts or the segment actually changes.
    const narrating = isNarrating === true;
    const narratingJustStarted = narrating && !wasNarratingRef.current;
    wasNarratingRef.current = narrating;

    const segmentChanged =
      lastSyncedSegmentRef.current !== null &&
      activeSegmentIndex !== lastSyncedSegmentRef.current;

    if (!segmentChanged && !narratingJustStarted) return;

    const targetSpread = spreads.findIndex(
      (s) =>
        (s.left?.kind === 'text' && s.left.segmentIndex === activeSegmentIndex) ||
        (s.right?.kind === 'text' && s.right.segmentIndex === activeSegmentIndex)
    );
    if (targetSpread >= 0) {
      lastSyncedSegmentRef.current = activeSegmentIndex;
      goTo(targetSpread);
    }
  }, [activeSegmentIndex, isNarrating, spreads, goTo]);

  /* ------------------------------ Render -------------------------------- */

  return (
    <section
      className={
        fill
          ? 'relative flex h-full w-full flex-col'
          : 'mx-auto w-full max-w-5xl rounded-2xl border border-[#8a6a2f]/40 bg-[rgba(30,22,12,0.55)] p-4 shadow-2xl backdrop-blur-xl md:p-6'
      }
      aria-label={title ? `${title} flipbook` : 'Story flipbook'}
    >
      {title && !fill ? (
        <h3
          className="mb-3 text-center text-lg font-semibold tracking-wide text-[#e8d9a8]"
          style={{ fontFamily: HEADING_FONT }}
        >
          {title}
        </h3>
      ) : null}

      <div
        tabIndex={0}
        role="region"
        aria-label="Story book. Use the left and right arrow keys to turn pages."
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={(event) => {
          handlePointerMove(event);
          probeCorner(event);
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={clearCornerHint}
        className={
          fill
            ? 'relative flex min-h-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60'
            : 'rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60'
        }
        style={{ touchAction: 'pan-y' }}
      >
        <div
          ref={bookAreaRef}
          className={
            fill
              ? 'relative h-full w-full cursor-pointer select-none overflow-hidden rounded-xl border border-[#8a6a2f]/40 bg-[#1e160c]'
              : 'relative aspect-[3/4] w-full cursor-pointer select-none overflow-hidden rounded-xl border border-[#8a6a2f]/40 bg-[#1e160c] md:aspect-[2/1]'
          }
          style={{ perspective: '2000px', cursor: cornerHint ? 'grab' : undefined }}
        >
          {totalSpreads === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#b08d3e]">
              <span className="text-4xl" aria-hidden="true">
                ❦
              </span>
              <span
                className="text-xs"
                style={{ fontFamily: HEADING_FONT, letterSpacing: '0.3em' }}
              >
                Awaiting your story
              </span>
            </div>
          ) : (
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={spreadVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="absolute inset-0 grid md:grid-cols-2"
              >
                {/* LEFT PAGE — hidden on mobile whenever the spread has a
                    right page, so <md shows exactly one sheet at a time. */}
                <div className={currentSpread?.right ? 'hidden md:block' : 'block'}>
                  <PagePanel
                    page={currentSpread?.left ?? null}
                    side="left"
                    bodyFont={bodyFont}
                    fontSize={resolvedFontSize}
                  />
                </div>
                {/* RIGHT PAGE */}
                <div className={currentSpread?.right ? 'block' : 'hidden md:block'}>
                  <PagePanel
                    page={currentSpread?.right ?? null}
                    side="right"
                    bodyFont={bodyFont}
                    fontSize={resolvedFontSize}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Center spine shadow (two-page layout only). */}
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-14 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/60 to-transparent md:block"
            aria-hidden="true"
          />

          {/* Corner "hold & flip" hint — appears only near a grabbable corner. */}
          {cornerHint ? (
            <CornerAffordance corner={cornerHint.corner} x={cornerHint.x} y={cornerHint.y} />
          ) : null}

          {/* Page-turn curl: a parchment sheet sweeps across the book on every
              turn — from the right for next, from the left for prev. */}
          <AnimatePresence>
            {turnCount > 0 && totalSpreads > 0 ? (
              <motion.div
                key={turnCount}
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-0 z-20 w-1/2 ${
                  direction === 1
                    ? 'right-0 bg-gradient-to-l from-[#f7efdc] via-[#e2d2a8] to-[#c9b586]'
                    : 'left-0 bg-gradient-to-r from-[#f7efdc] via-[#e2d2a8] to-[#c9b586]'
                }`}
                style={{
                  transformOrigin: direction === 1 ? 'left center' : 'right center',
                  willChange: 'transform',
                  boxShadow:
                    direction === 1
                      ? '-16px 0 30px rgba(60,40,10,0.45)'
                      : '16px 0 30px rgba(60,40,10,0.45)',
                }}
                initial={{ rotateY: 0, opacity: 1 }}
                animate={{
                  rotateY: direction === 1 ? -180 : 180,
                  opacity: [1, 1, 0],
                }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
            ) : null}
          </AnimatePresence>

          {/* Fill-mode overlays: floating edge arrows */}
          {fill && totalSpreads > 0 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                disabled={current === 0}
                aria-label="Previous spread"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#d4af37]/40 bg-slate-900/80 text-[#e8d9a8] shadow-lg backdrop-blur transition-colors duration-150 hover:border-[#d4af37]/70 hover:bg-slate-900/95 hover:text-[#f7efdc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={current >= totalSpreads - 1}
                aria-label="Next spread"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#d4af37]/40 bg-slate-900/80 text-[#e8d9a8] shadow-lg backdrop-blur transition-colors duration-150 hover:border-[#d4af37]/70 hover:bg-slate-900/95 hover:text-[#f7efdc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          ) : null}

          {/* Fill-mode overlays: bottom-pinned seek bar + spread label */}
          {fill && totalSpreads > 1 ? (
            <>
              <div
                className="pointer-events-none absolute bottom-4 left-3 z-30 rounded-md border border-[#d4af37]/30 bg-slate-900/70 px-2 py-0.5 text-[11px] font-medium text-[#e8d9a8]"
                aria-live="polite"
              >
                Spread {current + 1} of {totalSpreads}
              </div>
              <div
                className="absolute inset-x-0 bottom-0 z-30 flex items-center px-3 pb-2 pt-4"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
              >
                <div
                  ref={seekTrackRef}
                  aria-label="Seek to spread"
                  title="Seek to spread"
                  className="relative h-1.5 w-full cursor-pointer rounded-full bg-slate-900/80"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      // Ignore browsers that reject pointer capture.
                    }
                    seekDraggingRef.current = true;
                    seekToSpreadRatio(e.clientX);
                  }}
                  onPointerMove={(e) => {
                    e.stopPropagation();
                    if (seekDraggingRef.current) seekToSpreadRatio(e.clientX);
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    seekDraggingRef.current = false;
                  }}
                  onPointerCancel={() => {
                    seekDraggingRef.current = false;
                  }}
                >
                  <div
                    className="h-full rounded-full bg-[#d4af37] transition-[width] duration-150"
                    style={{ width: `${totalSpreads > 1 ? (current / (totalSpreads - 1)) * 100 : 100}%` }}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Controls (card mode only — fill mode uses the floating overlays) */}
      {!fill ? (
      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={current === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#8a6a2f]/50 bg-[#d4af37]/5 px-3 py-1.5 text-sm font-medium text-[#e8d9a8] transition-colors duration-150 hover:bg-[#d4af37]/15 hover:text-[#f7efdc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#d4af37]/5"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </button>
          <span className="min-w-[8rem] text-center text-sm text-[#e8d9a8]/70" aria-live="polite">
            Spread {current + 1} of {Math.max(1, totalSpreads)}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={current >= totalSpreads - 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#8a6a2f]/50 bg-[#d4af37]/5 px-3 py-1.5 text-sm font-medium text-[#e8d9a8] transition-colors duration-150 hover:bg-[#d4af37]/15 hover:text-[#f7efdc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#d4af37]/5"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {totalSpreads > 1 ? (
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Spread selector">
            {spreads.map((s, index) => (
              <button
                key={`${s.label}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === current}
                aria-label={`Go to ${s.label.toLowerCase()}`}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  index === current
                    ? 'w-6 bg-[#d4af37]'
                    : 'w-2 bg-[#e8d9a8]/25 hover:bg-[#e8d9a8]/50'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
      ) : null}
    </section>
  );
}

export default CssFlipbook;






