import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import type { BookPage } from './bookTypes';
import { CornerAffordance, type CornerId } from './CornerAffordance';
import {
  isPageTurnSoundEnabled,
  playPageTurnSound,
  setPageTurnSoundEnabled,
} from '../../utils/pageTurnSound';
// Side-effect import: registers <hic-pageflip> and <hic-pageflip-page> once at
// module scope (the package guards against double registration itself).
import 'hic-pageflip';

/**
 * Minimal typing for the <hic-pageflip> custom element instance.
 * API surface per the package README: flipForward(), flipBackward(),
 * gotoPage(n), reloadTextures(), engine switching, and the `pagechange`
 * event with `detail.currentPage` / `detail.currentSpread`.
 */
export interface HICPageflipElement extends HTMLElement {
  flipForward(): void;
  flipBackward(): void;
  gotoPage(page: number): void;
  reloadTextures(): void;
  switchEngine(mode: string): void;
  engine: string;
  engineMode: string;
  page: number;
  pageWidth: number;
  pageHeight: number;
  pageBackground: string;
}

/** The same element, named for the engine-switching code paths. */
type HICEngineElement = HICPageflipElement;

interface StoryFlipbookProps {
  pages: BookPage[];
  /** Preferred font stack for story text (defaults to Merriweather serif). */
  fontFamilyPreference?: string;
  /** Base font size in px for story text (defaults to 17 — spread pages are small). */
  fontSize?: number;
  className?: string;
  /** Accessible name for the flipbook region. */
  title?: string;
  /** Story segment being narrated; the book flips to its text page when it changes. */
  activeSegmentIndex?: number;
  /** True while narration audio is actually playing (drives page-follow). */
  isNarrating?: boolean;
  /** Full-bleed stage mode: fill the parent box and float the navigation UI over the book. */
  fill?: boolean;
}

// ---------------------------------------------------------------------------
// Engine toggle ("2d" | "3d"). 2D is the DEFAULT — it renders the parchment
// pages crisper and keeps text sharp; the 3D WebGL engine is the fallback and
// stays available in the toggle. Persisted in localStorage (read lazily,
// guarded for private mode / SSR). The key is versioned so the earlier "3d"
// default stored by previous builds does not stick.
// ---------------------------------------------------------------------------

const ENGINE_STORAGE_KEY = 'hic-pageflip-engine-v2';

type FlipEngine = '2d' | '3d';
const DEFAULT_ENGINE: FlipEngine = '2d';

function readStoredEngine(): FlipEngine {
  try {
    const stored = window.localStorage.getItem(ENGINE_STORAGE_KEY);
    if (stored === '2d' || stored === '3d') return stored;
  } catch {
    /* localStorage unavailable — fall through to default */
  }
  return DEFAULT_ENGINE;
}

// ---------------------------------------------------------------------------
// FOUC prevention: hide the custom elements until they are defined, then
// fade the flipbook in. Injected once at module scope.
// ---------------------------------------------------------------------------

const FOUC_STYLE_ID = 'hic-pageflip-fouc-style';
const FOUC_CSS =
  'hic-pageflip:not(:defined),hic-pageflip-page:not(:defined){display:none!important}' +
  'hic-pageflip:defined{transition:opacity .35s ease-out}';

if (typeof document !== 'undefined' && !document.getElementById(FOUC_STYLE_ID)) {
  const styleTag = document.createElement('style');
  styleTag.id = FOUC_STYLE_ID;
  styleTag.textContent = FOUC_CSS;
  document.head.appendChild(styleTag);
}

// ---------------------------------------------------------------------------
// Ancient-storybook theme constants.
// ---------------------------------------------------------------------------

const INK = '#3b2f1e';
const GOLD = '#d4af37';
const GOLD_DIM = '#8a6a2f';
const GOLD_SOFT = '#b08d3e';
const PARCHMENT = '#f3e9d2';
const HEAD_FONT = "'Cinzel', serif";

/** Shared parchment background: vellum tone + grain lines + vignette. */
const PARCHMENT_BACKGROUND: React.CSSProperties = {
  backgroundColor: PARCHMENT,
  backgroundImage:
    'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(120, 90, 40, 0.18) 100%), ' +
    'repeating-linear-gradient(0deg, rgba(160,130,80,0.05) 0px, rgba(160,130,80,0.05) 1px, transparent 1px, transparent 3px)',
  boxShadow: 'inset 0 0 60px rgba(120,80,20,0.25)',
};

const LEATHER_BACKGROUND: React.CSSProperties = {
  background: 'linear-gradient(135deg, #3b2a1a 0%, #5a3d22 45%, #2a1c10 100%)',
};

