/**
 * Feature detection for Chrome's experimental HTML-in-Canvas APIs, which the
 * <hic-pageflip> element (npm: hic-pageflip) depends on.
 *
 * Detection strategy (deliberately conservative):
 *  1. User-agent gate: must look like a Chromium browser. Firefox and
 *     Safari-only browsers are rejected. Edge/OPR pass only because they are
 *     Chromium-based and report a "Chrome/" token in their UA; iOS browsers
 *     (CriOS/FxiOS) run on WebKit and never report "Chrome/".
 *  2. Feature test: the experimental API surface — `layoutSubtree` on the
 *     canvas element and/or `drawElementImage` on the 2D rendering context.
 *     All checks are guarded by `typeof`/`in` so the code degrades gracefully.
 *  3. Any thrown error is treated as "not supported".
 *
 * False negatives are acceptable (the caller falls back to the CSS 3D
 * flipbook); false positives are NOT (the canvas flipbook would render
 * broken), so this never speculates beyond the feature tests above.
 */

let cachedResult: boolean | null = null;

function detectHtmlInCanvasSupport(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    // (a) UA gate: Chromium browsers (Chrome, Edge, OPR, etc.) all report
    // "Chrome/". Firefox and Safari-only UAs never do; iOS WebKit browsers
    // report "CriOS"/"FxiOS" instead. Reject any lingering non-Chromium
    // markers just to be safe.
    const ua = typeof navigator.userAgent === 'string' ? navigator.userAgent : '';
    if (!ua.includes('Chrome/')) {
      return false;
    }
    if (ua.includes('Firefox/') || ua.includes('FxiOS/')) {
      return false;
    }

    // (b) Feature test: the experimental HTML-in-Canvas API surface.
    const canvas = document.createElement('canvas');
    if ('layoutSubtree' in canvas) {
      return true;
    }
    if (
      typeof CanvasRenderingContext2D !== 'undefined' &&
      'drawElementImage' in CanvasRenderingContext2D.prototype
    ) {
      return true;
    }
    const ctx = canvas.getContext('2d');
    if (ctx && 'drawElementImage' in ctx) {
      return true;
    }

    return false;
  } catch {
    // (c) Any unexpected error means we cannot prove support.
    return false;
  }
}

/**
 * Returns whether the current browser supports the experimental HTML-in-Canvas
 * APIs required by <hic-pageflip>. The result is detected once and cached for
 * the lifetime of the module (support cannot change without a page reload).
 */
export function isHtmlInCanvasSupported(): boolean {
  if (cachedResult === null) {
    cachedResult = detectHtmlInCanvasSupport();
  }
  return cachedResult;
}