const FOIL_GRADIENT = 'linear-gradient(180deg, #f7e08b, #d4af37 55%, #9c7a1e)';

/** Sheet root shared by every page. */
const SHEET_ROOT: React.CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
};

// ---------------------------------------------------------------------------
// Font stacks. Headings are always Cinzel; the body font honours the app's
// fontFamilyPreference (Settings.fontFamilyPreference union + raw names).
// ---------------------------------------------------------------------------

const FONT_STACK_MAP: Record<string, string> = {
  serif: "'Merriweather', 'Lora', Georgia, serif",
  sans: "'Outfit', 'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', monospace",
  cinzel: "'Cinzel', Georgia, serif",
  merriweather: "'Merriweather', 'Lora', Georgia, serif",
  lora: "'Lora', 'Merriweather', Georgia, serif",
  outfit: "'Outfit', 'Inter', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  fantasy: "'MedievalSharp', 'Cinzel', Georgia, serif",
  handwriting: "'Caveat', cursive",
};

const DEFAULT_BODY_FONT = "'Merriweather', 'Lora', Georgia, serif";
const DEFAULT_FONT_SIZE = 17;

function resolveBodyFont(preference?: string): string {
  if (!preference) return DEFAULT_BODY_FONT;
  const mapped = FONT_STACK_MAP[preference.toLowerCase()];
  if (mapped) return mapped;
  // Unknown preference: treat it as a font family name with serif fallbacks.
  return `'${preference}', Georgia, serif`;
}

/** Small djb2 hash, used only to invalidate the pageflip when content changes. */
function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

// ---------------------------------------------------------------------------
// Thin typed wrappers around the custom elements so the sheet markup below can
// use ordinary JSX. (Custom element tags are created via React.createElement
// because they are not known JSX intrinsic elements.)
// ---------------------------------------------------------------------------

interface PageflipElementProps extends React.HTMLAttributes<HTMLElement> {
  engine?: string;
  'page-width'?: number;
  'page-height'?: number;
  'page-background'?: string;
}

const Pageflip = React.forwardRef<HICPageflipElement, PageflipElementProps>(
  function Pageflip(props, ref) {
    return React.createElement('hic-pageflip', { ...props, ref });
  }
);

const PageflipPage: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
  React.createElement(
    'hic-pageflip-page',
    { style: { width: '100%', height: '100%' } },
    children
  );

/** Gold double-rule frame used by both leather covers. */
const LeatherFrame: React.FC = () => (
  <>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ inset: 12, border: '3px solid rgba(212,175,55,0.55)' }}
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ inset: 20, border: '1px solid rgba(212,175,55,0.35)' }}
    />
  </>
);

// ---------------------------------------------------------------------------
// Sheet renderers (light DOM so Tailwind classes and inline styles both work).
// ---------------------------------------------------------------------------

const CoverSheet: React.FC<{ page: BookPage }> = ({ page }) => (
  <div className="flex h-full w-full flex-col items-center justify-center px-14 text-center" style={{ ...SHEET_ROOT, ...LEATHER_BACKGROUND }}>
    <LeatherFrame />

    {page.image && (
      <div
        className="absolute overflow-hidden"
        style={{ inset: 24, borderRadius: 2, border: '4px solid #2a1c10', boxShadow: '0 0 24px rgba(212,175,55,0.25)' }}
      >
        <img
          src={page.image}
          alt={page.title ? `Cover art for ${page.title}` : 'Cover art'}
          className="h-full w-full object-cover"
        />
        {/* Dark scrim so the foil title stays readable over the art. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(20,12,4,0) 45%, rgba(20,12,4,0.78) 100%)' }}
        />
      </div>
    )}

    <div className="relative z-10 flex flex-col items-center gap-3">
      <span aria-hidden="true" style={{ color: GOLD, fontSize: 22, lineHeight: 1 }}>
        ❦
      </span>

      {/* Gold-foil title: a shadowed base copy underneath + gradient-clipped copy on top. */}
      <div style={{ position: 'relative', maxWidth: '100%' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: HEAD_FONT,
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1.15,
            color: '#7a5a1e',
            textShadow: '0 2px 4px rgba(0,0,0,0.65)',
          }}
        >
          {page.title ?? 'Untitled Story'}
        </h1>
        <h1
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            margin: 0,
            fontFamily: HEAD_FONT,
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1.15,
            background: FOIL_GRADIENT,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {page.title ?? 'Untitled Story'}
        </h1>
      </div>

      {page.subtitle && (
        <p
          style={{
            margin: 0,
            marginTop: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontSize: 12,
            color: '#e8d9a8',
          }}
        >
          {page.subtitle}
        </p>
      )}
    </div>
  </div>
);

/** The illuminated "CHAPTER n" plaque shared by image pages. */
const ChapterPlaque: React.FC<{ chapterNumber: number; chapterTitle?: string }> = ({
  chapterNumber,
  chapterTitle,
}) => (
  <div
    className="absolute z-10 text-center"
    style={{
      top: '8%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#f7efdc',
      border: `2px solid ${GOLD_DIM}`,
      borderRadius: 6,
      padding: '10px 28px',
      boxShadow: '0 4px 14px rgba(60,40,10,0.35)',
      maxWidth: '80%',
    }}
  >
    <div
      style={{
        textTransform: 'uppercase',
        letterSpacing: '0.35em',
        fontSize: 11,
        color: GOLD_DIM,
      }}
    >
      Chapter {chapterNumber}
    </div>
    {chapterTitle && (
      <div
        style={{
          fontFamily: HEAD_FONT,
          fontSize: 22,
          color: INK,
          lineHeight: 1.25,
          marginTop: 2,
        }}
      >
        {chapterTitle}
      </div>
    )}
  </div>
);

const ImageSheet: React.FC<{ page: BookPage }> = ({ page }) => (
  <div style={{ ...SHEET_ROOT, ...PARCHMENT_BACKGROUND }}>
    {page.image ? (
      <img
        src={page.image}
        alt="Story illustration"
        className="absolute"
        style={{
          inset: 16,
          width: 'calc(100% - 32px)',
          height: 'calc(100% - 32px)',
          // Contain, not cover: the full illustration stays visible (no
          // cropped faces or skies), letterboxed on the parchment like a
          // mounted plate.
          objectFit: 'contain',
          borderRadius: 4,
          border: '6px solid #f7efdc',
          boxShadow: '0 6px 18px rgba(60,40,10,0.35)',
          background: '#efe3c8',
        }}
      />
    ) : (
      <div
        aria-hidden="true"
        className="absolute flex items-center justify-center"
        style={{ inset: 0, color: 'rgba(176,141,62,0.45)', fontSize: 84 }}
      >
        ❦
      </div>
    )}

    {typeof page.chapterNumber === 'number' && (
      <ChapterPlaque chapterNumber={page.chapterNumber} chapterTitle={page.chapterTitle} />
    )}
  </div>
);

const TextSheet: React.FC<{ page: BookPage; bodyFont: string; fontSize: number }> = ({
  page,
  bodyFont,
  fontSize,
}) => {
  const fullText = page.text ?? '';
  const isContinuation = page.continuation === true;
  const chars = Array.from(fullText);
  // Only the opening page of a passage gets the illuminated drop cap;
  // continuation pages open with a quiet "continued" marker instead.
  const dropCap = isContinuation ? '' : chars[0] ?? '';
  const remainder = isContinuation ? fullText : chars.slice(1).join('');

  return (
    <div style={{ ...SHEET_ROOT, ...PARCHMENT_BACKGROUND }}>
      {/* Gutter shadow: this is a right-hand page, so the spine is on the left. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-10"
        style={{ background: 'linear-gradient(90deg, rgba(90,60,20,0.28), transparent)' }}
      />

      {isContinuation && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            color: GOLD_DIM,
            fontSize: 10,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
          }}
        >
          — continued —
        </div>
      )}

      <p
        style={{
          margin: 0,
          padding: '34px 38px',
          fontFamily: bodyFont,
          fontSize: `${fontSize}px`,
          lineHeight: 1.75,
          color: INK,
          textAlign: 'justify',
          hyphens: 'auto',
          whiteSpace: 'pre-wrap',
        }}
      >
        {dropCap && (
          <span
            aria-hidden="true"
            style={{
              float: 'left',
              fontSize: 54,
              lineHeight: '0.9',
              paddingRight: 8,
              paddingTop: 4,
              fontFamily: HEAD_FONT,
              fontWeight: 700,
              color: '#7a5a1e',
            }}
          >
            {dropCap}
          </span>
        )}
        {remainder}
      </p>

      <span
        aria-hidden="true"
        className="absolute"
        style={{ bottom: 10, left: '50%', transform: 'translateX(-50%)', color: GOLD_SOFT, fontSize: 12 }}
      >
        ❦
      </span>
      {typeof page.segmentIndex === 'number' && (
        <span
          className="absolute tabular-nums"
          style={{ bottom: 12, right: 18, fontSize: 10, color: GOLD_DIM }}
        >
          {page.segmentIndex + 2}
        </span>
      )}
    </div>
  );
};

const BackcoverSheet: React.FC = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-4" style={{ ...SHEET_ROOT, ...LEATHER_BACKGROUND }}>
    <LeatherFrame />
    <span aria-hidden="true" style={{ color: GOLD, fontSize: 34, lineHeight: 1 }}>
      ❦
    </span>
    <span
      style={{
        fontFamily: HEAD_FONT,
        textTransform: 'uppercase',
        letterSpacing: '0.3em',
        fontSize: 18,
        color: GOLD,
      }}
    >
      The End
    </span>
  </div>
);

// ---------------------------------------------------------------------------
// Corner grab affordance
//
// <hic-pageflip> already bends the page corner (a 35px "peek") when the pointer
// enters the corner zone, and a mousedown inside that zone starts a real
// drag-to-turn. The zone is min(pageWidth * 0.35, 180) in BOOK units, which is
// roughly 10% of the rendered element width on screen. This module mirrors that
// geometry, widens it slightly so the corner offers a comfortable grab target,
// and drives the same public peek API so the bend happens exactly when the
// affordance appears — then paints the shared curled-corner arrow so readers
// know they can hold and flip the page like a real book.
// ---------------------------------------------------------------------------

/** Corner hotspot in screen pixels: mirrors the core zone (≈10% of the element
 *  width) and adds a forgiving margin so the grab target is easy to hit. */
function cornerZoneForWidth(width: number): number {
  return Math.min(Math.max(width * 0.1, 120), 220) + 60;
}

/**
 * Returns the corner the pointer is hovering, or null. A corner is only
 * offered when a page actually exists on that side, matching the core's own
 * gating (`rightPage <= totalPages` / `leftPage > 0`).
 */
function detectHoverCorner(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  canTurnForward: boolean,
  canTurnBackward: boolean
): CornerId | null {
  const zone = cornerZoneForWidth(rect.width);

  const nearRight = clientX >= rect.right - zone && clientX <= rect.right + zone;
  const nearLeft = clientX <= rect.left + zone && clientX >= rect.left - zone;
  const nearBottom = clientY >= rect.bottom - zone && clientY <= rect.bottom + zone;
  const nearTop = clientY <= rect.top + zone && clientY >= rect.top - zone;

  if (canTurnForward && nearRight && nearBottom) return 'br';
  if (canTurnForward && nearRight && nearTop) return 'tr';
  if (canTurnBackward && nearLeft && nearBottom) return 'bl';
  if (canTurnBackward && nearLeft && nearTop) return 'tl';
  return null;
}

// ---------------------------------------------------------------------------
// StoryFlipbook (v2 — "ancient storybook" edition)
// ---------------------------------------------------------------------------

const StoryFlipbook: React.FC<StoryFlipbookProps> = ({
  pages,
  fontFamilyPreference,
  fontSize,
  className = '',
  title,
  activeSegmentIndex,
  isNarrating,
  fill = false,
}) => {
  const flipbookRef = useRef<HICPageflipElement | null>(null);

  // Engine toggle: 2d by default (sharpest parchment text), 3d as fallback.
  const [engine, setEngine] = useState<FlipEngine>(readStoredEngine);

  // Track the active page + spread so labels and button states stay accurate.
  const [currentPage, setCurrentPage] = useState(0);
  const [currentSpread, setCurrentSpread] = useState<number[]>([0]);

  // Ref mirror of currentPage so the narration-sync effect never races the
  // async `pagechange` events with a stale closure.
  const currentPageRef = useRef(0);

  const bodyFont = useMemo(() => resolveBodyFont(fontFamilyPreference), [fontFamilyPreference]);
  const resolvedFontSize = fontSize ?? DEFAULT_FONT_SIZE;

  // Stable identity for the page set: length + hash of the first page's text.
  const pagesKey = useMemo(() => {
    const first = pages[0];
    const fingerprint = first ? first.text ?? first.title ?? '' : '';
    return `${pages.length}-${hashText(fingerprint)}`;
  }, [pages]);

  const handleEngineChange = useCallback((mode: FlipEngine) => {
    setEngine(mode);
    try {
      window.localStorage.setItem(ENGINE_STORAGE_KEY, mode);
    } catch {
      /* localStorage unavailable — in-memory state is enough */
    }
    // Guarded apply: if the requested engine cannot initialise in this browser
    // we immediately fall back to the other one (2d is the default, 3d the
    // fallback) so the book never renders blank.
    const el = flipbookRef.current as HICEngineElement | null;
    try {
      if (el && typeof el.switchEngine === 'function') el.switchEngine(mode);
    } catch {
      setEngine(mode === '2d' ? '3d' : '2d');
    }
  }, []);

  // 2D is the default. If the element ends up on a different engine than the
  // one requested (e.g. the 2D pipeline is unavailable), mirror reality so the
  // toggle stays honest and the 3D WebGL engine acts as the fallback.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const el = flipbookRef.current as HICEngineElement | null;
      const actual = el?.engineMode;
      if (engine === '2d' && actual === '3d') {
        setEngine('3d');
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [engine, pagesKey]);

  // The core sets `canvas.style.cursor` inline inside its shadow root, which
  // would beat any inherited cursor. Let the canvas inherit ours instead so a
  // corner hover can show a grab hand.
  useEffect(() => {
    const root = (flipbookRef.current as any)?.shadowRoot as ShadowRoot | null | undefined;
    if (!root || typeof root.querySelector !== 'function') return;
    const STYLE_ID = 'hic-pageflip-cursor-override';
    if (root.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = 'canvas{cursor:inherit!important}';
    root.appendChild(style);
  }, [pagesKey, engine]);

  // -------------------------------------------------------------------------
  // Corner grab affordance — bend the corner and show "Hold & flip"
  // -------------------------------------------------------------------------

  const [cornerHint, setCornerHint] = useState<{ corner: CornerId; x: number; y: number } | null>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);

  /** The core Pageflip controller (exposed publicly as `el.pageflip`); used to
   *  drive the same peek API from our slightly wider hotspot. */
  const getPageflip = useCallback((): any => {
    return (flipbookRef.current as any)?.pageflip ?? null;
  }, []);

  /**
   * Re-assert the corner bend. Cheap no-op while a peek (or a drag) is already
   * in flight, so it is safe to call on every pointermove.
   */
  const ensureCornerPeek = useCallback(
    (corner: CornerId) => {
      const pf = getPageflip();
      if (!pf || pf.isDragging) return;
      if (pf.activeFlip?.isPeek) return;
      try {
        pf.startCornerPeek?.(corner);
      } catch {
        /* the peek is decorative — never let it break navigation */
      }
    },
    [getPageflip]
  );

  /** Release the bend once the pointer drifts away from the corner. */
  const releaseCornerPeek = useCallback(() => {
    const pf = getPageflip();
    if (!pf || pf.isDragging) return;
    if (pf.activeFlip?.isPeek) {
      try {
        pf.endCornerPeek?.();
      } catch {
        /* ignore */
      }
    }
  }, [getPageflip]);

  const handleStagePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Ignore moves over the floating controls so they never flash the hint.
      if ((event.target as HTMLElement | null)?.closest?.('button, input')) return;

      const el = flipbookRef.current;
      const stage = stageRef.current;
      if (!el || !stage) return;

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const corner = detectHoverCorner(
        event.clientX,
        event.clientY,
        rect,
        currentPageRef.current < pages.length - 1,
        currentPageRef.current > 0
      );

      if (!corner) {
        setCornerHint((prev) => (prev === null ? prev : null));
        releaseCornerPeek();
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const cornerX =
        (corner === 'br' || corner === 'tr' ? rect.right : rect.left) - stageRect.left;
      const cornerY =
        (corner === 'br' || corner === 'bl' ? rect.bottom : rect.top) - stageRect.top;

      setCornerHint((prev) =>
        prev &&
        prev.corner === corner &&
        Math.abs(prev.x - cornerX) < 1 &&
        Math.abs(prev.y - cornerY) < 1
          ? prev
          : { corner, x: cornerX, y: cornerY }
      );

      ensureCornerPeek(corner);
    },
    [ensureCornerPeek, pages.length, releaseCornerPeek]
  );

  const handleStagePointerDown = useCallback(() => {
    if (cornerHint) setIsGrabbing(true);
  }, [cornerHint]);

  const handleStagePointerUp = useCallback(() => {
    setIsGrabbing(false);
  }, []);

  const handleStagePointerLeave = useCallback(() => {
    setCornerHint(null);
    setIsGrabbing(false);
    releaseCornerPeek();
  }, [releaseCornerPeek]);

  /** grab over a corner, grabbing while holding the page, else default. */
  const stageCursor = isGrabbing ? 'grabbing' : cornerHint ? 'grab' : 'default';

  // Page-turn rustle: on by default, persisted, toggled from the book's own UI.
  const [soundOn, setSoundOn] = useState<boolean>(isPageTurnSoundEnabled);

  const handleSoundToggle = useCallback(() => {
    setSoundOn((previous) => {
      const next = !previous;
      setPageTurnSoundEnabled(next);
      // Play once when re-enabling so the reader hears what they turned on.
      if (next) playPageTurnSound();
      return next;
    });
  }, []);

  const soundToggleButton = (
    <button
      type="button"
      onClick={handleSoundToggle}
      aria-pressed={soundOn}
      aria-label={soundOn ? 'Mute the page-turn sound' : 'Enable the page-turn sound'}
      title={soundOn ? 'Page-turn sound: on' : 'Page-turn sound: off'}
      className="flex h-6 w-6 items-center justify-center rounded-full border transition-colors"
      style={{
        borderColor: 'rgba(138,106,47,0.5)',
        background: 'rgba(20,14,8,0.6)',
        color: soundOn ? '#e8d9a8' : 'rgba(232,217,168,0.45)',
      }}
    >
      {soundOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
    </button>
  );

  // Listen to `pagechange` (detail: { currentPage, currentSpread }) and keep
  // BOTH the state and the ref mirror in sync.
  useEffect(() => {
    const el = flipbookRef.current;
    if (!el) return;
    const onPageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ currentPage?: number; currentSpread?: number[] }>).detail;
      if (detail && typeof detail.currentPage === 'number') {
        // A real sheet turned (user flip, arrow, seek or narration sync) —
        // rustle the paper.
        if (detail.currentPage !== currentPageRef.current) {
          playPageTurnSound();
        }
        currentPageRef.current = detail.currentPage;
        setCurrentPage(detail.currentPage);
        if (Array.isArray(detail.currentSpread) && detail.currentSpread.length > 0) {
          setCurrentSpread(detail.currentSpread);
        }
      }
    };
    el.addEventListener('pagechange', onPageChange);
    return () => el.removeEventListener('pagechange', onPageChange);
  }, [pagesKey]);

  // A new set of pages always starts from the cover.
  useEffect(() => {
    currentPageRef.current = 0;
    setCurrentPage(0);
    setCurrentSpread([0]);
  }, [pagesKey]);

  // Narration sync: when the narrated segment changes — or narration starts —
  // flip to that passage's first text page. Deliberately inert on mount: App
  // seeds activeSegmentIndex with 0 whether or not any audio exists, and the
  // book must never yank the reader past the cover before anything plays.
  const lastSyncedSegmentRef = useRef<number | null>(null);
  const wasNarratingRef = useRef(false);
  useEffect(() => {
    if (typeof activeSegmentIndex !== 'number' || activeSegmentIndex < 0) return;

    const narrating = isNarrating === true;
    const narratingJustStarted = narrating && !wasNarratingRef.current;
    wasNarratingRef.current = narrating;

    const segmentChanged =
      lastSyncedSegmentRef.current !== null &&
      activeSegmentIndex !== lastSyncedSegmentRef.current;
    lastSyncedSegmentRef.current = activeSegmentIndex;

    if (!segmentChanged && !narratingJustStarted) return;

    const found = pages.findIndex(
      (p) => p.kind === 'text' && p.segmentIndex === activeSegmentIndex
    );
    if (found >= 0 && found !== currentPageRef.current) {
      flipbookRef.current?.gotoPage(found);
    }
    // pagesKey keeps this effect correct across story swaps without adding
    // `pages` (a new array identity) to the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegmentIndex, isNarrating, pagesKey]);

  const flipBackward = useCallback(() => {
    flipbookRef.current?.flipBackward();
  }, []);

  const flipForward = useCallback(() => {
    flipbookRef.current?.flipForward();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        flipBackward();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        flipForward();
      }
    },
    [flipBackward, flipForward]
  );

  // Demo-style progress bar: click/pointer-down anywhere on the track seeks.
  const handleProgressPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pages.length <= 1) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const target = Math.round(ratio * (pages.length - 1));
      flipbookRef.current?.gotoPage(target);
    },
    [pages.length]
  );

  // Full-bleed stage: measured with a ResizeObserver so the page height can
  // track the available box and the spread fills the stage with zero
  // letterboxing (like the official demo).
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!fill) return;
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      setStageSize({
        width: Math.max(Math.round(entry.contentRect.width), 1),
        height: Math.max(Math.round(entry.contentRect.height), 1),
      });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [fill]);

  // In fill mode the two-page spread is 1800 CSS-px wide (2 x 900); pick the
  // page height so the spread aspect ratio matches the stage exactly.
  const filledPageHeight = useMemo(() => {
    if (!fill || stageSize.width <= 0 || stageSize.height <= 0) return 675;
    const ratio = (1800 * stageSize.height) / Math.max(stageSize.width, 1);
    return Math.round(Math.min(Math.max(ratio, 420), 1600));
  }, [fill, stageSize.width, stageSize.height]);

  // Compact page-jump input (fill mode): commit on change, clamped.
  const handleJumpChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.valueAsNumber;
      if (Number.isNaN(next)) return;
      const target = Math.min(Math.max(next - 1, 0), pages.length - 1);
      flipbookRef.current?.gotoPage(target);
    },
    [pages.length]
  );

  if (pages.length === 0) {
    return null;
  }

  const clampedPage = Math.min(Math.max(currentPage, 0), pages.length - 1);
  const lastPageIndex = pages.length - 1;
  const progressPercent =
    lastPageIndex > 0 ? (clampedPage / lastPageIndex) * 100 : 100;

  // Demo-style page label driven by the current spread.
  const spreadPages = currentSpread.filter((n) => typeof n === 'number');
  const pageLabel =
    spreadPages.length === 2
      ? `Pages ${spreadPages[0] + 1}\u2013${spreadPages[1] + 1} of ${pages.length}`
      : `Page ${clampedPage + 1} of ${pages.length}`;

  const renderSheet = (page: BookPage, index: number): React.ReactElement => (
    <PageflipPage key={`page-${index}`}>
      {page.kind === 'cover' ? (
        <CoverSheet page={page} />
      ) : page.kind === 'image' ? (
        <ImageSheet page={page} />
      ) : page.kind === 'text' ? (
        <TextSheet page={page} bodyFont={bodyFont} fontSize={resolvedFontSize} />
      ) : (
        <BackcoverSheet />
      )}
    </PageflipPage>
  );

  if (fill) {
    return (
      <div
        ref={stageRef}
        className={`relative flex h-full w-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${className}`}
        style={{ cursor: stageCursor }}
        tabIndex={0}
        role="region"
        aria-label={title ?? 'Story flipbook'}
        onKeyDown={handleKeyDown}
        onPointerMove={handleStagePointerMove}
        onPointerDown={handleStagePointerDown}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        onPointerLeave={handleStagePointerLeave}
      >
        {/* The flipbook element itself. Sheet 0 (cover) sits alone on the right
            of the first spread; every following pair forms [image | text].
            Sized by the ResizeObserver-driven page height so the spread fills
            the stage exactly. */}
        <Pageflip
          key={pagesKey}
          ref={flipbookRef}
          engine={engine}
          page-width={900}
          page-height={filledPageHeight}
          page-background={PARCHMENT}
          style={{
            width: '100%',
            flex: '1 1 auto',
            minHeight: 0,
            display: 'block',
            margin: '0 auto',
          }}
        >
          {pages.map(renderSheet)}
        </Pageflip>

        {/* Corner "hold & flip" hint — only rendered while the pointer is near
            a page corner, where the core bends the sheet a little. */}
        {cornerHint ? (
          <CornerAffordance corner={cornerHint.corner} x={cornerHint.x} y={cornerHint.y} />
        ) : null}

        {/* Floating edge arrows (demo-style). */}
        <button
          type="button"
          onClick={flipBackward}
          disabled={clampedPage <= 0}
          aria-label="Previous page"
          className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#d4af37]/40 bg-slate-900/80 text-[#e8d9a8] shadow-xl backdrop-blur transition-transform hover:scale-105 hover:bg-slate-900 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={flipForward}
          disabled={clampedPage >= lastPageIndex}
          aria-label="Next page"
          className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#d4af37]/40 bg-slate-900/80 text-[#e8d9a8] shadow-xl backdrop-blur transition-transform hover:scale-105 hover:bg-slate-900 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>

        {/* Page-turn rustle toggle, tucked under the engine pills. */}
        <div className="absolute right-3 top-12 z-20">{soundToggleButton}</div>

        {/* Engine toggle — compact pills pinned to the top-right of the stage. */}
        <div
          className="absolute right-3 top-3 z-20 flex overflow-hidden rounded-full border"
          style={{ borderColor: 'rgba(138,106,47,0.5)', background: 'rgba(20,14,8,0.6)' }}
          role="group"
          aria-label="Rendering engine"
        >
          {(['2d', '3d'] as FlipEngine[]).map((mode) => {
            const isActive = engine === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleEngineChange(mode)}
                aria-pressed={isActive}
                className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest transition-colors"
                style={
                  isActive
                    ? { background: FOIL_GRADIENT, color: '#1e160c' }
                    : { color: '#e8d9a8', background: 'transparent' }
                }
              >
                {mode}
              </button>
            );
          })}
        </div>

        {/* Progress bar pinned to the bottom edge of the stage (seekable). */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 h-1.5 cursor-pointer bg-black/40"
          role="slider"
          aria-label="Book progress"
          aria-valuemin={1}
          aria-valuemax={pages.length}
          aria-valuenow={clampedPage + 1}
          onPointerDown={handleProgressPointerDown}
        >
          <div
            className="h-full transition-[width] duration-300"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #d4af37, #9c7a1e)',
            }}
          />
        </div>

        {/* Spread label + compact page jump, above-left of the progress bar. */}
        <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2">
          <span
            className="select-none text-xs font-semibold tabular-nums text-[#e8d9a8]/90"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
            aria-live="polite"
          >
            {pageLabel}
          </span>
          <input
            type="number"
            min={1}
            max={pages.length}
            value={clampedPage + 1}
            onChange={handleJumpChange}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label="Go to page"
            className="w-14 rounded border border-[#d4af37]/40 bg-slate-900/70 px-1 text-center text-xs tabular-nums text-[#e8d9a8] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]/60"
          />
          <span
            className="select-none text-xs tabular-nums text-[#e8d9a8]/90"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
          >
            / {pages.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      className={`relative flex w-full flex-col gap-3 rounded-2xl border p-4 backdrop-blur-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${className}`}
      style={{
        borderColor: 'rgba(138,106,47,0.4)',
        background: 'rgba(30,22,12,0.55)',
        cursor: stageCursor,
      }}
      tabIndex={0}
      role="region"
      aria-label={title ?? 'Story flipbook'}
      onKeyDown={handleKeyDown}
      onPointerMove={handleStagePointerMove}
      onPointerDown={handleStagePointerDown}
      onPointerUp={handleStagePointerUp}
      onPointerCancel={handleStagePointerUp}
      onPointerLeave={handleStagePointerLeave}
    >
      {/* Header row: engine toggle + live page label. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" role="group" aria-label="Rendering engine">
          <span
            className="select-none text-[10px] uppercase"
            style={{ letterSpacing: '0.25em', color: GOLD_SOFT }}
          >
            Engine
          </span>
          <div
            className="flex overflow-hidden rounded-full border"
            style={{ borderColor: 'rgba(138,106,47,0.5)', background: 'rgba(20,14,8,0.6)' }}
          >
            {(['2d', '3d'] as FlipEngine[]).map((mode) => {
              const isActive = engine === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleEngineChange(mode)}
                  aria-pressed={isActive}
                  className="px-3 py-1 text-xs font-semibold uppercase tracking-widest transition-colors"
                  style={
                    isActive
                      ? { background: FOIL_GRADIENT, color: '#1e160c' }
                      : { color: '#e8d9a8', background: 'transparent' }
                  }
                >
                  {mode}
                </button>
              );
            })}
          </div>
          {soundToggleButton}
        </div>

        <div className="flex items-baseline gap-2" aria-live="polite">
          <span className="select-none text-sm tabular-nums" style={{ color: '#e8d9a8' }}>
            {pageLabel}
          </span>
          <span className="select-none text-xs tabular-nums" style={{ color: GOLD_SOFT }}>
            [{clampedPage + 1}/{pages.length}]
          </span>
        </div>
      </div>

      {/* The flipbook element itself. Sheet 0 (cover) sits alone on the right
          of the first spread; every following pair forms [image | text]. */}
      <Pageflip
        key={pagesKey}
        ref={flipbookRef}
        engine={engine}
        page-width={900}
        page-height={675}
        page-background={PARCHMENT}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '1100px',
          aspectRatio: '8 / 3',
          margin: '0 auto',
        }}
      >
        {pages.map(renderSheet)}
      </Pageflip>

      {/* Corner "hold & flip" hint — only rendered while the pointer is near a
          page corner, where the core bends the sheet a little. */}
      {cornerHint ? (
        <CornerAffordance corner={cornerHint.corner} x={cornerHint.x} y={cornerHint.y} />
      ) : null}

      {/* Prev / next navigation. */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={flipBackward}
          disabled={clampedPage <= 0}
          aria-label="Previous page"
          className="rounded-xl border p-2 transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: 'rgba(138,106,47,0.5)',
            background: 'rgba(212,175,55,0.08)',
            color: '#e8d9a8',
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={flipForward}
          disabled={clampedPage >= lastPageIndex}
          aria-label="Next page"
          className="rounded-xl border p-2 transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: 'rgba(138,106,47,0.5)',
            background: 'rgba(212,175,55,0.08)',
            color: '#e8d9a8',
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Demo-style progress bar (seekable). */}
      <div
        className="mx-auto w-full max-w-[1100px] cursor-pointer rounded-full"
        style={{ height: 6, background: 'rgba(212,175,55,0.25)' }}
        role="slider"
        aria-label="Book progress"
        aria-valuemin={1}
        aria-valuemax={pages.length}
        aria-valuenow={clampedPage + 1}
        onPointerDown={handleProgressPointerDown}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #d4af37, #9c7a1e)',
          }}
        />
      </div>

      <p className="select-none text-center text-xs" style={{ color: GOLD_SOFT }}>
        Hover a page corner to bend it, then hold and drag to turn — powered by HTML-in-Canvas (Chrome 155+)
      </p>
    </div>
  );
};

export default StoryFlipbook;
export { StoryFlipbook };